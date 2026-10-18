import { XMLParser } from 'fast-xml-parser';
import { validateFeedUrl } from '../security/url-validator';
import type { ParsedFeed, RawFeedEntry } from '../../types/sources';

export const DEFAULT_FEED_TIMEOUT_MS = 10000;
export const MAX_FEED_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB cap

/**
 * Strips HTML tags and normalises whitespace from raw text/HTML snippets.
 */
export function cleanHtmlText(raw: unknown): string {
  if (typeof raw !== 'string') {
    if (raw && typeof raw === 'object' && '#text' in raw) {
      return cleanHtmlText((raw as { '#text': unknown })['#text']);
    }
    return '';
  }

  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Safely parses any date string into an ISO 8601 string, or null if unparseable.
 */
export function parseDateToIso(dateStr: unknown): string | null {
  if (!dateStr || typeof dateStr !== 'string') {
    if (dateStr && typeof dateStr === 'object' && '#text' in dateStr) {
      return parseDateToIso((dateStr as { '#text': unknown })['#text']);
    }
    return null;
  }

  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function extractLink(rawLink: unknown): string {
  if (!rawLink) return '';
  if (typeof rawLink === 'string') return rawLink.trim();

  if (Array.isArray(rawLink)) {
    // Atom feeds often have multiple <link> tags (e.g. rel="alternate", rel="self")
    const alternate = rawLink.find(
      (item) => item && typeof item === 'object' && (item['@_rel'] === 'alternate' || !item['@_rel'])
    );
    if (alternate) return extractLink(alternate);
    const firstWithHref = rawLink.find((item) => item && typeof item === 'object' && item['@_href']);
    if (firstWithHref) return extractLink(firstWithHref);
    return extractLink(rawLink[0]);
  }

  if (typeof rawLink === 'object') {
    const obj = rawLink as Record<string, unknown>;
    if (obj['@_href'] && typeof obj['@_href'] === 'string') {
      return obj['@_href'].trim();
    }
    if (obj['#text'] && typeof obj['#text'] === 'string') {
      return obj['#text'].trim();
    }
  }

  return '';
}

function extractString(val: unknown): string {
  if (typeof val === 'string') return val.trim();
  if (val && typeof val === 'object' && '#text' in val) {
    return extractString((val as { '#text': unknown })['#text']);
  }
  return '';
}

function extractCategories(cat: unknown): string[] {
  if (!cat) return [];
  if (Array.isArray(cat)) {
    return cat
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          return (
            extractString((item as Record<string, unknown>)['@_term']) ||
            extractString((item as Record<string, unknown>)['#text'])
          );
        }
        return '';
      })
      .filter(Boolean);
  }
  const single = extractString(cat);
  return single ? [single] : [];
}

/**
 * Parses raw XML text into a unified ParsedFeed object.
 */
