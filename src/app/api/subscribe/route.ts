import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { subscribersRepo } from '../../../lib/db/repository';
import { checkSubscriptionRateLimit } from '../../../lib/security/subscription-rate-limiter';

const SubscribeSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .min(3, 'Email address is too short')
    .max(254, 'Email address is too long')
    .email('Please enter a valid email address')
    .transform((val) => val.toLowerCase()),
  source: z.string().optional().default('website'),
});

export async function POST(req: NextRequest) {
  try {
    // 1. IP rate limiting
    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

    if (!checkSubscriptionRateLimit(clientIp)) {
      return NextResponse.json(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many subscription requests from your IP. Please try again in a few minutes.',
        },
        { status: 429 }
      );
    }

    // 2. Parse and validate JSON payload
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        {
          error: 'INVALID_JSON',
          message: 'Request body must be valid JSON.',
        },
        { status: 400 }
      );
    }

    const validation = SubscribeSchema.safeParse(rawBody);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      return NextResponse.json(
        {
          error: 'VALIDATION_FAILED',
          message: issue?.message || 'Invalid email address provided.',
        },
        { status: 400 }
      );
    }

    const { email, source } = validation.data;

    // 3. Persist subscriber to database
    await subscribersRepo.addSubscriber(email, source);

    return NextResponse.json(
      {
        success: true,
        message: 'Successfully subscribed to the daily edition! Tomorrow’s briefing will arrive at 8:00 AM IST.',
        email,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Subscribe API] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred while processing your subscription. Please try again.',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error: 'METHOD_NOT_ALLOWED',
      message: 'Subscribe endpoint only accepts POST requests with JSON payload.',
    },
    { status: 405 }
  );
}
