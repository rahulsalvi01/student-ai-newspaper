import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateGmailCredentials,
  validateEditionUrl,
  sendEditionEmailNotification,
} from '../src/lib/email/delivery';
import { POST, GET } from '../src/app/api/delivery/test/route';

describe('Gmail Link Delivery & Dry-Run Safety Specifications', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('1. Google App Password & Gmail Credential Validation', () => {
    it('accepts valid 16-character Google App Password with whitespace', () => {
      process.env.NEWSPAPER_GMAIL_ADDRESS = 'student.editor@gmail.com';
      process.env.NEWSPAPER_GMAIL_APP_PASSWORD = 'abcd efgh ijkl mnop'; // 16 characters with spaces

      const validation = validateGmailCredentials();
      expect(validation.valid).toBe(true);
      expect(validation.senderEmail).toBe('student.editor@gmail.com');
      expect(validation.sanitizedAppPassword).toBe('abcdefghijklmnop');
      expect(validation.sanitizedAppPassword?.length).toBe(16);
    });

    it('rejects missing or empty GMAIL_ADDRESS', () => {
      delete process.env.NEWSPAPER_GMAIL_ADDRESS;
      delete process.env.GMAIL_ADDRESS;
      process.env.NEWSPAPER_GMAIL_APP_PASSWORD = 'abcdefghijklmnop';

      const validation = validateGmailCredentials();
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('GMAIL_ADDRESS is not set');
    });

    it('rejects non-email format in GMAIL_ADDRESS', () => {
      process.env.NEWSPAPER_GMAIL_ADDRESS = 'not-an-email';
      process.env.NEWSPAPER_GMAIL_APP_PASSWORD = 'abcdefghijklmnop';

      const validation = validateGmailCredentials();
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('valid email address');
    });

    it('rejects passwords that are not 16 characters long', () => {
      process.env.NEWSPAPER_GMAIL_ADDRESS = 'student.editor@gmail.com';
      process.env.NEWSPAPER_GMAIL_APP_PASSWORD = 'shortpassword'; // 13 chars

      const validation = validateGmailCredentials();
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('16-character Google App Password');
    });
  });

  describe('2. Edition URL Validation', () => {
    it('accepts valid absolute HTTPS URLs', () => {
      const check = validateEditionUrl('https://student-ai-newspaper.vercel.app/history/2026-10-19');
      expect(check.valid).toBe(true);
    });

    it('rejects non-URL strings or empty inputs', () => {
      expect(validateEditionUrl('').valid).toBe(false);
      expect(validateEditionUrl('not-a-url').valid).toBe(false);
    });

    it('rejects HTTP in production environment', () => {
      const prevEnv = process.env.NODE_ENV;
      // @ts-expect-error override readonly NODE_ENV for test
      process.env.NODE_ENV = 'production';
      try {
        const check = validateEditionUrl('http://student-ai-newspaper.vercel.app/history/2026-10-19');
        expect(check.valid).toBe(false);
        expect(check.error).toContain('HTTPS');
      } finally {
        // @ts-expect-error restore
        process.env.NODE_ENV = prevEnv;
      }
    });
  });

  describe('3. Dry-Run & Non-Destructive In-App Resilience', () => {
    it('safely skips email without throwing when credentials are not configured', async () => {
      delete process.env.NEWSPAPER_GMAIL_ADDRESS;
      delete process.env.GMAIL_ADDRESS;
      delete process.env.NEWSPAPER_GMAIL_APP_PASSWORD;
      delete process.env.GMAIL_APP_PASSWORD;

      const result = await sendEditionEmailNotification({
        editionUrl: 'https://student-ai-newspaper.vercel.app/history/2026-10-19',
        issueDate: '2026-10-19',
        articleCount: 15,
      });

      expect(result.skipped).toBe(true);
      expect(result.success).toBe(false);
      expect(result.error).toBe('MISSING_CREDENTIALS');
      expect(result.details).toContain('In-app newspaper remains accessible on the web');
    });

    it('enforces dry-run simulation mode without contacting Gmail network sockets', async () => {
      process.env.NEWSPAPER_GMAIL_ADDRESS = 'student.editor@gmail.com';
      process.env.NEWSPAPER_GMAIL_APP_PASSWORD = 'abcdefghijklmnop';

      const result = await sendEditionEmailNotification({
        editionUrl: 'https://student-ai-newspaper.vercel.app/history/2026-10-19',
        issueDate: '2026-10-19',
        articleCount: 20,
        dryRun: true,
      });

      expect(result.dryRun).toBe(true);
      expect(result.success).toBe(true);
      expect(result.skipped).toBe(false);
      expect(result.messageId).toMatch(/<simulated-\d+@gmail\.com>/);
      expect(result.details).toContain('[DRY-RUN]');
    });

    it('rejects sending if editionUrl is invalid', async () => {
      process.env.NEWSPAPER_GMAIL_ADDRESS = 'student.editor@gmail.com';
      process.env.NEWSPAPER_GMAIL_APP_PASSWORD = 'abcdefghijklmnop';

      const result = await sendEditionEmailNotification({
        editionUrl: 'ftp://invalid-url',
        issueDate: '2026-10-19',
        articleCount: 20,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_EDITION_URL');
    });
  });

  describe('4. Delivery Test Endpoint (POST /api/delivery/test)', () => {
    it('returns 405 Method Not Allowed on GET requests', async () => {
      const response = await GET();
      expect(response.status).toBe(405);
      const data = await response.json();
      expect(data.error).toBe('METHOD_NOT_ALLOWED');
    });

    it('rejects unauthenticated POST requests with 401', async () => {
      process.env.GENERATION_SECRET = 'correct-secret-12345';

      const req = new Request('http://localhost:3000/api/delivery/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(req);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('UNAUTHORIZED');
    });

    it('processes authenticated POST in dry-run mode and returns structured response', async () => {
      process.env.GENERATION_SECRET = 'correct-secret-12345';
      process.env.NEWSPAPER_GMAIL_ADDRESS = 'student.editor@gmail.com';
      process.env.NEWSPAPER_GMAIL_APP_PASSWORD = 'abcdefghijklmnop';

      const req = new Request('http://localhost:3000/api/delivery/test', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer correct-secret-12345',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          editionUrl: 'https://student-ai-newspaper.vercel.app/history/2026-10-19',
          issueDate: '2026-10-19',
          articleCount: 12,
          dryRun: true,
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.dryRun).toBe(true);
      expect(data.success).toBe(true);
      expect(data.recipient).toBe('student.editor@gmail.com');
      expect(data.messageId).toContain('@gmail.com');
    });
  });
});
