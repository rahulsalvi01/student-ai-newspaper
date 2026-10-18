import type { Article } from '../../types/article';

export interface PriorityEvaluation {
  score: number;
  reasons: string[];
}

/**
 * Calculates a quality and priority relevance score (0–100) for an article
 * based on docs/07_AI_STUDENT_EDITORIAL_POLICY.md.
 * 
 * Criteria:
 * - Source Tier & Primary Provenance: 0–25
 * - Major Model / Breakthrough Milestone: 0–25
 * - Developer & Engineering Hands-on Utility: 0–25
 * - Content Completeness & Clarity: 0–15
 * - Freshness & Recency: 0–15
 * Deductions:
 * - Financial / Stock / Hype Noise: -25
 * - Raw LaTeX / Cryptic Title: -15
 * - Missing or Sparse Description: -10
 */
export function calculateArticlePriority(article: Article): PriorityEvaluation {
  let score = 0;
  const reasons: string[] = [];

  const textToScan = `${article.title} ${article.description || ''}`.toLowerCase();

  // 1. Source Tier & Provenance (0–25)
  if (article.isOfficial) {
    score += 25;
    reasons.push('Official primary engineering source (+25)');
  } else if (
    article.sourceId === 'mit-tech-review-ai' ||
    article.sourceId === 'the-decoder' ||
    article.sourceId === 'techcrunch-ai'
  ) {
    score += 18;
    reasons.push('Vetted technical journalism (+18)');
  } else if (article.sourceId.startsWith('arxiv')) {
    score += 10;
    reasons.push('Academic research preprint (+10)');
  } else {
    score += 12;
  }

  // 2. High-Impact Model & Architecture Releases (0–25)
  const highImpactKeywords = [
    'gpt-4',
    'gpt-5',
    'o1',
    'o3',
    'chatgpt',
    'gemini',
    'deepmind',
    'gemma',
    'claude',
    'anthropic',
    'llama',
    'llama 3',
    'llama-3',
    'llama 4',
    'deepseek',
    'deepseek-v3',
    'deepseek-r1',
    'qwen',
    'mistral',
    'codestral',
    'phi-3',
    'phi-4',
    'weights release',
    'open weights',
    'open-weights',
    'model release',
    'reasoning model',
    'foundation model',
    'multimodal',
    'diffusion',
    'benchmark',
  ];

  const matchedModelKeywords = highImpactKeywords.filter((kw) => textToScan.includes(kw));
  if (matchedModelKeywords.length > 0) {
    score += 20;
    reasons.push(`Model milestone signal: ${matchedModelKeywords[0]} (+20)`);
  }

  // 3. Developer & Engineering Practical Value (0–25)
  const devKeywords = [
    'agent',
    'copilot',
    'cursor',
    'coding assistant',
    'vllm',
    'ollama',
    'langchain',
    'llamaindex',
    'hugging face',
    'transformers',
    'pytorch',
    'cuda',
    'inference',
    'quantization',
    'fine-tuning',
    'fine tuning',
    'lora',
    'rag',
    'vector database',
    'sdk',
    'api',
    'github',
    'open source',
    'open-source',
    'framework',
    'tutorial',
    'how-to',
    'guide',
    'evaluation',
    'synthetic data',
    'distillation',
  ];

  const matchedDevKeywords = devKeywords.filter((kw) => textToScan.includes(kw));
  if (matchedDevKeywords.length >= 3) {
    score += 20;
    reasons.push(`Rich developer utility: ${matchedDevKeywords.slice(0, 3).join(', ')} (+20)`);
  } else if (matchedDevKeywords.length >= 1) {
    score += 12;
    reasons.push(`Developer utility: ${matchedDevKeywords[0]} (+12)`);
  }

  // 4. Content Completeness & Formatting (0–15)
  const descLength = article.description?.trim().length || 0;
  if (descLength > 150) {
    score += 10;
    reasons.push('Detailed technical summary (+10)');
  } else if (descLength > 40) {
    score += 5;
  } else {
    score -= 10;
    reasons.push('Sparse or missing description (-10)');
  }

  if (article.author) {
    score += 5;
  }

  // 5. Freshness / Recency (0–15)
  if (article.publishedAt) {
    const publishedTime = new Date(article.publishedAt).getTime();
    if (!isNaN(publishedTime)) {
      const ageHours = (Date.now() - publishedTime) / (1000 * 60 * 60);
      if (ageHours <= 24) {
        score += 15;
        reasons.push('Published in the last 24h (+15)');
      } else if (ageHours <= 48) {
        score += 10;
        reasons.push('Published in the last 48h (+10)');
      } else if (ageHours <= 168) {
        score += 5;
        reasons.push('Published this week (+5)');
      } else if (ageHours > 720) {
        score -= 15;
        reasons.push('Stale content > 30 days (-15)');
      }
    }
  }

  // 6. Deductions: Financial hype, non-technical fluff, unformatted math
  const noiseKeywords = [
    'stock',
    'stocks',
    'shares rise',
    'shares jump',
    'investors',
    'funding round',
    'valuation',
    'billionaire',
    'net worth',
    'layoffs',
    'lawsuit',
    'crypto',
    'bitcoin',
    'celebrity',
  ];

  const noiseFound = noiseKeywords.filter((kw) => textToScan.includes(kw));
  if (noiseFound.length > 0) {
    score -= 25;
    reasons.push(`Noise deduction: ${noiseFound[0]} (-25)`);
  }

  // arXiv math formula / unparsed title penalty (e.g. $f(x)$ or titles with only math)
  if (/\$[^$]+\$/.test(article.title) || /\\[a-zA-Z]+/.test(article.title)) {
    score -= 15;
    reasons.push('Raw LaTeX formula in title (-15)');
  }

  const finalScore = Math.max(0, Math.min(100, score));
  return { score: finalScore, reasons };
}

