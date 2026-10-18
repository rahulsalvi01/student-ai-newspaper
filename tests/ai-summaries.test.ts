import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isAiSummariesEnabled,
  enrichArticlesWithAiSummaries,
  setTestSummaryProvider,
  type SummaryProvider,
} from '../src/lib/news/summary-service';
import type { Article } from '../src/types/article';

describe('Optional AI Summaries Specification & Invariants', () => {
  const originalEnv = process.env.AI_SUMMARIES_ENABLED;

  beforeEach(() => {
    delete process.env.AI_SUMMARIES_ENABLED;
    setTestSummaryProvider(null);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.AI_SUMMARIES_ENABLED = originalEnv;
    } else {
      delete process.env.AI_SUMMARIES_ENABLED;
    }
    setTestSummaryProvider(null);
  });

  const sampleArticles: Article[] = [
    {
      id: 'art-1',
      sourceId: 'openai-news',
      sourceName: 'OpenAI News',
      isOfficial: true,
      category: 'models_releases',
      title: 'GPT-5.2 Reasoning Model Announced',
      canonicalUrl: 'https://openai.com/index/gpt-5-2',
      originalFeedUrl: 'https://openai.com/news/rss.xml',
      description: 'Original press release excerpt from OpenAI.',
      author: 'OpenAI',
      publishedAt: '2026-10-19T01:00:00Z',
      fetchedAt: '2026-10-19T02:00:00Z',
      summaryKind: 'source_snippet',
      provenanceLabel: 'Official release',
      categories: ['AI'],
    },
    {
      id: 'art-2',
      sourceId: 'deepmind',
      sourceName: 'Google DeepMind',
      isOfficial: true,
      category: 'research',
      title: 'AlphaProof Mathematical Theorem Prover',
      canonicalUrl: 'https://deepmind.google/blog/alphaproof',
      originalFeedUrl: 'https://deepmind.google/blog/rss.xml',
      description: 'Formal reasoning systems for Olympiad mathematics.',
      author: 'DeepMind',
      publishedAt: '2026-10-19T01:30:00Z',
      fetchedAt: '2026-10-19T02:00:00Z',
      summaryKind: 'source_snippet',
      provenanceLabel: 'Official release',
      categories: ['Math', 'AI'],
    },
  ];

  it('1. Baseline rule: AI summaries are disabled by default when env var is unset or false', () => {
    delete process.env.AI_SUMMARIES_ENABLED;
    expect(isAiSummariesEnabled()).toBe(false);

    process.env.AI_SUMMARIES_ENABLED = 'false';
    expect(isAiSummariesEnabled()).toBe(false);
  });

  it('2. Zero-cost fallback: articles preserve source_snippet when AI summaries are disabled', async () => {
    process.env.AI_SUMMARIES_ENABLED = 'false';

    const articlesCopy = JSON.parse(JSON.stringify(sampleArticles)) as Article[];
    const enriched = await enrichArticlesWithAiSummaries(articlesCopy);

    expect(enriched).toBe(0);
    expect(articlesCopy[0].summaryKind).toBe('source_snippet');
    expect(articlesCopy[0].description).toBe('Original press release excerpt from OpenAI.');
  });

  it('3. Resilient fallback: errors or timeouts in AI provider do not crash the pipeline and preserve source description', async () => {
    // Failing provider
    const failingProvider: SummaryProvider = {
      name: 'Failing Provider',
      generateSummary: async () => {
        throw new Error('API Rate Limit Exceeded (HTTP 429)');
      },
    };
    setTestSummaryProvider(failingProvider);

    const articlesCopy = JSON.parse(JSON.stringify(sampleArticles)) as Article[];
    const enriched = await enrichArticlesWithAiSummaries(articlesCopy);

    expect(enriched).toBe(0);
    expect(articlesCopy[0].summaryKind).toBe('source_snippet');
    expect(articlesCopy[0].description).toBe('Original press release excerpt from OpenAI.');
    expect(articlesCopy[1].summaryKind).toBe('source_snippet');
  });

  it('4. Successful AI summary updates description and sets summaryKind to ai_generated', async () => {
    const mockProvider: SummaryProvider = {
      name: 'Mock Gemini',
      generateSummary: async (art) => {
        return `Student takeaway: ${art.title} introduces new formal verification tools useful for discrete mathematics and compiler projects.`;
      },
    };
    setTestSummaryProvider(mockProvider);

    const articlesCopy = JSON.parse(JSON.stringify(sampleArticles)) as Article[];
    const enriched = await enrichArticlesWithAiSummaries(articlesCopy, 1);

    expect(enriched).toBe(1);
    // First article enriched
    expect(articlesCopy[0].summaryKind).toBe('ai_generated');
    expect(articlesCopy[0].description).toContain('Student takeaway:');

    // Second article remains source_snippet because maxSummaries=1
    expect(articlesCopy[1].summaryKind).toBe('source_snippet');
    expect(articlesCopy[1].description).toBe('Formal reasoning systems for Olympiad mathematics.');
  });

  it('5. Quota preservation: honors maxSummaries cap to avoid burning provider limits', async () => {
    let callCount = 0;
    const countingProvider: SummaryProvider = {
      name: 'Counting Provider',
      generateSummary: async () => {
        callCount++;
        return 'Concise student takeaway.';
      },
    };
    setTestSummaryProvider(countingProvider);

    const articlesCopy = JSON.parse(JSON.stringify(sampleArticles)) as Article[];
    await enrichArticlesWithAiSummaries(articlesCopy, 1);

    expect(callCount).toBe(1);
  });
});
