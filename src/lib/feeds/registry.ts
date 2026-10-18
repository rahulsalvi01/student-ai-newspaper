import type { Source, FeedHealthResult } from '../../types/sources';

/**
 * Starter candidate source registry based on docs/07_AI_STUDENT_EDITORIAL_POLICY.md.
 * Feeds are treated as candidates until verified with real network requests.
 */
export const CANDIDATE_SOURCES: Source[] = [
  // Primary / Official Model & Engineering Releases
  {
    id: 'openai-news',
    name: 'OpenAI News',
    feedUrl: 'https://openai.com/news/rss.xml',
    category: 'models_releases',
    isOfficial: true,
    enabled: true,
    language: 'en',
  },
  {
    id: 'google-deepmind',
    name: 'Google DeepMind',
    feedUrl: 'https://deepmind.google/blog/rss.xml',
    category: 'research',
    isOfficial: true,
    enabled: true,
    language: 'en',
  },
  {
    id: 'google-ai-blog',
    name: 'Google AI Blog',
    feedUrl: 'https://blog.google/technology/ai/rss/',
    category: 'models_releases',
    isOfficial: true,
    enabled: true,
    language: 'en',
  },
  {
    id: 'huggingface-blog',
    name: 'Hugging Face Blog',
    feedUrl: 'https://huggingface.co/blog/feed.xml',
    category: 'open_source',
    isOfficial: true,
    enabled: true,
    language: 'en',
  },
  {
    id: 'nvidia-blog',
    name: 'NVIDIA Blog',
    feedUrl: 'https://blogs.nvidia.com/feed/',
    category: 'industry_infrastructure',
    isOfficial: true,
    enabled: true,
    language: 'en',
  },
  {
    id: 'microsoft-research',
    name: 'Microsoft Research',
    feedUrl: 'https://www.microsoft.com/en-us/research/feed/',
    category: 'research',
    isOfficial: true,
    enabled: true,
    language: 'en',
  },
  {
    id: 'meta-engineering',
    name: 'Meta Engineering',
    feedUrl: 'https://engineering.fb.com/feed/',
    category: 'developer_tools',
    isOfficial: true,
    enabled: true,
    language: 'en',
  },
  {
    id: 'aws-ai-blog',
    name: 'AWS AI Blog',
    feedUrl: 'https://aws.amazon.com/blogs/ai/feed/',
    category: 'industry_infrastructure',
    isOfficial: true,
    enabled: true,
    language: 'en',
  },
  {
    id: 'apple-ml-research',
    name: 'Apple Machine Learning Research',
    feedUrl: 'https://machinelearning.apple.com/rss.xml',
    category: 'research',
    isOfficial: true,
    enabled: true,
    language: 'en',
  },

  // Independent Context & Analysis
  {
    id: 'techcrunch-ai',
    name: 'TechCrunch AI',
    feedUrl: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    category: 'general_ai',
    isOfficial: false,
    enabled: true,
    language: 'en',
  },
  {
    id: 'the-decoder',
    name: 'The Decoder',
    feedUrl: 'https://the-decoder.com/feed/',
    category: 'general_ai',
    isOfficial: false,
    enabled: true,
    language: 'en',
  },
  {
    id: 'mit-tech-review-ai',
    name: 'MIT Technology Review AI',
    feedUrl: 'https://www.technologyreview.com/topic/artificial-intelligence/feed',
    category: 'research',
    isOfficial: false,
    enabled: true,
    language: 'en',
  },

  // Targeted Academic Research (arXiv)
  {
    id: 'arxiv-cs-ai',
    name: 'arXiv Artificial Intelligence (cs.AI)',
    feedUrl: 'https://rss.arxiv.org/rss/cs.AI',
    category: 'research',
    isOfficial: false,
    enabled: true,
    language: 'en',
  },
  {
    id: 'arxiv-cs-lg',
    name: 'arXiv Machine Learning (cs.LG)',
    feedUrl: 'https://rss.arxiv.org/rss/cs.LG',
    category: 'research',
    isOfficial: false,
    enabled: true,
    language: 'en',
  },
  {
    id: 'arxiv-cs-cl',
    name: 'arXiv Computation and Language (cs.CL)',
    feedUrl: 'https://rss.arxiv.org/rss/cs.CL',
    category: 'research',
    isOfficial: false,
    enabled: true,
    language: 'en',
  },
  {
    id: 'arxiv-cs-se',
    name: 'arXiv Software Engineering (cs.SE)',
    feedUrl: 'https://rss.arxiv.org/rss/cs.SE',
    category: 'developer_tools',
    isOfficial: false,
    enabled: true,
    language: 'en',
  },
];

export class SourceRegistry {
  private sources: Map<string, Source> = new Map();

  constructor(initialSources: Source[] = CANDIDATE_SOURCES) {
    for (const s of initialSources) {
      this.sources.set(s.id, { ...s });
    }
  }

  public getAllSources(): Source[] {
    return Array.from(this.sources.values());
  }

  public getSourceById(id: string): Source | undefined {
    return this.sources.get(id);
  }

  public getEnabledSources(): Source[] {
    return Array.from(this.sources.values()).filter((s) => s.enabled);
  }

  public updateHealthResult(id: string, health: FeedHealthResult): void {
    const existing = this.sources.get(id);
    if (!existing) return;

    existing.lastHealthResult = health;

    // If verification definitively failed, disable the source with a reason
    if (health.status === 'unhealthy') {
      existing.enabled = false;
      existing.disabledReason = health.error || 'Feed health check failed';
    } else {
      existing.enabled = true;
      existing.disabledReason = undefined;
    }
  }

  public setSourceEnabled(id: string, enabled: boolean, reason?: string): void {
    const existing = this.sources.get(id);
    if (!existing) return;
    existing.enabled = enabled;
    if (!enabled && reason) {
      existing.disabledReason = reason;
    }
  }

  public setSuggestedAlternative(id: string, alternativeUrl: string): void {
    const existing = this.sources.get(id);
    if (!existing) return;
    existing.suggestedAlternative = alternativeUrl;
  }
}

export const sourceRegistry = new SourceRegistry();