/**
 * Deduplicate articles by normalized title.
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Filter, score, rank, and prioritize articles to return the top N highest-quality news.
 * Ensures balanced source representation so preprint feeds do not overwhelm official
 * engineering releases, while guaranteeing exactly `limit` articles (or all if fewer).
 */
export function prioritizeArticles(articles: Article[], limit = 100): Article[] {
  if (articles.length === 0) return [];

  // 1. Deduplicate by canonical URL and normalized title
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const uniqueArticles: Article[] = [];

  for (const art of articles) {
    const normUrl = art.canonicalUrl.toLowerCase().trim();
    const normTitle = normalizeTitle(art.title);

    if (normUrl && seenUrls.has(normUrl)) continue;
    if (normTitle && seenTitles.has(normTitle)) continue;

    if (normUrl) seenUrls.add(normUrl);
    if (normTitle) seenTitles.add(normTitle);
    uniqueArticles.push(art);
  }

  // 2. Score every article
  const scored = uniqueArticles.map((art) => {
    const { score, reasons } = calculateArticlePriority(art);
    return {
      ...art,
      priorityScore: score,
      priorityReasons: reasons,
    };
  });

  // 3. Sort primarily by priority score descending, secondarily by publication date descending
  scored.sort((a, b) => {
    const scoreDiff = (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
    if (scoreDiff !== 0) return scoreDiff;

    const timeA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const timeB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return timeB - timeA;
  });

  // 4. Source Diversity: Limit any single source to prevent an arXiv preprint flood
  // while allowing official and top-tier news to shine
  const maxPerSource = 20;
  const sourceCounts = new Map<string, number>();
  const selected: Article[] = [];
  const deferred: Article[] = [];

  for (const article of scored) {
    const count = sourceCounts.get(article.sourceId) || 0;
    if (count < maxPerSource) {
      selected.push(article);
      sourceCounts.set(article.sourceId, count + 1);
      if (selected.length === limit) break;
    } else {
      deferred.push(article);
    }
  }

  // If we still need more to hit `limit` (e.g. 100), backfill from deferred
  if (selected.length < limit && deferred.length > 0) {
    for (const article of deferred) {
      selected.push(article);
      if (selected.length === limit) break;
    }
  }

  return selected.slice(0, limit);
}
