import type { SourceCategory } from './sources';

export interface Article {
  id: string;
  sourceId: string;
  sourceName: string;
  isOfficial: boolean;
  category: SourceCategory;
  title: string;
  canonicalUrl: string;
  originalFeedUrl: string;
  description: string | null;
  author: string | null;
  publishedAt: string | null;
  fetchedAt: string;
  summaryKind: 'source_snippet' | 'ai_generated';
  provenanceLabel: 'Primary source' | 'Independent reporting' | 'Preprint' | 'Official release';
  categories: string[];
  priorityScore?: number;
  priorityReasons?: string[];
}

export interface SourceHealthSummary {
  id: string;
  name: string;
  category: SourceCategory;
  feedUrl: string;
  isOfficial: boolean;
  enabled: boolean;
  status: 'healthy' | 'unhealthy';
  httpStatus: number | null;
  validEntriesCount: number;
  newestEntryPublishedAt: string | null;
  disabledReason?: string;
  suggestedAlternative?: string;
  checkedAt: string;
}

export interface NewspaperPageData {
  issueDate: string; // ISO or formatted date
  editionTitle: string;
  updatedAt: string;
  articles: Article[];
  sourceHealth: SourceHealthSummary[];
  partialFailureNotice?: string;
  warningNotice?: string;
  editionStatus?: 'building' | 'ready' | 'partial' | 'failed';
  isPreservedPreviousEdition?: boolean;
}
