import { sourceRegistry } from '../feeds/registry';
import { fetchFeedXml, parseFeedXml } from '../feeds/parser';
import { prioritizeArticles } from '../news/prioritizer';
import { enrichArticlesWithAiSummaries } from '../news/summary-service';
import { isDatabaseConfigured } from '../db/client';
import {
  sourcesRepo,
  articlesRepo,
  editionsRepo,
  generationRunsRepo,
} from '../db/repository';
import type { Article, NewspaperPageData, SourceHealthSummary } from '../../types/article';
import type { Source, SourceCategory } from '../../types/sources';
import type { EditionStatus, SummaryKind } from '../../types/database';

export interface IngestionOptions {
  forceFresh?: boolean;
  limit?: number;
  maxAgeDays?: number; // Freshness window cutoff in days (default: 30)
  timezone?: string; // Default: 'Asia/Kolkata'
  issueDate?: string; // Optional target issue date in YYYY-MM-DD
  trigger?: 'scheduled' | 'manual';
  sources?: Source[]; // Optional override for testing
}

export interface IngestionResult {
  edition: NewspaperPageData;
  stats: {
    feedsAttempted: number;
    feedsSucceeded: number;
    feedsFailed: number;
    rawArticlesFetched: number;
    duplicatesRemoved: number;
    staleArticlesRemoved: number;
    qualifyingArticlesCount: number;
    persistedArticlesCount: number;
  };
}

// In-memory cache for fast lookups and all-source failure fallback
let lastGoodEditionCache: NewspaperPageData | null = null;
let cachedData: NewspaperPageData | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

/**
 * Normalizes title for deduplication comparison.
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Format a Date object into YYYY-MM-DD for a specific timezone.
 */
export function getIssueDateString(date: Date = new Date(), timezone = 'Asia/Kolkata'): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // outputs YYYY-MM-DD
}

/**
 * Parse a YYYY-MM-DD string into a midday UTC Date object.
 */
export function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (y && m && d) {
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  }
  return new Date();
}

/**
 * Format a human-readable issue date for a specific timezone.
 */
export function getFormattedIssueDate(date: Date = new Date(), timezone = 'Asia/Kolkata'): string {
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return formatter.format(date);
}

/**
 * Single-source fetcher with comprehensive error isolation.
 * A failure on one source will NEVER block or throw for other sources.
 */
export async function fetchFromSingleSource(source: Source): Promise<{
  articles: Article[];
  health: SourceHealthSummary;
  success: boolean;
}> {
  const checkedAt = new Date().toISOString();

  try {
    const { xmlContent, httpStatus } = await fetchFeedXml(source.feedUrl, {
      timeoutMs: 8000,
      maxSizeBytes: 5 * 1024 * 1024,
    });

    const parsed = parseFeedXml(xmlContent, source.feedUrl);

    if (parsed.entries.length === 0) {
      return {
        articles: [],
        success: false,
        health: {
          id: source.id,
          name: source.name,
          category: source.category,
          feedUrl: source.feedUrl,
          isOfficial: source.isOfficial,
          enabled: false,
          status: 'unhealthy',
          httpStatus,
          validEntriesCount: 0,
          newestEntryPublishedAt: null,
          disabledReason: 'Feed parsed successfully but contained 0 entries',
          checkedAt,
        },
      };
    }

    const fetchedAt = new Date().toISOString();
    const articles: Article[] = parsed.entries.map((entry) => ({
      id: `${source.id}-${encodeURIComponent(entry.url)}`,
      sourceId: source.id,
      sourceName: source.name,
      isOfficial: source.isOfficial,
      category: source.category,
      title: entry.title,
      canonicalUrl: entry.url,
      originalFeedUrl: source.feedUrl,
      description: entry.description,
      author: entry.author,
      publishedAt: entry.publishedAt,
      fetchedAt,
      summaryKind: 'source_snippet',
      provenanceLabel: source.id.startsWith('arxiv')
        ? 'Preprint'
        : source.isOfficial
        ? 'Official release'
        : 'Independent reporting',
      categories: entry.categories,
    }));

    const sortedDates = articles
      .filter((a) => a.publishedAt)
      .sort((a, b) => new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime());

    return {
      articles,
      success: true,
      health: {
        id: source.id,
        name: source.name,
        category: source.category,
        feedUrl: source.feedUrl,
        isOfficial: source.isOfficial,
        enabled: true,
        status: 'healthy',
        httpStatus,
        validEntriesCount: articles.length,
        newestEntryPublishedAt: sortedDates[0]?.publishedAt ?? null,
        checkedAt,
      },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      articles: [],
      success: false,
      health: {
        id: source.id,
        name: source.name,
        category: source.category,
        feedUrl: source.feedUrl,
        isOfficial: source.isOfficial,
        enabled: false,
        status: 'unhealthy',
        httpStatus: null,
        validEntriesCount: 0,
        newestEntryPublishedAt: null,
        disabledReason: errorMsg,
        checkedAt,
      },
    };
  }
}

