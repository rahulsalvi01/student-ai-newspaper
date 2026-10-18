/**
 * SSRF and URL validation security module.
 * Protects server-side ingestion by ensuring URLs use permitted HTTP(S) schemes
 * and do not point to internal, private, loopback, or cloud-metadata destinations.
 */

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'instance-data',
  'router.asus.com',
]);

const IPV4_LOOPBACK = /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const IPV4_PRIVATE_10 = /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const IPV4_PRIVATE_172 = /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/;
const IPV4_PRIVATE_192 = /^192\.168\.\d{1,3}\.\d{1,3}$/;
const IPV4_LINK_LOCAL = /^169\.254\.\d{1,3}\.\d{1,3}$/;
const IPV4_BROADCAST = /^255\.255\.255\.255$/;

export interface UrlValidationResult {
  isValid: boolean;
  sanitizedUrl?: string;
  reason?: string;
}

export function validateFeedUrl(inputUrl: string): UrlValidationResult {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { isValid: false, reason: 'URL must be a non-empty string' };
  }

  const trimmed = inputUrl.trim();
  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    return { isValid: false, reason: 'Malformed URL format' };
  }

  // Scheme validation: strictly http or https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      isValid: false,
      reason: `Disallowed protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Blocked exact hostnames
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { isValid: false, reason: `Disallowed host "${hostname}"` };
  }

  // Block local domains
  if (
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.lan')
  ) {
    return { isValid: false, reason: `Private local domain "${hostname}" is disallowed.` };
  }

  // IPv6 loopback and private
  if (
    hostname === '[::1]' ||
    hostname === '::1' ||
    hostname.startsWith('[fc') ||
    hostname.startsWith('[fd') ||
    hostname.startsWith('[fe80')
  ) {
    return { isValid: false, reason: 'IPv6 private or loopback addresses are disallowed.' };
  }

  // IPv4 private/loopback/link-local checks
  if (
    IPV4_LOOPBACK.test(hostname) ||
    IPV4_PRIVATE_10.test(hostname) ||
    IPV4_PRIVATE_172.test(hostname) ||
    IPV4_PRIVATE_192.test(hostname) ||
    IPV4_LINK_LOCAL.test(hostname) ||
    IPV4_BROADCAST.test(hostname) ||
    hostname === '0.0.0.0'
  ) {
    return { isValid: false, reason: `Private or loopback IP "${hostname}" is disallowed.` };
  }

  return {
    isValid: true,
    sanitizedUrl: parsed.href,
  };
}
