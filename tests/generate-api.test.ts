import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST, GET } from '../src/app/api/generate/route';
import {
  setTestGenerationSecret,
  resetGenerationLock,
  acquireGenerationLock,
  releaseGenerationLock,
  setCooldownMs,
  resetCooldown,
  timingSafeEqualString,
  resetEndpointRateLimit,
  configureEndpointRateLimit,
} from '../src/lib/security/generation-auth';
import * as pipelineModule from '../src/lib/generation/pipeline';

describe('Protected POST /api/generate Route & Invariants', () => {
  const TEST_SECRET = 'correct-test-generation-secret-xyz123';

  beforeEach(() => {
    setTestGenerationSecret(TEST_SECRET);
    resetGenerationLock();
    resetCooldown();
    resetEndpointRateLimit();
    setCooldownMs(0); // zero cooldown for non-abuse unit tests
  });

  afterEach(() => {
    resetGenerationLock();
    resetCooldown();
    resetEndpointRateLimit();
    setTestGenerationSecret(null);
    vi.restoreAllMocks();
  });

  it('Rejects request without Authorization header with 401 Unauthorized', async () => {
    const req = new Request('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('UNAUTHORIZED');
    expect(body.message).toContain('Missing Authorization header');
  });

  it('Rejects request with invalid Bearer token with 401 Unauthorized', async () => {
    const req = new Request('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer wrong-secret-token',
        'Content-Type': 'application/json',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('UNAUTHORIZED');
    expect(body.message).toBe('Invalid generation secret provided.');
  });

  it('Returns 503 if GENERATION_SECRET is not configured on the server', async () => {
    setTestGenerationSecret(''); // unconfigured

    const req = new Request('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer any-token',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(503);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('SERVER_MISCONFIGURED');
  });

  it('Prevents concurrent duplicate runs with 409 Conflict', async () => {
    // Acquire the lock to simulate an active background run
    const locked = acquireGenerationLock();
    expect(locked).toBe(true);

    const req = new Request('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TEST_SECRET}`,
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(409);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('CONCURRENT_RUN_IN_PROGRESS');

    // Clean up lock
    releaseGenerationLock();
  });

  it('Rejects invalid issueDate with 400 Bad Request (Zod validation)', async () => {
    const req = new Request('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TEST_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        issueDate: 'not-a-valid-date',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('VALIDATION_FAILED');
    expect(body.issues[0].path).toBe('issueDate');
  });

  it('Rejects invalid timezone with 400 Bad Request (Zod validation)', async () => {
    const req = new Request('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TEST_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timezone: 'Mars/Olympus_Mons',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('VALIDATION_FAILED');
    expect(body.issues[0].path).toBe('timezone');
  });

  it('Rejects malformed JSON with 400 Bad Request', async () => {
    const req = new Request('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TEST_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: '{ this is not valid json',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('INVALID_JSON');
  });

  it('Rejects oversized request payload (>64KB) with 413 Payload Too Large', async () => {
    const req = new Request('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TEST_SECRET}`,
        'Content-Type': 'application/json',
        'Content-Length': '70000',
      },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(413);

    const body = await res.json();
    expect(body.error).toBe('PAYLOAD_TOO_LARGE');
  });

  it('Enforces abuse protection cooldown with 429 Too Many Requests', async () => {
    setCooldownMs(10000); // 10 second cooldown

    // Mock pipeline
    vi.spyOn(pipelineModule, 'runIngestionPipeline').mockResolvedValue({
      edition: {
        issueDate: '2026-10-18',
        editionTitle: 'Daily Edition',
        updatedAt: new Date().toISOString(),
        articles: [],
        sourceHealth: [],
        editionStatus: 'ready',
      },
      stats: {
        feedsAttempted: 5,
        feedsSucceeded: 5,
        feedsFailed: 0,
        rawArticlesFetched: 20,
        duplicatesRemoved: 2,
        staleArticlesRemoved: 1,
        qualifyingArticlesCount: 17,
        persistedArticlesCount: 17,
      },
    });

    // First run succeeds
    const req1 = new Request('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${TEST_SECRET}` },
    });
    const res1 = await POST(req1);
    expect(res1.status).toBe(200);

    // Second immediate run triggers 429
    const req2 = new Request('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${TEST_SECRET}` },
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(429);

    const body2 = await res2.json();
    expect(body2.error).toBe('RATE_LIMIT_EXCEEDED');
    expect(res2.headers.get('Retry-After')).toBeDefined();
  });

  it('Successful generation returns required fields (editionUrl, issueDate, articleCount, source & article counts)', async () => {
    vi.spyOn(pipelineModule, 'runIngestionPipeline').mockResolvedValue({
      edition: {
        issueDate: 'Sunday, October 18, 2026',
        editionTitle: 'AI & Computing Edition',
        updatedAt: new Date().toISOString(),
        articles: [
          {
            id: 'art-1',
            sourceId: 'hf-blog',
            sourceName: 'Hugging Face Blog',
            isOfficial: true,
            category: 'models_releases',
            title: 'Transformers 5.0 Released',
            canonicalUrl: 'https://huggingface.co/blog/transformers-5',
            originalFeedUrl: 'https://huggingface.co/blog/feed.xml',
            description: 'New generation of open weights',
            author: 'HF Team',
            publishedAt: '2026-10-18T10:00:00Z',
            fetchedAt: '2026-10-18T12:00:00Z',
            summaryKind: 'source_snippet',
            provenanceLabel: 'Official release',
            categories: ['AI', 'Transformers'],
          },
        ],
        sourceHealth: [],
        editionStatus: 'ready',
      },
      stats: {
        feedsAttempted: 6,
        feedsSucceeded: 5,
        feedsFailed: 1,
        rawArticlesFetched: 45,
        duplicatesRemoved: 10,
        staleArticlesRemoved: 5,
        qualifyingArticlesCount: 30,
        persistedArticlesCount: 30,
      },
    });

    const req = new Request('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TEST_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        issueDate: '2026-10-18',
        timezone: 'Asia/Kolkata',
        limit: 50,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();

    // Required by Prompt 8 and TRD:
    expect(data.success).toBe(true);
    expect(data.editionUrl).toBe('http://localhost:3000/history/2026-10-18');
    expect(data.issueDate).toBe('2026-10-18');
    expect(data.articleCount).toBe(30);
    expect(data.editionStatus).toBe('ready');

    // Counts of fetched, accepted, rejected, and failed sources:
    expect(data.sourcesFetched).toBe(6);
    expect(data.sourcesAccepted).toBe(5);
    expect(data.sourcesFailed).toBe(1);
    expect(data.sourcesRejected).toBeGreaterThanOrEqual(1);

    // Article counts:
    expect(data.articlesFetched).toBe(45);
    expect(data.articlesAccepted).toBe(30);
    expect(data.articlesRejected).toBe(15);

    // Nested counts object:
    expect(data.counts).toEqual({
      sourcesFetched: 6,
      sourcesAccepted: 5,
      sourcesRejected: data.sourcesRejected,
      sourcesFailed: 1,
      articlesFetched: 45,
      articlesAccepted: 30,
      articlesRejected: 15,
    });

    // Invariant: Never leak secret or tokens
    const jsonString = JSON.stringify(data);
    expect(jsonString).not.toContain(TEST_SECRET);
    expect(jsonString).not.toContain('Authorization');
  });

  it('GET /api/generate returns 405 Method Not Allowed with Allow: POST', async () => {
    const res = await GET();
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('POST');

    const body = await res.json();
    expect(body.error).toBe('METHOD_NOT_ALLOWED');
  });

  it('Constant-time token verification handles various string lengths correctly', () => {
    expect(timingSafeEqualString('secret-123', 'secret-123')).toBe(true);
    expect(timingSafeEqualString('secret-123', 'secret-456')).toBe(false);
    expect(timingSafeEqualString('short', 'longer-string-comparison')).toBe(false);
    expect(timingSafeEqualString('', '')).toBe(true);
    expect(timingSafeEqualString('a', '')).toBe(false);
  });

  it('Allows authentication via x-generation-secret header', async () => {
    vi.spyOn(pipelineModule, 'runIngestionPipeline').mockResolvedValue({
      edition: {
        issueDate: '2026-10-19',
        editionTitle: 'Daily Edition',
        updatedAt: new Date().toISOString(),
        articles: [],
        sourceHealth: [],
        editionStatus: 'ready',
      },
      stats: {
        feedsAttempted: 1,
        feedsSucceeded: 1,
        feedsFailed: 0,
        rawArticlesFetched: 1,
        duplicatesRemoved: 0,
        staleArticlesRemoved: 0,
        qualifyingArticlesCount: 1,
        persistedArticlesCount: 1,
      },
    });

    const req = new Request('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'x-generation-secret': TEST_SECRET,
        'Content-Type': 'application/json',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('Rejects calendar-invalid issueDate (e.g. 2026-02-31, 2026-13-40) with 400 Bad Request', async () => {
    const invalidDates = ['2026-02-31', '2026-04-31', '2026-13-10', '2026-00-15'];

    for (const badDate of invalidDates) {
      const req = new Request('http://localhost:3000/api/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ issueDate: badDate }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('VALIDATION_FAILED');
      expect(body.issues[0].path).toBe('issueDate');
    }
  });

  it('Returns 502 Bad Gateway when all sources fail and no previous edition exists, without exposing secrets', async () => {
    vi.spyOn(pipelineModule, 'runIngestionPipeline').mockResolvedValue({
      edition: {
        issueDate: 'Monday, 19 October 2026',
        editionTitle: 'AI & Computing Edition',
        updatedAt: new Date().toISOString(),
        articles: [],
        sourceHealth: [
          {
            id: 'openai-news',
            name: 'OpenAI News',
            category: 'models_releases',
            feedUrl: 'https://openai.com/news/rss.xml',
            isOfficial: true,
            enabled: false,
            status: 'unhealthy',
            httpStatus: 503,
            validEntriesCount: 0,
            newestEntryPublishedAt: null,
            disabledReason: 'Connection timed out',
            checkedAt: new Date().toISOString(),
          },
        ],
        editionStatus: 'failed',
        warningNotice: 'All live sources failed and no previous edition exists.',
      },
      stats: {
        feedsAttempted: 1,
        feedsSucceeded: 0,
        feedsFailed: 1,
        rawArticlesFetched: 0,
        duplicatesRemoved: 0,
        staleArticlesRemoved: 0,
        qualifyingArticlesCount: 0,
        persistedArticlesCount: 0,
      },
    });

    const req = new Request('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TEST_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        issueDate: '2026-10-19',
        timezone: 'Asia/Kolkata',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(502);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('ALL_SOURCES_FAILED');
    expect(data.editionStatus).toBe('failed');
    expect(data.sourcesFetched).toBe(1);
    expect(data.sourcesAccepted).toBe(0);
    expect(data.sourcesFailed).toBe(1);
    expect(data.counts.sourcesFailed).toBe(1);

    // Verify secret is not exposed in error response
    const jsonStr = JSON.stringify(data);
    expect(jsonStr).not.toContain(TEST_SECRET);
    expect(jsonStr).not.toContain('Authorization');
  });

  it('Returns 200 with partial status when all sources fail but previous good edition was preserved', async () => {
    vi.spyOn(pipelineModule, 'runIngestionPipeline').mockResolvedValue({
      edition: {
        issueDate: 'Sunday, 18 October 2026',
        editionTitle: 'AI & Computing Edition',
        updatedAt: new Date().toISOString(),
        articles: [
          {
            id: 'prev-1',
            sourceId: 'openai-news',
            sourceName: 'OpenAI News',
            isOfficial: true,
            category: 'models_releases',
            title: 'Preserved Story from Yesterday',
            canonicalUrl: 'https://openai.com/news/preserved-story',
            originalFeedUrl: 'https://openai.com/news/rss.xml',
            description: 'Preserved real news.',
            author: 'OpenAI',
            publishedAt: '2026-10-18T05:00:00Z',
            fetchedAt: '2026-10-18T08:00:00Z',
            summaryKind: 'source_snippet',
            provenanceLabel: 'Official release',
            categories: [],
          },
        ],
        sourceHealth: [],
        editionStatus: 'partial',
        isPreservedPreviousEdition: true,
        warningNotice: 'Live fetch failed for all sources. Preserving and displaying previous verified edition.',
      },
      stats: {
        feedsAttempted: 2,
        feedsSucceeded: 0,
        feedsFailed: 2,
        rawArticlesFetched: 0,
        duplicatesRemoved: 0,
        staleArticlesRemoved: 0,
        qualifyingArticlesCount: 1,
        persistedArticlesCount: 0,
      },
    });

    const req = new Request('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TEST_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        issueDate: '2026-10-19',
        timezone: 'Asia/Kolkata',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.editionStatus).toBe('partial');
    expect(data.articleCount).toBe(1);
  });

  it('Blocks request flooding with 429 Too Many Requests via sliding-window endpoint limiter', async () => {
    configureEndpointRateLimit(60000, 3); // allow max 3 requests per minute

    const makeReq = () =>
      new Request('http://localhost:3000/api/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_SECRET}`,
        },
      });

    vi.spyOn(pipelineModule, 'runIngestionPipeline').mockResolvedValue({
      edition: {
        issueDate: '2026-10-19',
        editionTitle: 'Daily Edition',
        updatedAt: new Date().toISOString(),
        articles: [],
        sourceHealth: [],
        editionStatus: 'ready',
      },
      stats: {
        feedsAttempted: 1,
        feedsSucceeded: 1,
        feedsFailed: 0,
        rawArticlesFetched: 1,
        duplicatesRemoved: 0,
        staleArticlesRemoved: 0,
        qualifyingArticlesCount: 1,
        persistedArticlesCount: 1,
      },
    });

    // Request 1, 2, 3 succeed or reach auth
    const r1 = await POST(makeReq());
    const r2 = await POST(makeReq());
    const r3 = await POST(makeReq());
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(200);

    // Request 4 exceeds rate limit and is blocked with 429
    const r4 = await POST(makeReq());
    expect(r4.status).toBe(429);
    const body4 = await r4.json();
    expect(body4.error).toBe('RATE_LIMIT_EXCEEDED');
    expect(r4.headers.get('Retry-After')).toBeDefined();

    // Reset rate limiter for other tests
    configureEndpointRateLimit(60000, 60);
  });
});
