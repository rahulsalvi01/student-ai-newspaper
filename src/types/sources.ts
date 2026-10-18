export type SourceCategory =
  | 'models_releases'
  | 'developer_tools'
  | 'research'
  | 'open_source'
  | 'industry_infrastructure'
  | 'student_action'
  | 'general_ai';

export interface FeedHealthResult {
  status: 'healthy' | 'unhealthy';
  httpStatus: number | null;
  contentType: string | null;
  validEntriesCount: number;
  newestEntryPublishedAt: string | null;
  exampleArticleUrl: string | null;
  sampleArticleTitle: string | null;
  responseTimeMs: number;
  error: string | null;
  checkedAt: string;
}

export interface Source {
  id: string;
  name: string;
  feedUrl: string;
  category: SourceCategory;
  isOfficial: boolean;
  enabled: boolean;
  disabledReason?: string;
  suggestedAlternative?: string;
  language: string;
  region?: string;
  lastHealthResult?: FeedHealthResult;
}

export interface RawFeedEntry {
  title: string;
  url: string;
  description: string | null;
  author: string | null;
  publishedAt: string | null; // ISO 8601 string if parsed, or null
  categories: string[];
  content: string | null;
  guid: string | null;
}

export interface ParsedFeed {
  title: string;
  description: string | null;
  feedUrl: string;
  siteUrl: string | null;
  format: 'rss' | 'atom';
  entries: RawFeedEntry[];
}
