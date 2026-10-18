import { describe, it, expect } from 'vitest';
import { CANDIDATE_SOURCES, SourceRegistry } from '../src/lib/feeds/registry';
import type { FeedHealthResult } from '../src/types/sources';

describe('Source Registry Unit Tests', () => {
  it('loads candidate sources with all required fields from editorial policy', () => {
    expect(CANDIDATE_SOURCES.length).toBeGreaterThanOrEqual(16);
    const registry = new SourceRegistry(CANDIDATE_SOURCES);
    const all = registry.getAllSources();

    expect(all.length).toBeGreaterThanOrEqual(16);

    for (const source of all) {
      expect(source.id).toBeTruthy();
      expect(source.name).toBeTruthy();
      expect(source.feedUrl).toMatch(/^https?:\/\//);
      expect(source.category).toBeTruthy();
      expect(typeof source.isOfficial).toBe('boolean');
      expect(typeof source.enabled).toBe('boolean');
      expect(source.language).toBe('en');
    }
  });

  it('filters enabled sources correctly', () => {
    const registry = new SourceRegistry([
      {
        id: 's1',
        name: 'Source 1',
        feedUrl: 'https://example.com/feed1.xml',
        category: 'models_releases',
        isOfficial: true,
        enabled: true,
        language: 'en',
      },
      {
        id: 's2',
        name: 'Source 2',
        feedUrl: 'https://example.com/feed2.xml',
        category: 'research',
        isOfficial: false,
        enabled: false,
        disabledReason: 'Feed endpoint offline',
        language: 'en',
      },
    ]);

    expect(registry.getAllSources()).toHaveLength(2);
    expect(registry.getEnabledSources()).toHaveLength(1);
    expect(registry.getEnabledSources()[0].id).toBe('s1');
  });

  it('updates health result and disables source upon failure with reason', () => {
    const registry = new SourceRegistry();
    const sampleHealth: FeedHealthResult = {
      status: 'unhealthy',
      httpStatus: 404,
      contentType: null,
      validEntriesCount: 0,
      newestEntryPublishedAt: null,
      exampleArticleUrl: null,
      sampleArticleTitle: null,
      responseTimeMs: 120,
      error: 'HTTP 404 Not Found',
      checkedAt: new Date().toISOString(),
    };

    registry.updateHealthResult('openai-news', sampleHealth);
    const source = registry.getSourceById('openai-news');

    expect(source?.lastHealthResult?.status).toBe('unhealthy');
    expect(source?.enabled).toBe(false);
    expect(source?.disabledReason).toBe('HTTP 404 Not Found');
  });

  it('updates health result and enables source upon success', () => {
    const registry = new SourceRegistry();
    const healthyResult: FeedHealthResult = {
      status: 'healthy',
      httpStatus: 200,
      contentType: 'application/rss+xml',
      validEntriesCount: 15,
      newestEntryPublishedAt: '2026-10-18T00:00:00.000Z',
      exampleArticleUrl: 'https://openai.com/posts/example',
      sampleArticleTitle: 'Example Post',
      responseTimeMs: 250,
      error: null,
      checkedAt: new Date().toISOString(),
    };

    registry.updateHealthResult('openai-news', healthyResult);
    const source = registry.getSourceById('openai-news');

    expect(source?.lastHealthResult?.status).toBe('healthy');
    expect(source?.enabled).toBe(true);
    expect(source?.disabledReason).toBeUndefined();
    expect(source?.lastHealthResult?.validEntriesCount).toBe(15);
  });

  it('allows manual enable/disable and setting suggested alternatives', () => {
    const registry = new SourceRegistry();

    registry.setSourceEnabled('arxiv-cs-ai', false, 'Suppresses weekend updates');
    registry.setSuggestedAlternative(
      'arxiv-cs-ai',
      'https://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=20'
    );

    const source = registry.getSourceById('arxiv-cs-ai');
    expect(source?.enabled).toBe(false);
    expect(source?.disabledReason).toBe('Suppresses weekend updates');
    expect(source?.suggestedAlternative).toContain('export.arxiv.org/api/query');
  });
});
