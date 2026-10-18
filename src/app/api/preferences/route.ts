import { NextResponse } from 'next/server';
import { getPreferences, updatePreferences } from '../../../lib/preferences/service';

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
