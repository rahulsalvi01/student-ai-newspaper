import { describe, it, expect, vi } from 'vitest';
import {
  fetchArticlesFromSource,
  getPublishedNewspaperData,
  getLiveNewspaperData,
} from '../src/lib/feeds/service';
import type { Source } from '../src/types/sources';
import * as parser from '../src/lib/feeds/parser';
import * as clientModule from '../src/lib/db/client';
import { editionsRepo, sourcesRepo } from '../src/lib/db/repository';

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

describe('getPublishedNewspaperData & Live Fetch Restriction Tests', () => {
  it('loads persisted edition from repository without calling feed scraper parser', async () => {
    const fetchSpy = vi.spyOn(parser, 'fetchFeedXml');

    const mockEdition = {
      id: 'ed-1',
      issue_date: '2026-10-19',
      timezone: 'Asia/Kolkata',
      status: 'ready' as const,
      headline: 'The Daily AI Brief',
      generated_at: '2026-10-19T01:30:00.000Z',
      article_count: 1,
      created_at: '2026-10-19T01:30:00.000Z',
      generation_run_id: null,
    };

    const mockStories = [
      {
        edition_id: 'ed-1',
        article_id: 'art-1',
        rank: 1,
        section: 'models_releases',
        summary: 'Important release summary',
        summary_kind: 'source_snippet' as const,
        created_at: '2026-10-19T01:30:00.000Z',
        article: {
          id: 'art-1',
          source_id: '11111111-1111-1111-1111-111111111111',
          canonical_url: 'https://openai.com/news/release',
          title: 'GPT-5 Model Architecture',
          description: 'Model details',
          author: 'OpenAI',
          published_at: '2026-10-19T00:00:00.000Z',
          fetched_at: '2026-10-19T01:30:00.000Z',
          language: 'en',
          category: 'models_releases',
          content_hash: null,
          created_at: '2026-10-19T01:30:00.000Z',
        },
      },
    ];

    vi.spyOn(clientModule, 'isDatabaseConfigured').mockReturnValue(true);
    vi.spyOn(editionsRepo, 'getLatestEdition').mockResolvedValue(mockEdition);
    vi.spyOn(editionsRepo, 'getEditionWithStoriesByDate').mockResolvedValue({
      edition: mockEdition,
      stories: mockStories,
    });
    vi.spyOn(sourcesRepo, 'getAllSources').mockResolvedValue([]);

    const data = await getPublishedNewspaperData();

    // Verify zero calls to external feed XML scraper
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(data.articles).toHaveLength(1);
    expect(data.articles[0].title).toBe('GPT-5 Model Architecture');
    expect(data.editionStatus).toBe('ready');
  });

  it('returns scheduled waiting notice when database is empty instead of scraping feeds', async () => {
    const fetchSpy = vi.spyOn(parser, 'fetchFeedXml');

    vi.spyOn(clientModule, 'isDatabaseConfigured').mockReturnValue(true);
    vi.spyOn(editionsRepo, 'getLatestEdition').mockResolvedValue(null);

    const data = await getPublishedNewspaperData();

    // Verify zero calls to external feed XML scraper
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(data.articles).toHaveLength(0);
    expect(data.warningNotice).toContain('07:00 AM IST');
  });

  it('getLiveNewspaperData delegates to getPublishedNewspaperData when forceFresh is not set', async () => {
    vi.spyOn(clientModule, 'isDatabaseConfigured').mockReturnValue(true);
    vi.spyOn(editionsRepo, 'getLatestEdition').mockResolvedValue(null);

    const data = await getLiveNewspaperData({ forceFresh: false });
    expect(data.articles).toHaveLength(0);
    expect(data.warningNotice).toContain('07:00 AM IST');
  });
});

