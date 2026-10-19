import { describe, it, expect, beforeEach, vi } from 'vitest';
import { encryptSecret, syncSubscribersToGitHubSecret } from '../src/lib/github/secrets';
import { subscribersRepo } from '../src/lib/db/repository';
import { POST, GET } from '../src/app/api/subscribe/route';
import {
  checkSubscriptionRateLimit,
  resetSubscriptionRateLimits,
} from '../src/lib/security/subscription-rate-limiter';
import { NextRequest } from 'next/server';

describe('Subscription and GitHub Secrets Sync', () => {
  beforeEach(() => {
    subscribersRepo.clearInMemory();
    resetSubscriptionRateLimits();
    vi.restoreAllMocks();
  });

  describe('1. Libsodium Sealed-Box Encryption', () => {
    it('encrypts secret value using a 32-byte public key', () => {
      // 32-byte dummy public key encoded as base64
      const dummyPublicKey = Buffer.alloc(32, 7).toString('base64');
      const secret = 'student@example.com,test@university.edu';

      const encrypted = encryptSecret(secret, dummyPublicKey);

      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);
      // Valid base64
      expect(Buffer.from(encrypted, 'base64').toString('base64')).toBe(encrypted);
    });

    it('throws when public key is invalid', () => {
      expect(() => encryptSecret('secret', 'invalid-key')).toThrow();
    });
  });

  describe('2. Subscribers Repository (Persistence & Normalization)', () => {
    it('normalizes email by trimming whitespace and lowercasing', async () => {
      const sub = await subscribersRepo.addSubscriber('  STUDENT@University.EDU  ');
      expect(sub.email).toBe('STUDENT@University.EDU');
      expect(sub.normalized_email).toBe('student@university.edu');
      expect(sub.status).toBe('active');

      const active = await subscribersRepo.getActiveSubscribers();
      expect(active).toEqual(['STUDENT@University.EDU']);
    });

    it('handles duplicates idempotently without adding extra rows', async () => {
      await subscribersRepo.addSubscriber('student@test.com');
      await subscribersRepo.addSubscriber('STUDENT@test.com');
      await subscribersRepo.addSubscriber('  student@test.com  ');

      const active = await subscribersRepo.getActiveSubscribers();
      expect(active.length).toBe(1);
      expect(active[0].toLowerCase()).toBe('student@test.com');
    });
  });

  describe('3. GitHub Actions Secret Synchronization', () => {
    it('gracefully skips sync when GitHub credentials are not configured', async () => {
      await subscribersRepo.addSubscriber('alice@university.edu');

      const result = await syncSubscribersToGitHubSecret({
        token: '',
        owner: '',
        repo: '',
      });

      expect(result.success).toBe(true);
      expect(result.synced).toBe(false);
      expect(result.totalRecipients).toBe(1);
      expect(result.message).toContain('skipped');
    });

    it('successfully retrieves public key, encrypts, and updates GitHub secret', async () => {
      await subscribersRepo.addSubscriber('alice@school.edu');
      await subscribersRepo.addSubscriber('bob@school.edu');

      const dummyPublicKeyBase64 = Buffer.alloc(32, 9).toString('base64');
      let putPayload: { encrypted_value: string; key_id: string } | null = null;
      let putUrl = '';

      const mockFetcher = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        if (url.includes('/actions/secrets/public-key')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              key_id: 'key_12345',
              key: dummyPublicKeyBase64,
            }),
          };
        }

        if (url.includes('/actions/secrets/')) {
          putUrl = url;
          putPayload = JSON.parse(init?.body as string);
          return {
            ok: true,
            status: 204,
            text: async () => '',
          };
        }

        return { ok: false, status: 404, text: async () => 'Not found' };
      });

      const result = await syncSubscribersToGitHubSecret({
        token: 'ghp_fake_token',
        owner: 'test-owner',
        repo: 'test-repo',
        secretName: 'NEWSPAPER_RECIPIENT_EMAIL',
        fetchFn: mockFetcher as unknown as typeof fetch,
      });

      expect(result.success).toBe(true);
      expect(result.synced).toBe(true);
      expect(result.totalRecipients).toBe(2);
      expect(putUrl).toContain('/repos/test-owner/test-repo/actions/secrets/NEWSPAPER_RECIPIENT_EMAIL');
      expect(putPayload).not.toBeNull();
      const payload = putPayload as unknown as { encrypted_value: string; key_id: string };
      expect(payload.key_id).toBe('key_12345');
      expect(typeof payload.encrypted_value).toBe('string');
    });

    it('safely handles GitHub API network or auth failure without throwing', async () => {
      await subscribersRepo.addSubscriber('student@test.com');

      const mockFetcher = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Bad credentials',
      });

      const result = await syncSubscribersToGitHubSecret({
        token: 'ghp_invalid_token',
        owner: 'test-owner',
        repo: 'test-repo',
        fetchFn: mockFetcher as unknown as typeof fetch,
      });

      expect(result.success).toBe(false);
      expect(result.synced).toBe(false);
      expect(result.error).toContain('HTTP 401');
    });
  });

  describe('4. Rate Limiting Protection', () => {
    it('allows up to 5 requests per IP and blocks subsequent requests', () => {
      const testIp = '192.168.1.100';

      for (let i = 0; i < 5; i++) {
        expect(checkSubscriptionRateLimit(testIp)).toBe(true);
      }

      // 6th request must be rejected
      expect(checkSubscriptionRateLimit(testIp)).toBe(false);
    });
  });

  describe('5. Subscribe API Endpoint (POST /api/subscribe)', () => {
    it('accepts valid email and persists subscriber', async () => {
      const req = new NextRequest('http://localhost:3000/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '10.0.0.1',
        },
        body: JSON.stringify({ email: 'newstudent@college.edu' }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.email).toBe('newstudent@college.edu');

      const active = await subscribersRepo.getActiveSubscribers();
      expect(active).toContain('newstudent@college.edu');
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

      const res = await POST(req);
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

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('INVALID_JSON');
    });

    it('rejects GET requests with HTTP 405 Method Not Allowed', async () => {
      const res = await GET();
      expect(res.status).toBe(405);
      const json = await res.json();
      expect(json.error).toBe('METHOD_NOT_ALLOWED');
    });
  });
});
