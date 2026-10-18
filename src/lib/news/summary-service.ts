import type { Article } from '../../types/article';

export interface SummaryProvider {
  readonly name: string;
  generateSummary(article: {
    title: string;
    description: string | null;
    category: string;
  }): Promise<string | null>;
}

// In-memory test provider override
let testSummaryProvider: SummaryProvider | null = null;

export function setTestSummaryProvider(provider: SummaryProvider | null): void {
  testSummaryProvider = provider;
}

/**
 * Check if AI summarisation is explicitly enabled in environment settings.
 * Defaults to false (no-paid-API baseline).
 */
export function isAiSummariesEnabled(): boolean {
  if (testSummaryProvider !== null) {
    return true;
  }
  return process.env.AI_SUMMARIES_ENABLED === 'true';
}

/**
 * Clean student-oriented prompt template according to docs/07_AI_STUDENT_EDITORIAL_POLICY.md.
 */
function buildPrompt(title: string, description: string | null, category: string): string {
  return [
    'You are an editorial assistant for a technical AI newspaper read by IT and engineering students.',
    'Write a concise, factual summary (maximum 2-3 sentences) based strictly on the provided headline and excerpt.',
    'Focus on: (1) what changed technically, (2) why an IT student/builder should care, and (3) relevant frameworks/tools.',
    'Rules: Do not invent benchmark numbers, dates, or licenses. If a claim is unverified or preliminary, attribute it. Avoid marketing hype.',
    `Category: ${category}`,
    `Headline: ${title}`,
    `Excerpt: ${description || 'No excerpt provided.'}`,
  ].join('\n');
}

/**
 * Google Gemini Free-Tier Summary Provider using REST API.
 */
export class GeminiSummaryProvider implements SummaryProvider {
  public readonly name = 'Google Gemini';
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model = 'gemini-1.5-flash') {
    this.apiKey = (apiKey || process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '').trim();
    this.model = (process.env.AI_MODEL || model).trim();
  }

  async generateSummary(article: {
    title: string;
    description: string | null;
    category: string;
  }): Promise<string | null> {
    if (!this.apiKey) {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      const prompt = buildPrompt(article.title, article.description, article.category);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 150,
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        console.warn(`Gemini API returned HTTP ${res.status}`);
        return null;
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return typeof text === 'string' && text.trim().length > 0 ? text.trim() : null;
    } catch (err: unknown) {
      console.warn('Gemini summary generation failed gracefully:', err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}

/**
 * OpenAI-compatible / Groq free tier / Local Ollama Summary Provider.
 */
export class OpenAiCompatibleSummaryProvider implements SummaryProvider {
  public readonly name = 'OpenAI-Compatible';
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(apiKey?: string, model = 'llama-3.1-8b-instant', baseUrl = 'https://api.groq.com/openai/v1') {
    this.apiKey = (apiKey || process.env.AI_API_KEY || '').trim();
    this.model = (process.env.AI_MODEL || model).trim();
    this.baseUrl = (process.env.AI_BASE_URL || baseUrl).replace(/\/+$/, '');
  }

  async generateSummary(article: {
    title: string;
    description: string | null;
    category: string;
  }): Promise<string | null> {
    if (!this.apiKey) {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const endpoint = `${this.baseUrl}/chat/completions`;
      const prompt = buildPrompt(article.title, article.description, article.category);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'You are a technical editor writing concise 2-sentence summaries for engineering students. Avoid hype and buzzwords.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 150,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        console.warn(`AI Provider returned HTTP ${res.status}`);
        return null;
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      return typeof text === 'string' && text.trim().length > 0 ? text.trim() : null;
    } catch (err: unknown) {
      console.warn('AI summary generation failed gracefully:', err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}

/**
 * Resolve the active summary provider based on environment configuration.
 */
export function getActiveSummaryProvider(): SummaryProvider | null {
  if (testSummaryProvider !== null) {
    return testSummaryProvider;
  }

  if (!isAiSummariesEnabled()) {
    return null;
  }

  const providerName = (process.env.AI_PROVIDER || 'gemini').toLowerCase().trim();

  if (providerName === 'gemini' || providerName === 'google') {
    return new GeminiSummaryProvider();
  }

  if (providerName === 'groq' || providerName === 'openai' || providerName === 'ollama') {
    return new OpenAiCompatibleSummaryProvider();
  }

  return new GeminiSummaryProvider();
}

/**
 * Enriches a batch of qualifying articles with AI summaries.
 * Bounded by maxSummaries limit (default 10 top stories) to preserve free quotas.
 * If provider fails or throws, articles safely retain 'source_snippet'.
 */
export async function enrichArticlesWithAiSummaries(
  articles: Article[],
  maxSummaries = 10
): Promise<number> {
  if (!isAiSummariesEnabled() || articles.length === 0) {
    return 0;
  }

  const provider = getActiveSummaryProvider();
  if (!provider) {
    return 0;
  }

  const targets = articles.slice(0, maxSummaries);
  let enrichedCount = 0;

  // Process sequentially or in small pairs to stay within free-tier rate limits
  for (const article of targets) {
    try {
      const summary = await provider.generateSummary({
        title: article.title,
        description: article.description,
        category: article.category,
      });

      if (summary && summary.length > 20) {
        article.description = summary;
        article.summaryKind = 'ai_generated';
        enrichedCount++;
      }
    } catch (err) {
      console.warn(`Graceful summary fallback for "${article.title}":`, err);
      // Article remains source_snippet
    }
  }

  return enrichedCount;
}
