import { describe, it, expect } from 'vitest';
import { calculateArticlePriority, prioritizeArticles } from '../src/lib/news/prioritizer';
import type { Article } from '../src/types/article';

describe('Article Prioritization Engine Tests', () => {
  const baseArticle: Article = {
    id: 'test-1',
    sourceId: 'openai-news',
    sourceName: 'OpenAI News',
    isOfficial: true,
    category: 'models_releases',
    title: 'OpenAI Releases GPT-4o Reasoning Capabilities and API Update',
    canonicalUrl: 'https://openai.com/news/gpt-4o',
    originalFeedUrl: 'https://openai.com/news/rss.xml',
    description:
      'We are rolling out new reasoning capabilities, multimodal streaming APIs, and developer toolkits with Python and TypeScript SDK support.',
    author: 'OpenAI Team',
    publishedAt: new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    summaryKind: 'source_snippet',
    provenanceLabel: 'Official release',
    categories: ['AI', 'Models'],
  };

  it('scores official model releases with developer relevance highly (>70)', () => {
    const { score, reasons } = calculateArticlePriority(baseArticle);
    expect(score).toBeGreaterThanOrEqual(70);
    expect(reasons.some((r) => r.includes('Official primary'))).toBe(true);
    expect(reasons.some((r) => r.includes('Model milestone'))).toBe(true);
  });

  it('penalizes stock/financial noise heavily', () => {
    const noisyArticle: Article = {
      ...baseArticle,
      isOfficial: false,
      sourceId: 'techcrunch-ai',
      title: 'Billionaire Tech Investors Watch AI Stocks Surge as Valuation Soars',
      description: 'Hedge funds and Wall Street investors trade shares as tech stock valuation climbs.',
    };

    const { score, reasons } = calculateArticlePriority(noisyArticle);
    expect(score).toBeLessThan(50);
    expect(reasons.some((r) => r.includes('Noise deduction'))).toBe(true);
  });

  it('penalizes raw LaTeX math formulas in titles', () => {
    const mathArticle: Article = {
      ...baseArticle,
      sourceId: 'arxiv-cs-ai',
      isOfficial: false,
      title: 'Convergence of $\\mathcal{W}_p$ on $\\mathbb{R}^d$ under Assumption A',
      description: 'A purely theoretical proof for convergence under arbitrary metric constraints.',
    };

    const { reasons } = calculateArticlePriority(mathArticle);
    expect(reasons.some((r) => r.includes('Raw LaTeX formula in title'))).toBe(true);
  });

  it('strictly limits article output to 100 items when hundreds are provided', () => {
    const dummyArticles: Article[] = [];
    for (let i = 0; i < 250; i++) {
      dummyArticles.push({
        ...baseArticle,
        id: `art-${i}`,
        canonicalUrl: `https://example.com/article-${i}`,
        title: `Technical Update ${i}: LangChain and Llama Agent Pipeline`,
        publishedAt: new Date(Date.now() - i * 3600 * 1000).toISOString(),
      });
    }

    const result = prioritizeArticles(dummyArticles, 100);
    expect(result).toHaveLength(100);
    // Verified that every article has a priorityScore
    expect(result[0].priorityScore).toBeDefined();
    // Highest score should be first
    expect(result[0].priorityScore!).toBeGreaterThanOrEqual(result[99].priorityScore!);
  });

  it('deduplicates duplicate titles across feeds', () => {
    const duplicateList: Article[] = [
      {
        ...baseArticle,
        id: 'dup-1',
        title: 'DeepSeek-R1 Architecture Open Weights Released',
        canonicalUrl: 'https://source1.com/deepseek-r1',
      },
      {
        ...baseArticle,
        id: 'dup-2',
        title: 'DeepSeek-R1 Architecture Open Weights Released',
        canonicalUrl: 'https://source2.com/deepseek-r1-mirror',
      },
    ];

    const result = prioritizeArticles(duplicateList, 100);
    expect(result).toHaveLength(1);
  });
});
