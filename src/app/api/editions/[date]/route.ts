import { NextResponse } from 'next/server';
import { editionsRepo } from '../../../../lib/db/repository';
import { EditionDateParamSchema } from '../../../../lib/preferences/schema';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const resolvedParams = await params;
    const dateValidation = EditionDateParamSchema.safeParse(resolvedParams.date);

    if (!dateValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date parameter. Required format is YYYY-MM-DD.',
          issues: dateValidation.error.errors.map((e) => e.message),
        },
        { status: 400 }
      );
    }

    const editionDate = dateValidation.data;
    const editionData = await editionsRepo.getEditionWithStoriesByDate(editionDate);

    if (!editionData) {
      return NextResponse.json(
        {
          success: false,
          error: `No edition found for date ${editionDate}. Only real persisted editions are available.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      edition: editionData.edition,
      storyCount: editionData.stories.length,
      stories: editionData.stories,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error retrieving archived edition';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
