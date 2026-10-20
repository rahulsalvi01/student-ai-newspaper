import { NextResponse } from 'next/server';
import { verifyGenerationAuth } from '../../../../lib/security/generation-auth';
import { subscribersRepo } from '../../../../lib/db/repository';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Standard 405 Method Not Allowed response helper for non-GET requests.
 */
function methodNotAllowed() {
  return NextResponse.json(
    {
      error: 'METHOD_NOT_ALLOWED',
      message: 'Method not allowed. Use GET with Authorization: Bearer <NEWSPAPER_GENERATE_SECRET>.',
    },
    {
      status: 405,
      headers: {
        Allow: 'GET',
        'Cache-Control': 'no-store',
      },
    }
  );
}

/**
 * GET /api/subscribers/recipients
 * Returns trimmed, lowercased, deduplicated list of active subscriber emails.
 * Protected by NEWSPAPER_GENERATE_SECRET (Bearer token).
 * Cache-Control: no-store to prevent edge/proxy caching of private recipient data.
 */
export async function GET(request: Request) {
  // 1. Authenticate with bearer token matching server generation secret
  const auth = verifyGenerationAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json(
      {
        error: auth.errorCode || 'UNAUTHORIZED',
        message: auth.errorMessage || 'Unauthorized',
      },
      {
        status: auth.status || 401,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  // 2. Fetch active subscribers from persistent repository
  try {
    const rawEmails = await subscribersRepo.getActiveSubscribers();

    // 3. Trim, lowercase, and deduplicate
    const recipientSet = new Set<string>();
    for (const email of rawEmails) {
      if (typeof email === 'string') {
        const cleaned = email.trim().toLowerCase();
        if (cleaned.length > 0) {
          recipientSet.add(cleaned);
        }
      }
    }

    const recipients = Array.from(recipientSet);

    return NextResponse.json(
      { recipients, count: recipients.length },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[Recipients API] Failed to fetch active recipients:', errMsg);
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve active recipients.',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}

export async function POST() {
  return methodNotAllowed();
}

export async function PUT() {
  return methodNotAllowed();
}

export async function DELETE() {
  return methodNotAllowed();
}

export async function PATCH() {
  return methodNotAllowed();
}

export async function HEAD() {
  return methodNotAllowed();
}