export function parseFeedXml(xmlContent: string, feedUrl: string): ParsedFeed {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    trimValues: true,
    parseTagValue: false, // Don't convert numbers or booleans automatically
  });

  const parsed = parser.parse(xmlContent);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Failed to parse XML: empty or invalid root structure');
  }

  // Detect RSS 2.0 / RSS 1.0 (RDF)
  if (parsed.rss?.channel || parsed['rdf:RDF']) {
    const channelRaw = parsed.rss?.channel || parsed['rdf:RDF']?.channel;
    const channel = (Array.isArray(channelRaw) ? channelRaw[0] : channelRaw) || {};
    const feedTitle = cleanHtmlText(channel.title) || 'Untitled Feed';
    const feedDescription = cleanHtmlText(channel.description) || null;
    const siteUrl = extractLink(channel.link) || null;

    let itemsRaw = channel.item || parsed['rdf:RDF']?.item || [];
    if (!Array.isArray(itemsRaw)) {
      itemsRaw = itemsRaw ? [itemsRaw] : [];
    }

    const entries: RawFeedEntry[] = [];
    for (const item of itemsRaw) {
      if (!item || typeof item !== 'object') continue;

      const title = cleanHtmlText(item.title);
      const url = extractLink(item.link) || extractLink(item.guid);
      if (!title || !url) continue;

      const description =
        cleanHtmlText(item.description) ||
        cleanHtmlText(item['content:encoded']) ||
        null;

      const author =
        cleanHtmlText(item['dc:creator']) ||
        cleanHtmlText(item.author) ||
        null;

      const publishedAt =
        parseDateToIso(item.pubDate) ||
        parseDateToIso(item['dc:date']) ||
        parseDateToIso(item['a10:updated']) ||
        null;

      entries.push({
        title,
        url,
        description: description ? description.slice(0, 1000) : null,
        author: author ? author.slice(0, 200) : null,
        publishedAt,
        categories: extractCategories(item.category),
        content: cleanHtmlText(item['content:encoded']) || null,
        guid: extractString(item.guid) || null,
      });
    }

    return {
      title: feedTitle,
      description: feedDescription,
      feedUrl,
      siteUrl,
      format: 'rss',
      entries,
    };
  }

  // Detect Atom
  if (parsed.feed) {
    const feed = parsed.feed;
    const feedTitle = cleanHtmlText(feed.title) || 'Untitled Atom Feed';
    const feedDescription = cleanHtmlText(feed.subtitle) || null;
    const siteUrl = extractLink(feed.link) || null;

    let entriesRaw = feed.entry || [];
    if (!Array.isArray(entriesRaw)) {
      entriesRaw = entriesRaw ? [entriesRaw] : [];
    }

    const entries: RawFeedEntry[] = [];
    for (const entry of entriesRaw) {
      if (!entry || typeof entry !== 'object') continue;

      const title = cleanHtmlText(entry.title);
      const url = extractLink(entry.link) || extractString(entry.id);
      if (!title || !url) continue;

      const description =
        cleanHtmlText(entry.summary) ||
        cleanHtmlText(entry.content) ||
        null;

      const authorObj = entry.author;
      const author = authorObj
        ? cleanHtmlText(typeof authorObj === 'object' ? authorObj.name : authorObj)
        : null;

      const publishedAt =
        parseDateToIso(entry.published) ||
        parseDateToIso(entry.updated) ||
        null;

      entries.push({
        title,
        url,
        description: description ? description.slice(0, 1000) : null,
        author: author ? author.slice(0, 200) : null,
        publishedAt,
        categories: extractCategories(entry.category),
        content: cleanHtmlText(entry.content) || null,
        guid: extractString(entry.id) || null,
      });
    }

    return {
      title: feedTitle,
      description: feedDescription,
      feedUrl,
      siteUrl,
      format: 'atom',
      entries,
    };
  }

  throw new Error('Unsupported feed format: neither RSS nor Atom structure detected');
}

/**
 * Fetches feed XML over HTTP(S) with SSRF checks, timeout, and response size cap.
 */
export async function fetchFeedXml(
  feedUrl: string,
  options?: {
    timeoutMs?: number;
    maxSizeBytes?: number;
  }
): Promise<{ xmlContent: string; responseTimeMs: number; contentType: string | null; httpStatus: number }> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_FEED_TIMEOUT_MS;
  const maxSizeBytes = options?.maxSizeBytes ?? MAX_FEED_SIZE_BYTES;

  // SSRF guard
  const validation = validateFeedUrl(feedUrl);
  if (!validation.isValid) {
    throw new Error(`SSRF Block: ${validation.reason}`);
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(validation.sanitizedUrl!, {
      method: 'GET',
      headers: {
        'User-Agent':
          'StudentAINewspaper/1.0 (+https://github.com/student-ai-newspaper; feed-ingestion)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      },
      signal: controller.signal,
      redirect: 'follow',
      cache: 'no-store',
    });

    const responseTimeMs = Date.now() - startTime;
    const httpStatus = response.status;
    const contentType = response.headers.get('content-type');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    // Read body while streaming, enforcing maxSizeBytes
    const reader = response.body?.getReader();
    if (!reader) {
      const text = await response.text();
      return { xmlContent: text, responseTimeMs, contentType, httpStatus };
    }

    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        receivedBytes += value.length;
        if (receivedBytes > maxSizeBytes) {
          controller.abort();
          throw new Error(`Feed exceeded maximum size limit of ${maxSizeBytes} bytes`);
        }
        chunks.push(value);
      }
    }

    const totalBuffer = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      totalBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    const decoder = new TextDecoder('utf-8');
    const xmlContent = decoder.decode(totalBuffer);

    return { xmlContent, responseTimeMs, contentType, httpStatus };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