/**
 * Execute the complete live ingestion pipeline.
 */
export async function runIngestionPipeline(
  options?: IngestionOptions
): Promise<IngestionResult> {
  const timezone = options?.timezone || 'Asia/Kolkata';
  const trigger = options?.trigger || 'manual';
  const limit = options?.limit ?? 100;
  const maxAgeDays = options?.maxAgeDays ?? 30;
  const now = Date.now();
  const targetDate = options?.issueDate ? parseDateOnly(options.issueDate) : new Date();
  const rawIssueDate = options?.issueDate || getIssueDateString(targetDate, timezone);
  const formattedIssueDate = getFormattedIssueDate(targetDate, timezone);

  // In-memory cache check (only when not forced and for current issue date)
  if (!options?.forceFresh && !options?.issueDate && cachedData && now - lastCacheTime < CACHE_TTL_MS) {
    return {
      edition: cachedData,
      stats: {
        feedsAttempted: cachedData.sourceHealth.length,
        feedsSucceeded: cachedData.sourceHealth.filter((s) => s.status === 'healthy').length,
        feedsFailed: cachedData.sourceHealth.filter((s) => s.status === 'unhealthy').length,
        rawArticlesFetched: cachedData.articles.length,
        duplicatesRemoved: 0,
        staleArticlesRemoved: 0,
        qualifyingArticlesCount: cachedData.articles.length,
        persistedArticlesCount: cachedData.articles.length,
      },
    };
  }

  // 1. Select candidate sources that are enabled and not permanently unhealthy
  const candidateSources = options?.sources || sourceRegistry.getEnabledSources();
  const sourcesToFetch = candidateSources.filter(
    (s) => s.enabled && s.lastHealthResult?.status !== 'unhealthy'
  );
  const activeSources = sourcesToFetch.length > 0 ? sourcesToFetch : candidateSources;

  // 2. Start generation run record if database is configured
  let runId: string | null = null;
  if (isDatabaseConfigured()) {
    try {
      const run = await generationRunsRepo.startRun(trigger);
      runId = run?.id || null;

      // Upsert sources to database
      const sourceInserts = activeSources.map((s) => ({
        name: s.name,
        feed_url: s.feedUrl,
        category: s.category,
        language: s.language || 'en',
        enabled: s.enabled,
      }));
      await sourcesRepo.upsertSources(sourceInserts);
    } catch (err) {
      console.warn('Could not start generation run audit log:', err);
    }
  }

  const rawArticles: Article[] = [];
  const sourceHealthList: SourceHealthSummary[] = [];
  let feedsAttempted = 0;
  let feedsSucceeded = 0;
  let feedsFailed = 0;

  // 3. Concurrently fetch enabled sources in small batches (4 at a time)
  const batchSize = 4;
  for (let i = 0; i < activeSources.length; i += batchSize) {
    const batch = activeSources.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((s) => fetchFromSingleSource(s)));

    for (const r of results) {
      feedsAttempted++;
      sourceHealthList.push(r.health);
      if (r.success) {
        feedsSucceeded++;
        rawArticles.push(...r.articles);
      } else {
        feedsFailed++;
      }
    }
  }

  // 4. Handle All-Sources Failure: preserve previous good edition if all feeds failed
  if (feedsAttempted > 0 && feedsSucceeded === 0) {
    // Attempt to recover previous edition from memory cache or DB
    let previousEdition: NewspaperPageData | null = lastGoodEditionCache;

    if (!previousEdition && isDatabaseConfigured()) {
      try {
        const dbEdition = await editionsRepo.getLatestEdition(timezone);
        if (dbEdition) {
          const recentArticles = await articlesRepo.getRecentArticles(limit);
          previousEdition = {
            issueDate: dbEdition.issue_date,
            editionTitle: dbEdition.headline || 'AI & Computing Edition',
            updatedAt: dbEdition.generated_at || new Date().toISOString(),
            articles: recentArticles.map((a) => ({
              id: a.id,
              sourceId: a.source_id,
              sourceName: 'Archived Story',
              isOfficial: false,
              category: (a.category as SourceCategory) || 'general_ai',
              title: a.title,
              canonicalUrl: a.canonical_url,
              originalFeedUrl: a.canonical_url,
              description: a.description,
              author: a.author,
              publishedAt: a.published_at,
              fetchedAt: a.fetched_at,
              summaryKind: 'source_snippet',
              provenanceLabel: 'Independent reporting',
              categories: [],
            })),
            sourceHealth: sourceHealthList,
            editionStatus: 'failed',
          };
        }
      } catch (err) {
        console.warn('Could not query database for previous edition:', err);
      }
    }

    if (previousEdition) {
      const preserved: NewspaperPageData = {
        ...previousEdition,
        sourceHealth: sourceHealthList,
        isPreservedPreviousEdition: true,
        editionStatus: 'partial',
        warningNotice: `Warning: Live fetch failed for all sources. Preserving and displaying the previous verified edition from ${previousEdition.issueDate}.`,
      };

      if (runId && isDatabaseConfigured()) {
        await generationRunsRepo.finishRun(runId, {
          status: 'partial',
          feedsAttempted,
          feedsSucceeded,
          articlesIngested: 0,
          errorSummary: 'All live sources failed; preserved previous good edition.',
        });
      }

      return {
        edition: preserved,
        stats: {
          feedsAttempted,
          feedsSucceeded,
          feedsFailed,
          rawArticlesFetched: 0,
          duplicatesRemoved: 0,
          staleArticlesRemoved: 0,
          qualifyingArticlesCount: preserved.articles.length,
          persistedArticlesCount: 0,
        },
      };
    } else {
      // No previous edition exists: publish honest empty failed edition
      const failedEmpty: NewspaperPageData = {
        issueDate: formattedIssueDate,
        editionTitle: 'AI & Computing Edition',
        updatedAt: new Date().toISOString(),
        articles: [],
        sourceHealth: sourceHealthList,
        editionStatus: 'failed',
        warningNotice:
          'Live fetch failed for all sources and no previous edition is available. Real sources only: no fabricated content is displayed.',
      };

      if (runId && isDatabaseConfigured()) {
        await generationRunsRepo.finishRun(runId, {
          status: 'failed',
          feedsAttempted,
          feedsSucceeded,
          articlesIngested: 0,
          errorSummary: 'All live sources failed and no previous edition exists.',
        });
      }

      return {
        edition: failedEmpty,
        stats: {
          feedsAttempted,
          feedsSucceeded,
          feedsFailed,
          rawArticlesFetched: 0,
          duplicatesRemoved: 0,
          staleArticlesRemoved: 0,
          qualifyingArticlesCount: 0,
          persistedArticlesCount: 0,
        },
      };
    }
  }

  // 5. Freshness window and canonical URL/title deduplication
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const freshArticles: Article[] = [];
  let duplicatesRemoved = 0;
  let staleArticlesRemoved = 0;

  for (const article of rawArticles) {
    // Freshness filter: omit stale articles older than cutoff
    if (article.publishedAt) {
      const pubTime = new Date(article.publishedAt).getTime();
      if (!isNaN(pubTime) && now - pubTime > maxAgeMs) {
        staleArticlesRemoved++;
        continue;
      }
    }

    const normUrl = article.canonicalUrl.toLowerCase().trim();
    const normTitle = normalizeTitle(article.title);

    // Deduplication check
    if (normUrl && seenUrls.has(normUrl)) {
      duplicatesRemoved++;
      continue;
    }
    if (normTitle && seenTitles.has(normTitle)) {
      duplicatesRemoved++;
      continue;
    }

    if (normUrl) seenUrls.add(normUrl);
    if (normTitle) seenTitles.add(normTitle);
    freshArticles.push(article);
  }

  // 6. Rank for usefulness to an IT student using editorial scoring engine
  const prioritized = prioritizeArticles(freshArticles, limit);

  // 6.5 Optional AI Summaries: enrich top stories if AI provider is enabled (graceful fallback)
  try {
    await enrichArticlesWithAiSummaries(prioritized);
  } catch (aiErr) {
    console.warn('AI summary enrichment encountered an error; falling back to source snippets:', aiErr);
  }

  // 7. Status evaluation
  let editionStatus: EditionStatus = 'ready';
  let partialFailureNotice: string | undefined = undefined;

  if (feedsFailed > 0) {
    editionStatus = prioritized.length > 0 ? 'partial' : 'failed';
    partialFailureNotice = `Notice: ${feedsFailed} of ${feedsAttempted} sources could not be reached. Showing ${prioritized.length} verified stories from healthy sources.`;
  }

  const editionData: NewspaperPageData = {
    issueDate: formattedIssueDate,
    editionTitle: 'AI & Computing Edition',
    updatedAt: new Date().toISOString(),
    articles: prioritized,
    sourceHealth: sourceHealthList,
    partialFailureNotice,
    editionStatus,
    isPreservedPreviousEdition: false,
  };

  // 8. Persist real source metadata and original links if DB configured
  let persistedArticlesCount = 0;
  if (isDatabaseConfigured()) {
    try {
      // Fetch registered sources from DB to obtain their genuine database UUIDs
      const dbSources = await sourcesRepo.getAllSources();
      const sourceUrlToIdMap = new Map<string, string>();
      for (const s of dbSources) {
        sourceUrlToIdMap.set(s.feed_url, s.id);
      }
      const defaultSourceId = dbSources[0]?.id;

      // Persist articles with genuine source UUID foreign keys
      const articleInserts = prioritized.map((a) => ({
        source_id: sourceUrlToIdMap.get(a.originalFeedUrl) || defaultSourceId || a.sourceId,
        canonical_url: a.canonicalUrl,
        title: a.title,
        description: a.description,
        author: a.author,
        published_at: a.publishedAt,
        fetched_at: a.fetchedAt,
        category: a.category,
      }));

      const persistedArticles = await articlesRepo.persistRealArticles(articleInserts);
      persistedArticlesCount = persistedArticles.length;

      // Persist idempotent edition
      const dbEdition = await editionsRepo.createOrGetIdempotentEdition({
        issueDate: rawIssueDate,
        timezone,
        status: editionStatus,
        headline: 'The Daily AI Brief',
        runId,
      });

      // Add ranked stories to edition preserving the exact prioritized rank order
      if (persistedArticles.length > 0) {
        const editionStories = prioritized
          .map((p, idx) => {
            const dbArt = persistedArticles.find((art) => art.canonical_url === p.canonicalUrl);
            if (!dbArt) return null;
            return {
              articleId: dbArt.id,
              rank: idx + 1,
              section: p.category || dbArt.category || 'general_ai',
              summary: p.description || dbArt.description,
              summaryKind: (p.summaryKind || 'source_snippet') as SummaryKind,
            };
          })
          .filter((s): s is NonNullable<typeof s> => s !== null);

        if (editionStories.length > 0) {
          await editionsRepo.addStoriesToEdition(dbEdition.id, editionStories);
        }
      }

      if (runId) {
        await generationRunsRepo.finishRun(runId, {
          status: editionStatus === 'ready' ? 'succeeded' : 'partial',
          feedsAttempted,
          feedsSucceeded,
          articlesIngested: persistedArticlesCount,
          errorSummary: partialFailureNotice || null,
        });
      }
    } catch (dbErr) {
      console.warn('Database persistence encountered a non-fatal error:', dbErr);
    }
  }

  // Update in-memory caches
  if (prioritized.length > 0) {
    lastGoodEditionCache = editionData;
  }
  cachedData = editionData;
  lastCacheTime = now;

  return {
    edition: editionData,
    stats: {
      feedsAttempted,
      feedsSucceeded,
      feedsFailed,
      rawArticlesFetched: rawArticles.length,
      duplicatesRemoved,
      staleArticlesRemoved,
      qualifyingArticlesCount: prioritized.length,
      persistedArticlesCount,
    },
  };
}

/**
 * Reset memory caches (used for unit testing).
 */
export function resetPipelineCaches(): void {
  lastGoodEditionCache = null;
  cachedData = null;
  lastCacheTime = 0;
}

/**
 * Set a simulated previous good edition in memory (used for testing all-source failure fallback).
 */
export function setSimulatedLastGoodEdition(edition: NewspaperPageData): void {
  lastGoodEditionCache = edition;
}

/**
 * Get active in-memory cached edition if available.
 */
export function getCachedEdition(): NewspaperPageData | null {
  return cachedData || lastGoodEditionCache;
}
