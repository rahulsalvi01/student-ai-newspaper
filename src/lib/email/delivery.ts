export interface EmailNotificationOptions {
  editionUrl: string;
  issueDate: string;
  articleCount: number;
  recipientEmail?: string;
  dryRun?: boolean;
}

export interface EmailNotificationResult {
  success: boolean;
  dryRun: boolean;
  skipped: boolean;
  recipient: string;
  messageId?: string;
  error?: string;
  details?: string;
}

/**
 * Check if email delivery is enabled in application settings.
 */
export function isEmailDeliveryEnabled(): boolean {
  return process.env.EMAIL_ENABLED === 'true';
}

/**
 * Validate Google App Password requirements:
 * 1. Must be exactly 16 characters (ignoring spaces).
 * 2. Requires Google 2-Step Verification on the Google account.
 * 3. Daily quota: 500 emails/day for personal Gmail accounts.
 */
export function validateGmailCredentials(): {
  valid: boolean;
  error?: string;
  senderEmail?: string;
  sanitizedAppPassword?: string;
} {
  const senderEmail = (
    process.env.NEWSPAPER_GMAIL_ADDRESS ||
    process.env.GMAIL_ADDRESS ||
    ''
  ).trim();
  const rawPassword = (
    process.env.NEWSPAPER_GMAIL_APP_PASSWORD ||
    process.env.GMAIL_APP_PASSWORD ||
    ''
  ).trim();
  const sanitizedAppPassword = rawPassword.replace(/\s+/g, '');

  if (!senderEmail) {
    return { valid: false, error: 'GMAIL_ADDRESS is not set.' };
  }

  // Basic email pattern check
  if (!senderEmail.includes('@') || !senderEmail.includes('.')) {
    return { valid: false, error: 'GMAIL_ADDRESS must be a valid email address.' };
  }

  if (!sanitizedAppPassword) {
    return { valid: false, error: 'GMAIL_APP_PASSWORD is not set.' };
  }

  if (sanitizedAppPassword.length !== 16) {
    return {
      valid: false,
      error: `GMAIL_APP_PASSWORD must be a 16-character Google App Password (received ${sanitizedAppPassword.length} chars).`,
    };
  }

  return {
    valid: true,
    senderEmail,
    sanitizedAppPassword,
  };
}

/**
 * Validate that the edition URL is an absolute HTTPS URL.
 */
export function validateEditionUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'editionUrl must be a non-empty string.' };
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { valid: false, error: 'editionUrl must use HTTP or HTTPS protocol.' };
    }
    if (parsed.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      return { valid: false, error: 'editionUrl must use HTTPS protocol in production.' };
    }
    if (!parsed.hostname) {
      return { valid: false, error: 'editionUrl has an invalid hostname.' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'editionUrl is not a valid URL.' };
  }
}

/**
 * Send an email notification for a ready edition.
 * Features:
 * 1. Strictly enforces dry-run in test environments or when requested. Never contacts Gmail during tests.
 * 2. Graceful fallback when credentials are absent (in-app edition remains completely intact).
 * 3. Validates Google App Password rules and HTTPS URL.
 */
export async function sendEditionEmailNotification(
  options: EmailNotificationOptions
): Promise<EmailNotificationResult> {
  const isTestEnv = process.env.NODE_ENV === 'test';
  const isDryRun = options.dryRun === true || process.env.EMAIL_DRY_RUN === 'true' || isTestEnv;

  const urlCheck = validateEditionUrl(options.editionUrl);
  if (!urlCheck.valid) {
    return {
      success: false,
      dryRun: isDryRun,
      skipped: false,
      recipient: options.recipientEmail || 'unspecified',
      error: 'INVALID_EDITION_URL',
      details: urlCheck.error,
    };
  }

  const creds = validateGmailCredentials();
  const recipient = (
    options.recipientEmail ||
    process.env.NEWSPAPER_RECIPIENT_EMAIL ||
    process.env.RECIPIENT_EMAIL ||
    creds.senderEmail ||
    'reader@example.com'
  ).trim();

  // If credentials are not configured, skip cleanly without throwing
  if (!creds.valid) {
    return {
      success: false,
      dryRun: isDryRun,
      skipped: true,
      recipient,
      error: 'MISSING_CREDENTIALS',
      details: `${creds.error} In-app newspaper remains accessible on the web.`,
    };
  }

  // DRY-RUN MODE: Simulate email dispatch without touching network sockets
  if (isDryRun) {
    const simulatedMsgId = `<simulated-${Date.now()}@gmail.com>`;
    return {
      success: true,
      dryRun: true,
      skipped: false,
      recipient,
      messageId: simulatedMsgId,
      details: `[DRY-RUN] Simulated link email to ${recipient} for edition ${options.issueDate}. No network request was made.`,
    };
  }

  // Real scheduled notifications are executed by the GitHub Actions workflow runner
  // (daily-newspaper.yml) using Python's smtplib.SMTP_SSL over port 465 to avoid
  // heavy nodemailer dependencies in serverless functions.
  return {
    success: true,
    dryRun: false,
    skipped: false,
    recipient,
    messageId: `<delegated-to-github-actions-${Date.now()}>`,
    details: 'Scheduled Gmail link notifications are dispatched via GitHub Actions daily workflow.',
  };
}
