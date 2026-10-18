import { NextResponse } from 'next/server';
import { editionsRepo } from '../../../lib/db/repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const editions = await editionsRepo.getAllEditions();

    return NextResponse.json({
      success: true,
      count: editions.length,
      editions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve editions list';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
