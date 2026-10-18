import crypto from 'crypto';
import { z } from 'zod';

/**
 * Zod schema for generation request payloads.
 */
export const GenerateRequestSchema = z
  .object({
    issueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'issueDate must be in YYYY-MM-DD format')
      .refine(
        (val) => {
          const [yearStr, monthStr, dayStr] = val.split('-');
          const year = parseInt(yearStr, 10);
          const month = parseInt(monthStr, 10);
          const day = parseInt(dayStr, 10);
          if (month < 1 || month > 12 || day < 1 || day > 31) return false;
          const d = new Date(Date.UTC(year, month - 1, day));
          return (
            d.getUTCFullYear() === year &&
            d.getUTCMonth() === month - 1 &&
            d.getUTCDate() === day
          );
        },
        { message: 'issueDate must be a valid calendar date in YYYY-MM-DD format' }
      )
      .optional(),
    timezone: z
      .string()
      .min(1, 'Timezone cannot be empty')
      .refine(
        (tz) => {
          try {
            Intl.DateTimeFormat(undefined, { timeZone: tz });
            return true;
          } catch {
            return false;
          }
        },
        { message: 'Invalid IANA timezone name (e.g., Asia/Kolkata, UTC, America/New_York)' }
      )
      .optional(),
    limit: z.number().int().min(5, 'Limit must be at least 5').max(100, 'Limit cannot exceed 100').optional(),
    force: z.boolean().optional(),
    trigger: z.enum(['manual', 'scheduled']).optional(),
  })
  .strict();

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export interface AuthVerificationResult {
  authenticated: boolean;
  status?: number;
  errorCode?: string;
  errorMessage?: string;
}

// In-memory test override for GENERATION_SECRET
let testSecretOverride: string | null = null;

/**
 * Configure test secret override (strictly for testing).
 */
export function setTestGenerationSecret(secret: string | null): void {
  testSecretOverride = secret;
}

/**
 * Read the configured server-side generation secret.
 * Keeps secret strictly server-side and never exposes it to client.
 */
export function getConfiguredGenerationSecret(): string | null {
  if (testSecretOverride !== null) {
    return testSecretOverride;
  }
  const secret = process.env.GENERATION_SECRET;
  if (!secret || secret === 'REPLACE_WITH_LONG_RANDOM_SECRET') {
    return null;
  }
  return secret.trim();
}

export function timingSafeEqualString(a: string, b: string): boolean {
  if (a === '' && b === '') {
    return true;
  }
  if (a === '' || b === '') {
    return false;
  }
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  if (bufA.length !== bufB.length) {
    // Perform dummy comparison to keep constant-ish execution time
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Extract bearer token or custom header from incoming Request.
 */
export function extractAuthToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader) {
    const parts = authHeader.trim().split(/\s+/);
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1];
    }
  }

  const customHeader =
    request.headers.get('x-generation-secret') || request.headers.get('X-Generation-Secret');
  if (customHeader) {
    return customHeader.trim();
  }

  return null;
}

/**
 * Verify credentials for POST /api/generate in constant time.
 * Returns structured authentication status and HTTP error codes.
 */
export function verifyGenerationAuth(request: Request): AuthVerificationResult {
  const serverSecret = getConfiguredGenerationSecret();

  if (!serverSecret) {
    return {
      authenticated: false,
      status: 503,
      errorCode: 'SERVER_MISCONFIGURED',
      errorMessage: 'GENERATION_SECRET is not configured on this server.',
    };
  }

  const providedToken = extractAuthToken(request);

  if (!providedToken) {
    return {
      authenticated: false,
      status: 401,
      errorCode: 'UNAUTHORIZED',
      errorMessage: 'Missing Authorization header with Bearer token or x-generation-secret.',
    };
  }

  const isValid = timingSafeEqualString(providedToken, serverSecret);

  if (!isValid) {
    return {
      authenticated: false,
      status: 401,
      errorCode: 'UNAUTHORIZED',
      errorMessage: 'Invalid generation secret provided.',
    };
  }

  return { authenticated: true };
}

// -------------------------------------------------------------
// Concurrency Control (Mutex Lock)
// -------------------------------------------------------------

let isRunInProgress = false;
let activeRunStartedAt: number | null = null;
const LOCK_TIMEOUT_MS = 3 * 60 * 1000; // 3 minute watchdog timeout

/**
 * Attempt to acquire the generation lock.
 * Returns true if lock was acquired, false if another run is in progress.
 */
export function acquireGenerationLock(): boolean {
  const now = Date.now();

  // Watchdog: release stale locks older than 3 minutes
  if (isRunInProgress && activeRunStartedAt && now - activeRunStartedAt > LOCK_TIMEOUT_MS) {
    console.warn('Releasing stale generation lock after timeout');
    isRunInProgress = false;
    activeRunStartedAt = null;
  }

  if (isRunInProgress) {
    return false;
  }

  isRunInProgress = true;
  activeRunStartedAt = now;
  return true;
}

/**
 * Release generation lock after completion or error.
 */
export function releaseGenerationLock(): void {
  isRunInProgress = false;
  activeRunStartedAt = null;
}

/**
 * Check if a generation run is currently active.
 */
export function isGenerationActive(): boolean {
  return isRunInProgress;
}

/**
 * Reset generation lock (strictly for tests).
 */
export function resetGenerationLock(): void {
  isRunInProgress = false;
  activeRunStartedAt = null;
}

// -------------------------------------------------------------
// Abuse Protection & Rate Limiting
// -------------------------------------------------------------

let lastRunCompletedAt = 0;
let runCooldownMs = 3000; // 3 seconds cooldown between completed runs

export function setCooldownMs(ms: number): void {
  runCooldownMs = ms;
}

export function resetCooldown(): void {
  lastRunCompletedAt = 0;
}

export function markRunCompleted(): void {
  lastRunCompletedAt = Date.now();
}

/**
 * Check if the request violates the generation cooldown / abuse limit.
 */
export function checkAbuseProtection(force = false): {
  allowed: boolean;
  retryAfterSeconds?: number;
} {
  if (force) {
    return { allowed: true };
  }

  const elapsed = Date.now() - lastRunCompletedAt;
  if (lastRunCompletedAt > 0 && elapsed < runCooldownMs) {
    const remainingMs = runCooldownMs - elapsed;
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(remainingMs / 1000),
    };
  }

  return { allowed: true };
}

// -------------------------------------------------------------
// Endpoint Sliding-Window Rate Limiter
// -------------------------------------------------------------

const requestTimestamps: number[] = [];
let rateLimitWindowMs = 60 * 1000; // 1 minute window
let maxRequestsPerWindow = 60; // Max 60 requests per minute

export function configureEndpointRateLimit(windowMs: number, maxRequests: number): void {
  rateLimitWindowMs = windowMs;
  maxRequestsPerWindow = maxRequests;
}

export function resetEndpointRateLimit(): void {
  requestTimestamps.length = 0;
}

/**
 * Check if incoming requests exceed the sliding-window threshold.
 * Prevents endpoint spam, brute force, and abuse.
 */
export function checkEndpointRateLimit(): {
  allowed: boolean;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  // Expire timestamps outside the sliding window
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - rateLimitWindowMs) {
    requestTimestamps.shift();
  }

  if (requestTimestamps.length >= maxRequestsPerWindow) {
    const oldest = requestTimestamps[0];
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + rateLimitWindowMs - now) / 1000)
    );
    return {
      allowed: false,
      retryAfterSeconds,
    };
  }

  requestTimestamps.push(now);
  return { allowed: true };
}
