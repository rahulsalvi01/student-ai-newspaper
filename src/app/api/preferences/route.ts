import { NextResponse } from 'next/server';
import { getPreferences, updatePreferences } from '../../../lib/preferences/service';
import { subscribersRepo } from '../../../lib/db/repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  const preferences = await getPreferences();
  return NextResponse.json({
    success: true,
    preferences,
  });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    // Handle subscriber unsubscribe if requested in preferences payload
    if (typeof body.email === 'string' && body.email.trim()) {
      if (
        body.action === 'unsubscribe' ||
        body.status === 'unsubscribed' ||
        body.emailEnabled === false
      ) {
        await subscribersRepo.unsubscribe(body.email);
      }
    }

    const result = await updatePreferences(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          issues: result.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      preferences: result.data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid JSON payload';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Explicit unsubscribe action via POST /api/preferences
    if (
      typeof body.email === 'string' &&
      body.email.trim() &&
      (body.action === 'unsubscribe' || body.status === 'unsubscribed' || body.emailEnabled === false)
    ) {
      const unsubscribed = await subscribersRepo.unsubscribe(body.email);
      return NextResponse.json({
        success: true,
        message: 'Successfully unsubscribed from daily newspaper notifications.',
        unsubscribed,
      });
    }

    // Default to updatePreferences logic
    const result = await updatePreferences(body);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          issues: result.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      preferences: result.data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid JSON payload';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}
