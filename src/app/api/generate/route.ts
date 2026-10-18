import { NextResponse } from 'next/server';
import {
  verifyGenerationAuth,
  acquireGenerationLock,
  releaseGenerationLock,
  checkAbuseProtection,
  checkEndpointRateLimit,
  markRunCompleted,
  GenerateRequestSchema,
  type GenerateRequest,
} from '../../../lib/security/generation-auth';
import { runIngestionPipeline, getIssueDateString } from '../../../lib/generation/pipeline';
import { sourceRegistry } from '../../../lib/feeds/registry';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for live multi-source RSS fetching and DB persistence

/**
 * Resolve absolute base URL for editionUrl link.
 */
function resolveBaseUrl(request: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  }

  const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
  const proto = request.headers.get('x-forwarded-proto') || 'http';

  if (host) {
    return `${proto}://${host}`.replace(/\/+$/, '');
  }

  return 'http://localhost:3000';
}

/**
 * POST /api/generate
 * Protected generation endpoint triggered by GitHub Actions or local invocation.
 */
export async function POST(request: Request) {
  const startTime = Date.now();

  // 1. Enforce payload size cap (SSRF/abuse protection)
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > 64 * 1024) {
    return NextResponse.json(
      {
        success: false,
        error: 'PAYLOAD_TOO_LARGE',
        message: 'Request payload exceeds maximum allowed size (64KB).',
      },
      { status: 413 }
    );
  }

  // 2. Sliding window abuse protection / rate limit check
  const rateLimit = checkEndpointRateLimit();
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Endpoint request rate limit exceeded. Please wait before retrying.',
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds || 1),
        },
      }
    );
  }

  // 3. Authentication check with constant-time token comparison
  const auth = verifyGenerationAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json(
      {
        success: false,
        error: auth.errorCode || 'UNAUTHORIZED',
        message: auth.errorMessage || 'Unauthorized',
      },
      { status: auth.status || 401 }
    );
  }

  // 4. Prevent concurrent duplicate runs
  const lockAcquired = acquireGenerationLock();
  if (!lockAcquired) {
    return NextResponse.json(
      {
        success: false,
        error: 'CONCURRENT_RUN_IN_PROGRESS',
        message: 'A generation run is currently in progress. Please wait for it to complete.',
      },
      { status: 409 }
    );
  }

  try {
    // 4. Parse and validate optional body
    let bodyPayload: GenerateRequest = {};
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      let rawJson: unknown = undefined;
      try {
        const rawText = await request.text();
        if (rawText.trim().length > 0) {
          rawJson = JSON.parse(rawText);
        }
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: 'INVALID_JSON',
            message: 'Request body contains malformed JSON.',
          },
          { status: 400 }
        );
      }

      if (rawJson && typeof rawJson === 'object') {
        const validation = GenerateRequestSchema.safeParse(rawJson);
        if (!validation.success) {
          return NextResponse.json(
            {
              success: false,
              error: 'VALIDATION_FAILED',
              message: 'Invalid request parameters',
              issues: validation.error.issues.map((i) => ({
                path: i.path.join('.'),
                message: i.message,
              })),
            },
            { status: 400 }
          );
        }
        bodyPayload = validation.data;
      }
    }

    // 5. Abuse protection and rate limiting cooldown
    const abuseCheck = checkAbuseProtection(bodyPayload.force);
    if (!abuseCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Generation rate limit exceeded. Please wait before triggering another run.',
          retryAfterSeconds: abuseCheck.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(abuseCheck.retryAfterSeconds || 1),
          },
        }
      );
    }

    // 6. Execute live ingestion pipeline
    const timezone = bodyPayload.timezone || 'Asia/Kolkata';
    const issueDate = bodyPayload.issueDate || getIssueDateString(new Date(), timezone);
    const candidateSources = sourceRegistry.getEnabledSources();

    const result = await runIngestionPipeline({
      issueDate,
      timezone,
      limit: bodyPayload.limit ?? 100,
      forceFresh: bodyPayload.force ?? true,
      trigger: bodyPayload.trigger ?? 'manual',
    });

    markRunCompleted();

    // 7. Calculate source and article breakdown counts
    const sourcesFetched = result.stats.feedsAttempted;
    const sourcesAccepted = result.stats.feedsSucceeded;
    const sourcesFailed = result.stats.feedsFailed;
    const sourcesRejected = Math.max(0, candidateSources.length - sourcesAccepted);

    const articlesFetched = result.stats.rawArticlesFetched;
    const articlesAccepted = result.stats.qualifyingArticlesCount;
    const articlesRejected =
      result.stats.duplicatesRemoved +
      result.stats.staleArticlesRemoved +
      Math.max(
        0,
        result.stats.rawArticlesFetched -
          result.stats.qualifyingArticlesCount -
          result.stats.duplicatesRemoved -
          result.stats.staleArticlesRemoved
      );

    const baseUrl = resolveBaseUrl(request);
    const editionUrl = `${baseUrl}/history/${issueDate}`;

    // 8. Return response without exposing secrets or credentials
    if (result.edition.editionStatus === 'failed' && result.stats.feedsSucceeded === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'ALL_SOURCES_FAILED',
          message:
            'All live news feed sources failed to fetch and no previous edition was available to preserve.',
          editionStatus: 'failed',
          sourcesFetched,
          sourcesAccepted,
          sourcesRejected,
          sourcesFailed,
          articlesFetched,
          articlesAccepted,
          articlesRejected,
          counts: {
            sourcesFetched,
            sourcesAccepted,
            sourcesRejected,
            sourcesFailed,
            articlesFetched,
            articlesAccepted,
            articlesRejected,
          },
          durationMs: Date.now() - startTime,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      editionUrl,
      issueDate,
      articleCount: articlesAccepted,
      editionStatus: result.edition.editionStatus,
      sourcesFetched,
      sourcesAccepted,
      sourcesRejected,
      sourcesFailed,
      articlesFetched,
      articlesAccepted,
      articlesRejected,
      counts: {
        sourcesFetched,
        sourcesAccepted,
        sourcesRejected,
        sourcesFailed,
        articlesFetched,
        articlesAccepted,
        articlesRejected,
      },
      durationMs: Date.now() - startTime,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal generation pipeline error';
    console.error('Generation pipeline unhandled error:', errorMsg);

    return NextResponse.json(
      {
        success: false,
        error: 'GENERATION_FAILED',
        message: 'The generation pipeline encountered an unexpected error.',
      },
      { status: 500 }
    );
  } finally {
    // 9. Always release concurrency lock
    releaseGenerationLock();
  }
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Use POST with Authorization: Bearer <GENERATION_SECRET> to trigger edition generation.',
    },
    {
      status: 405,
      headers: {
        Allow: 'POST',
      },
    }
  );
}
