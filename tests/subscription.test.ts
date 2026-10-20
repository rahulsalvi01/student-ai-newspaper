import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { subscribersRepo } from '../src/lib/db/repository';
import { POST as subscribePOST, GET as subscribeGET } from '../src/app/api/subscribe/route';
import {
  GET as recipientsGET,
  POST as recipientsPOST,
  PUT as recipientsPUT,
} from '../src/app/api/subscribers/recipients/route';
import { POST as preferencesPOST } from '../src/app/api/preferences/route';
import {
  checkSubscriptionRateLimit,
  resetSubscriptionRateLimits,
} from '../src/lib/security/subscription-rate-limiter';
import { setTestGenerationSecret } from '../src/lib/security/generation-auth';
import { NextRequest } from 'next/server';

describe('Subscription, Unsubscribe & Protected Recipients Pipeline', () => {
  const TEST_SECRET = 'test-generation-secret-1234567890';

  beforeEach(() => {
    subscribersRepo.clearInMemory();
    resetSubscriptionRateLimits();
    setTestGenerationSecret(TEST_SECRET);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    setTestGenerationSecret(null);
  });

  describe('1. Subscribers Repository (Persistence, Normalization & Deduplication)', () => {
    it('normalizes email by trimming whitespace and lowercasing', async () => {
      const sub = await subscribersRepo.addSubscriber('  STUDENT@University.EDU  ');
      expect(sub.email).toBe('STUDENT@University.EDU');
      expect(sub.normalized_email).toBe('student@university.edu');
      expect(sub.status).toBe('active');

      const active = await subscribersRepo.getActiveSubscribers();
      expect(active).toEqual(['student@university.edu']);
    });

    it('collapses Mixed.Case@Example.com and mixed.case@example.com to one unique recipient', async () => {
      await subscribersRepo.addSubscriber('Mixed.Case@Example.com');
      await subscribersRepo.addSubscriber('mixed.case@example.com');
      await subscribersRepo.addSubscriber('  MIXED.CASE@EXAMPLE.COM  ');

      const active = await subscribersRepo.getActiveSubscribers();
      expect(active).toHaveLength(1);
      expect(active[0]).toBe('mixed.case@example.com');
    });

    it('allows unsubscribing an active subscriber so status becomes unsubscribed', async () => {
      await subscribersRepo.addSubscriber('reader@school.edu');
      const activeBefore = await subscribersRepo.getActiveSubscribers();
      expect(activeBefore).toContain('reader@school.edu');

      const unsubResult = await subscribersRepo.unsubscribe('reader@school.edu');
      expect(unsubResult).toBe(true);

      const activeAfter = await subscribersRepo.getActiveSubscribers();
      expect(activeAfter).not.toContain('reader@school.edu');
    });
  });

  describe('2. Recipient Preservation & Isolation from External Secret Sync', () => {
    it('preserves pre-existing manual recipients when a new user subscribes via website', async () => {
      // Step A: Pre-existing subscribers in database
      await subscribersRepo.addSubscriber('faculty-head@school.edu', 'manual');
      await subscribersRepo.addSubscriber('editor@school.edu', 'manual');

      const initialActive = await subscribersRepo.getActiveSubscribers();
      expect(initialActive).toHaveLength(2);

      // Step B: New website signup via POST /api/subscribe
      const req = new NextRequest('http://localhost:3000/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.50',
        },
        body: JSON.stringify({ email: 'freshman@school.edu' }),
      });

      const res = await subscribePOST(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      // Step C: Verify all prior subscribers remain intact
      const updatedActive = await subscribersRepo.getActiveSubscribers();
      expect(updatedActive).toHaveLength(3);
      expect(updatedActive).toContain('faculty-head@school.edu');
      expect(updatedActive).toContain('editor@school.edu');
      expect(updatedActive).toContain('freshman@school.edu');
    });

    it('asserts POST /api/subscribe performs NO outbound GitHub API calls', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const req = new NextRequest('http://localhost:3000/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '10.0.0.99',
        },
        body: JSON.stringify({ email: 'autonomous@school.edu' }),
      });

      const res = await subscribePOST(req);
      expect(res.status).toBe(200);

      // Invariant: Subscribing never invokes any external GitHub secret API
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('3. Protected Recipients Endpoint (GET /api/subscribers/recipients)', () => {
    it('rejects unauthenticated requests with HTTP 401 Unauthorized', async () => {
      const req = new NextRequest('http://localhost:3000/api/subscribers/recipients', {
        method: 'GET',
      });

      const res = await recipientsGET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('UNAUTHORIZED');
      expect(res.headers.get('cache-control')).toBe('no-store');
    });

    it('rejects requests with invalid bearer token with HTTP 401 Unauthorized', async () => {
      const req = new NextRequest('http://localhost:3000/api/subscribers/recipients', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer wrong-secret',
        },
      });

      const res = await recipientsGET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('UNAUTHORIZED');
      expect(res.headers.get('cache-control')).toBe('no-store');
    });

    it('rejects non-GET methods with HTTP 405 Method Not Allowed', async () => {
      const postRes = await recipientsPOST();
      expect(postRes.status).toBe(405);
      expect(postRes.headers.get('allow')).toBe('GET');

      const putRes = await recipientsPUT();
      expect(putRes.status).toBe(405);
      expect(putRes.headers.get('allow')).toBe('GET');
    });

    it('returns 200 with { recipients, count } and strictly excludes unsubscribed rows', async () => {
      // 1. Add active subscribers
      await subscribersRepo.addSubscriber('Active.One@School.edu');
      await subscribersRepo.addSubscriber('active.two@school.edu');
      await subscribersRepo.addSubscriber('active.one@school.edu'); // duplicate

      // 2. Add an active subscriber then unsubscribe them
      await subscribersRepo.addSubscriber('Unsubscribed.User@School.edu');
      await subscribersRepo.unsubscribe('unsubscribed.user@school.edu');

      const req = new NextRequest('http://localhost:3000/api/subscribers/recipients', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${TEST_SECRET}`,
        },
      });

      const res = await recipientsGET(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('cache-control')).toBe('no-store');

      const json = await res.json();
      expect(json).toHaveProperty('recipients');
      expect(json).toHaveProperty('count');
      expect(json.count).toBe(2);
      expect(json.recipients).toEqual(['active.one@school.edu', 'active.two@school.edu']);

      // Assert unsubscribed row is strictly excluded
      expect(json.recipients).not.toContain('unsubscribed.user@school.edu');
    });

    it('returns empty array and count 0 when no active subscribers exist', async () => {
      const req = new NextRequest('http://localhost:3000/api/subscribers/recipients', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${TEST_SECRET}`,
        },
      });

      const res = await recipientsGET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.recipients).toEqual([]);
      expect(json.count).toBe(0);
    });
  });

  describe('4. Unsubscribe Route Integration (/api/preferences)', () => {
    it('sets status to unsubscribed when unsubscribe action is sent to preferences', async () => {
      await subscribersRepo.addSubscriber('leaving@school.edu');
      const activeInitial = await subscribersRepo.getActiveSubscribers();
      expect(activeInitial).toContain('leaving@school.edu');

      const req = new Request('http://localhost:3000/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'leaving@school.edu', action: 'unsubscribe' }),
      });

      const res = await preferencesPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.unsubscribed).toBe(true);

      const activeAfter = await subscribersRepo.getActiveSubscribers();
      expect(activeAfter).not.toContain('leaving@school.edu');
    });
  });

  describe('5. Rate Limiting Protection', () => {
    it('allows up to 5 requests per IP and blocks subsequent requests', () => {
      const testIp = '192.168.1.100';

      for (let i = 0; i < 5; i++) {
        expect(checkSubscriptionRateLimit(testIp)).toBe(true);
      }

      // 6th request must be rejected
      expect(checkSubscriptionRateLimit(testIp)).toBe(false);
    });
  });

  describe('6. Subscribe API Endpoint Validation (POST /api/subscribe)', () => {
    it('accepts valid email and persists subscriber', async () => {
      const req = new NextRequest('http://localhost:3000/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '10.0.0.1',
        },
        body: JSON.stringify({ email: 'valid.student@college.edu' }),
      });

      const res = await subscribePOST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.email).toBe('valid.student@college.edu');

      const active = await subscribersRepo.getActiveSubscribers();
      expect(active).toContain('valid.student@college.edu');
    });

    it('rejects invalid email address with HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '10.0.0.2',
        },
        body: JSON.stringify({ email: 'not-an-email' }),
      });

      const res = await subscribePOST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('VALIDATION_FAILED');
    });

    it('rejects non-JSON payload with HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '10.0.0.3',
        },
        body: 'invalid-json{',
      });

      const res = await subscribePOST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('INVALID_JSON');
    });

    it('rejects GET requests with HTTP 405 Method Not Allowed', async () => {
      const res = await subscribeGET();
      expect(res.status).toBe(405);
      const json = await res.json();
      expect(json.error).toBe('METHOD_NOT_ALLOWED');
    });
  });
});
