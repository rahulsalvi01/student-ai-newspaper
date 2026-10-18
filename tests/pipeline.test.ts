import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  runIngestionPipeline,
  resetPipelineCaches,
  setSimulatedLastGoodEdition,
} from '../src/lib/generation/pipeline';
import * as parser from '../src/lib/feeds/parser';
import type { Source } from '../src/types/sources';
import type { NewspaperPageData } from '../src/types/article';

describe('Live Ingestion Pipeline Specification Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetPipelineCaches();
  });

  const sourceA: Source = {
    id: 'source-a',
    name: 'OpenAI News',
    feedUrl: 'https://openai.com/news/rss.xml',
    category: 'models_releases',
    isOfficial: true,
    enabled: true,
    language: 'en',
  };

  const sourceB: Source = {
    id: 'source-b',
    name: 'DeepMind Blog',
    feedUrl: 'https://deepmind.google/blog/rss.xml',
    category: 'research',
    isOfficial: true,
    enabled: true,
    language: 'en',
  };

  it('1. Deduplication: filters out duplicate canonical URLs and identical titles', async () => {
    const xmlWithDuplicates = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>OpenAI News</title>
    <item>
      <title>GPT-5 Multimodal Reasoning Architecture Released</title>
      <link>https://openai.com/news/gpt-5-reasoning</link>
      <description>Official release details on multimodal reasoning models and developer APIs.</description>
      <pubDate>${new Date().toUTCString()}</pubDate>
    </item>
    <item>
      <title>GPT-5 Multimodal Reasoning Architecture Released</title>
      <link>https://openai.com/news/gpt-5-reasoning-duplicate</link>
      <description>Identical title republished wire story.</description>
      <pubDate>${new Date().toUTCString()}</pubDate>
    </item>
    <item>
      <title>Unique Story: Fine-tuning Models with LoRA and PyTorch</title>
      <link>https://openai.com/news/lora-finetuning</link>
      <description>Practical developer guide on fine-tuning LLMs.</description>
      <pubDate>${new Date().toUTCString()}</pubDate>
    </item>
  </channel>
</rss>`;

    vi.spyOn(parser, 'fetchFeedXml').mockResolvedValue({
      xmlContent: xmlWithDuplicates,
      httpStatus: 200,
      responseTimeMs: 80,
      contentType: 'application/rss+xml',
    });

    const result = await runIngestionPipeline({
      forceFresh: true,
      sources: [sourceA],
    });

    expect(result.stats.duplicatesRemoved).toBeGreaterThanOrEqual(1);
    expect(result.edition.articles).toHaveLength(2);
    expect(result.edition.articles.map((a) => a.title)).toEqual([
      expect.stringContaining('GPT-5 Multimodal Reasoning Architecture Released'),
      expect.stringContaining('Unique Story: Fine-tuning Models with LoRA and PyTorch'),
    ]);
  });

  it('2. Stale News: filters out articles older than the freshness cutoff', async () => {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toUTCString();
    const today = new Date().toUTCString();

    const xmlWithStale = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>OpenAI News</title>
    <item>
      <title>Very Old News Item from 60 Days Ago</title>
      <link>https://openai.com/news/stale-story</link>
      <description>This story happened long ago.</description>
      <pubDate>${sixtyDaysAgo}</pubDate>
    </item>
    <item>
      <title>Fresh Model Release: Gemini 1.5 Flash</title>
      <link>https://openai.com/news/fresh-gemini</link>
      <description>Newly launched high-speed inference model for developers.</description>
      <pubDate>${today}</pubDate>
    </item>
  </channel>
</rss>`;

    vi.spyOn(parser, 'fetchFeedXml').mockResolvedValue({
      xmlContent: xmlWithStale,
      httpStatus: 200,
      responseTimeMs: 70,
      contentType: 'application/rss+xml',
    });

    const result = await runIngestionPipeline({
      forceFresh: true,
      maxAgeDays: 30,
      sources: [sourceA],
    });

    expect(result.stats.staleArticlesRemoved).toBe(1);
    expect(result.edition.articles).toHaveLength(1);
    expect(result.edition.articles[0].title).toBe('Fresh Model Release: Gemini 1.5 Flash');
  });

  it('3. Empty Results: returns honest empty edition without fake stories when feeds yield 0 items', async () => {
    const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Quiet Day Feed</title>
  </channel>
</rss>`;

    vi.spyOn(parser, 'fetchFeedXml').mockResolvedValue({
      xmlContent: emptyXml,
      httpStatus: 200,
      responseTimeMs: 50,
      contentType: 'application/rss+xml',
    });

    const result = await runIngestionPipeline({
      forceFresh: true,
      sources: [sourceA],
    });

    expect(result.edition.articles).toHaveLength(0);
    // Real-news-only invariant: Never fabricate stories
    expect(result.edition.editionStatus).toBe('failed');
    expect(result.edition.warningNotice).toContain('no fabricated content is displayed');
  });

  it('4. Partial Failure: healthy sources succeed and form partial edition when one source fails', async () => {
    vi.spyOn(parser, 'fetchFeedXml').mockImplementation(async (url: string) => {
      if (url.includes('openai')) {
        throw new Error('HTTP 503 Service Unavailable');
      }
      return {
        xmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>DeepMind Blog</title>
    <item>
      <title>AlphaFold 3 Biomolecular Structure Prediction Insights</title>
      <link>https://deepmind.google/blog/alphafold-3</link>
      <description>Technical breakthrough in computational biology and neural network architecture.</description>
      <pubDate>${new Date().toUTCString()}</pubDate>
    </item>
  </channel>
</rss>`,
        httpStatus: 200,
        responseTimeMs: 120,
        contentType: 'application/rss+xml',
      };
    });

    const result = await runIngestionPipeline({
      forceFresh: true,
      sources: [sourceA, sourceB],
    });

    expect(result.stats.feedsFailed).toBe(1);
    expect(result.stats.feedsSucceeded).toBe(1);
    expect(result.edition.editionStatus).toBe('partial');
    expect(result.edition.partialFailureNotice).toContain('1 of 2 sources could not be reached');
    expect(result.edition.articles).toHaveLength(1);
    expect(result.edition.articles[0].sourceName).toBe('DeepMind Blog');
  });

  it('5. All-Source Failure: preserves previous good edition with warning notice when all sources fail', async () => {
    // Set up a simulated previously good edition in memory
    const previousEdition: NewspaperPageData = {
      issueDate: 'Saturday, 17 October 2026',
      editionTitle: 'AI & Computing Edition',
      updatedAt: '2026-10-17T08:00:00Z',
      articles: [
        {
          id: 'prev-1',
          sourceId: 'source-a',
          sourceName: 'OpenAI News',
          isOfficial: true,
          category: 'models_releases',
          title: 'Previous Day Breakthrough: Reasoning Models',
          canonicalUrl: 'https://openai.com/news/prev-breakthrough',
          originalFeedUrl: 'https://openai.com/news/rss.xml',
          description: 'A verified story from yesterday.',
          author: 'OpenAI',
          publishedAt: '2026-10-17T06:00:00Z',
          fetchedAt: '2026-10-17T08:00:00Z',
          summaryKind: 'source_snippet',
          provenanceLabel: 'Official release',
          categories: [],
        },
      ],
      sourceHealth: [],
      editionStatus: 'ready',
    };

    setSimulatedLastGoodEdition(previousEdition);

    // Now simulate total feed failure
    vi.spyOn(parser, 'fetchFeedXml').mockRejectedValue(new Error('Total Network Timeout'));

    const result = await runIngestionPipeline({
      forceFresh: true,
      sources: [sourceA, sourceB],
    });

    expect(result.stats.feedsFailed).toBe(2);
    expect(result.stats.feedsSucceeded).toBe(0);
    expect(result.edition.isPreservedPreviousEdition).toBe(true);
    expect(result.edition.articles).toHaveLength(1);
    expect(result.edition.articles[0].title).toBe('Previous Day Breakthrough: Reasoning Models');
    expect(result.edition.warningNotice).toContain('Preserving and displaying the previous verified edition');
  });

  it('6. Repeat Runs: idempotent generation yields stable edition without duplicates', async () => {
    const validXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>OpenAI News</title>
    <item>
      <title>GPT-4o Voice and Realtime API Update</title>
      <link>https://openai.com/news/gpt-4o-update</link>
      <description>Realtime voice capabilities and developer SDKs.</description>
      <pubDate>${new Date().toUTCString()}</pubDate>
    </item>
  </channel>
</rss>`;

    vi.spyOn(parser, 'fetchFeedXml').mockResolvedValue({
      xmlContent: validXml,
      httpStatus: 200,
      responseTimeMs: 90,
      contentType: 'application/rss+xml',
    });

    // Run 1
    const run1 = await runIngestionPipeline({
      forceFresh: true,
      sources: [sourceA],
    });

    // Run 2 (repeat run for same date)
    const run2 = await runIngestionPipeline({
      sources: [sourceA],
    });

    expect(run1.edition.articles).toHaveLength(1);
    expect(run2.edition.articles).toHaveLength(1);
    expect(run1.edition.articles[0].canonicalUrl).toBe(run2.edition.articles[0].canonicalUrl);
    expect(run1.edition.issueDate).toBe(run2.edition.issueDate);
  });
});
