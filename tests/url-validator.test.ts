import { describe, it, expect } from 'vitest';
import { validateFeedUrl } from '../src/lib/security/url-validator';

describe('validateFeedUrl SSRF & Scheme Protection', () => {
  it('accepts valid public https feed URLs', () => {
    const result = validateFeedUrl('https://openai.com/news/rss.xml');
    expect(result.isValid).toBe(true);
    expect(result.sanitizedUrl).toBe('https://openai.com/news/rss.xml');
  });

  it('accepts valid public http feed URLs', () => {
    const result = validateFeedUrl('http://example.com/rss.xml');
    expect(result.isValid).toBe(true);
  });

  it('rejects non-http/https protocols', () => {
    expect(validateFeedUrl('javascript:alert(1)').isValid).toBe(false);
    expect(validateFeedUrl('file:///etc/passwd').isValid).toBe(false);
    expect(validateFeedUrl('ftp://example.com/feed.xml').isValid).toBe(false);
    expect(validateFeedUrl('data:text/xml,<rss></rss>').isValid).toBe(false);
  });

  it('rejects loopback and localhost URLs (SSRF)', () => {
    expect(validateFeedUrl('http://localhost:3000/api').isValid).toBe(false);
    expect(validateFeedUrl('http://127.0.0.1/admin').isValid).toBe(false);
    expect(validateFeedUrl('http://127.0.0.5:8080/').isValid).toBe(false);
    expect(validateFeedUrl('http://sub.localhost/feed').isValid).toBe(false);
  });

  it('rejects private IPv4 networks (SSRF)', () => {
    expect(validateFeedUrl('http://10.0.0.1/feed').isValid).toBe(false);
    expect(validateFeedUrl('http://172.16.0.1/feed').isValid).toBe(false);
    expect(validateFeedUrl('http://172.31.255.255/feed').isValid).toBe(false);
    expect(validateFeedUrl('http://192.168.1.1/feed').isValid).toBe(false);
    expect(validateFeedUrl('http://0.0.0.0/').isValid).toBe(false);
  });

  it('rejects cloud metadata IP addresses', () => {
    expect(validateFeedUrl('http://169.254.169.254/latest/meta-data').isValid).toBe(false);
    expect(validateFeedUrl('http://metadata.google.internal/computeMetadata/v1').isValid).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(validateFeedUrl('').isValid).toBe(false);
    expect(validateFeedUrl('not-a-url').isValid).toBe(false);
  });
});
