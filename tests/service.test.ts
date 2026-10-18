import { describe, it, expect, vi } from 'vitest';
import { fetchArticlesFromSource } from '../src/lib/feeds/service';
import type { Source } from '../src/types/sources';
import * as parser from '../src/lib/feeds/parser';

describe('Server-Side Feed Service Unit Tests', () => {
  it('correctly maps valid feed entries into typed Article objects with provenance', async () => {
    const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>OpenAI News</title>
    <link>https://openai.com</link>
    <item>
      <title>GPT-5 Architecture Insights</title>
      <link>https://openai.com/posts/gpt-5-architecture</link>
      <description>Technical discussion of multi-modal reasoning.</description>
      <pubDate>Sun, 18 Oct 2026 05:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

    vi.spyOn(parser, 'fetchFeedXml').mockResolvedValueOnce({
      xmlContent: mockXml,
      httpStatus: 200,
      responseTimeMs: 150,
      contentType: 'application/rss+xml',
    });

    const testSource: Source = {
      id: 'openai-news',
      name: 'OpenAI News',
      feedUrl: 'https://openai.com/news/rss.xml',
      category: 'models_releases',
      isOfficial: true,
      enabled: true,
      language: 'en',
    };

    const result = await fetchArticlesFromSource(testSource);

    expect(result.health.status).toBe('healthy');
    expect(result.articles).toHaveLength(1);

    const article = result.articles[0];
    expect(article.title).toBe('GPT-5 Architecture Insights');
    expect(article.sourceName).toBe('OpenAI News');
    expect(article.isOfficial).toBe(true);
    expect(article.provenanceLabel).toBe('Official release');
    expect(article.summaryKind).toBe('source_snippet');
    expect(article.publishedAt).toBe('2026-10-18T05:00:00.000Z');
    expect(article.canonicalUrl).toBe('https://openai.com/posts/gpt-5-architecture');
  });

  it('marks source unhealthy and returns empty array on network/parsing failure', async () => {
    vi.spyOn(parser, 'fetchFeedXml').mockRejectedValueOnce(new Error('HTTP 503 Service Unavailable'));

    const testSource: Source = {
      id: 'failing-source',
      name: 'Failing Feed',
      feedUrl: 'https://example.com/fail.xml',
      category: 'research',
      isOfficial: false,
      enabled: true,
      language: 'en',
    };

    const result = await fetchArticlesFromSource(testSource);

    expect(result.health.status).toBe('unhealthy');
    expect(result.health.disabledReason).toContain('HTTP 503');
    expect(result.articles).toHaveLength(0);
  });

  it('handles feed with 0 entries by marking it unhealthy with descriptive reason', async () => {
    const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Empty Feed</title>
    <link>https://example.com</link>
  </channel>
</rss>`;

    vi.spyOn(parser, 'fetchFeedXml').mockResolvedValueOnce({
      xmlContent: emptyXml,
      httpStatus: 200,
      responseTimeMs: 80,
      contentType: 'application/rss+xml',
    });

    const testSource: Source = {
      id: 'empty-source',
      name: 'Empty Feed',
      feedUrl: 'https://example.com/empty.xml',
      category: 'research',
      isOfficial: false,
      enabled: true,
      language: 'en',
    };

    const result = await fetchArticlesFromSource(testSource);

    expect(result.health.status).toBe('unhealthy');
    expect(result.health.disabledReason).toContain('0 entries');
    expect(result.articles).toHaveLength(0);
  });
});
