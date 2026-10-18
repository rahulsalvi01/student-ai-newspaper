import { NextResponse } from 'next/server';
import {
  verifyGenerationAuth,
  checkEndpointRateLimit,
} from '../../../../lib/security/generation-auth';
import { sendEditionEmailNotification } from '../../../../lib/email/delivery';

export const dynamic = 'force-dynamic';

/**
 * POST /api/delivery/test
 * Test the email adapter in dry-run mode without sending real emails.
 * Protected by server GENERATION_SECRET.
 */
export async function POST(request: Request) {
  // 1. Abuse protection
  const rateLimit = checkEndpointRateLimit();
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Endpoint rate limit exceeded. Please wait before retrying.',
      },
      { status: 429 }
    );
  }

  // 2. Authentication check
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

  // 3. Parse optional parameters
  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text.trim().length > 0) {
      body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'INVALID_JSON',
        message: 'Malformed JSON payload.',
      },
      { status: 400 }
    );
  }

  const dryRun = body.dryRun !== false; // Defaults to dryRun=true for safety
  const editionUrl =
    typeof body.editionUrl === 'string'
      ? body.editionUrl
      : 'https://student-ai-newspaper.vercel.app/history/2026-10-19';
  const issueDate = typeof body.issueDate === 'string' ? body.issueDate : '2026-10-19';
  const articleCount = typeof body.articleCount === 'number' ? body.articleCount : 25;
  const recipientEmail =
    typeof body.recipientEmail === 'string' ? body.recipientEmail : undefined;

  const result = await sendEditionEmailNotification({
    editionUrl,
    issueDate,
    articleCount,
    recipientEmail,
    dryRun,
  });

  return NextResponse.json({
    success: result.success || result.skipped,
    dryRun: result.dryRun,
    skipped: result.skipped,
    recipient: result.recipient,
    messageId: result.messageId,
    details: result.details,
    error: result.error,
  });
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Use POST with Authorization: Bearer <GENERATION_SECRET> to test email delivery adapter.',
    },
    {
      status: 405,
      headers: { Allow: 'POST' },
    }
  );
}
