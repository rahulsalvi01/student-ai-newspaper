import { fetchFeedXml, parseFeedXml } from './parser';
import {
  runIngestionPipeline,
  getCachedEdition,
  getFormattedIssueDate,
  parseDateOnly,
} from '../generation/pipeline';
import { isDatabaseConfigured } from '../db/client';
import { editionsRepo, sourcesRepo } from '../db/repository';
import { sourceRegistry } from './registry';
import type { Article, NewspaperPageData, SourceHealthSummary } from '../../types/article';
import type { Source, SourceCategory } from '../../types/sources';

export async function fetchArticlesFromSource(source: Source): Promise<{
  articles: Article[];
  health: SourceHealthSummary;
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
 * Retrieves the published daily newspaper edition from persistence.
 * Strictly avoids live scraping on page load.
 * Live feed fetching is confined to the scheduled 07:00 AM IST automation run
 * (or explicit manual trigger via POST /api/generate).
 */
export async function getPublishedNewspaperData(options?: {
  timezone?: string;
  limit?: number;
}): Promise<NewspaperPageData> {
  const timezone = options?.timezone || 'Asia/Kolkata';
  const limit = options?.limit ?? 100;
  const candidateSources = sourceRegistry.getAllSources();

  // 1. If database is configured, load the latest persisted ready/partial edition
  if (isDatabaseConfigured()) {
    try {
      const latestEdition = await editionsRepo.getLatestEdition(timezone);

      if (latestEdition) {
        const editionWithStories = await editionsRepo.getEditionWithStoriesByDate(
          latestEdition.issue_date,
          timezone
        );

        if (editionWithStories && editionWithStories.stories.length > 0) {
          const allDbSources = await sourcesRepo.getAllSources().catch(() => []);
          const dbSourceMap = new Map(allDbSources.map((s) => [s.id, s]));
          const candidateMap = new Map(candidateSources.map((s) => [s.feedUrl, s]));

          const articles: Article[] = editionWithStories.stories.slice(0, limit).map((story, idx) => {
            const art = story.article;
            const dbSrc = dbSourceMap.get(art.source_id);
            const cand = dbSrc ? candidateMap.get(dbSrc.feed_url) : undefined;
            const sourceName = dbSrc?.name || cand?.name || 'Verified Source';
            const isOfficial = cand?.isOfficial ?? false;
            const isArxiv =
              sourceName.toLowerCase().includes('arxiv') ||
              (art.canonical_url && art.canonical_url.includes('arxiv.org'));

            return {
              id: art.id,
              sourceId: cand?.id || art.source_id,
              sourceName,
              isOfficial,
              category: (story.section as SourceCategory) || (art.category as SourceCategory) || 'general_ai',
              title: art.title,
              canonicalUrl: art.canonical_url,
              originalFeedUrl: dbSrc?.feed_url || art.canonical_url,
              description: story.summary || art.description || '',
              author: art.author || null,
              publishedAt: art.published_at || null,
              fetchedAt: art.fetched_at || latestEdition.generated_at || new Date().toISOString(),
              summaryKind: story.summary_kind === 'ai_generated' ? 'ai_generated' : 'source_snippet',
              provenanceLabel: isArxiv
                ? 'Preprint'
                : isOfficial
                ? 'Official release'
                : 'Independent reporting',
              categories: [story.section],
              priorityScore: 100 - idx,
            };
          });

          // Build source health overview from persisted sources
          const sourceHealth: SourceHealthSummary[] = candidateSources.map((cs) => {
            const dbSource = allDbSources.find((s) => s.feed_url === cs.feedUrl);
            const isHealthy = dbSource ? dbSource.last_error === null : true;
            return {
              id: cs.id,
              name: cs.name,
              category: cs.category,
              feedUrl: cs.feedUrl,
              isOfficial: cs.isOfficial,
              enabled: dbSource ? dbSource.enabled : cs.enabled,
              status: isHealthy ? 'healthy' : 'unhealthy',
              httpStatus: isHealthy ? 200 : null,
              validEntriesCount: articles.filter((a) => a.originalFeedUrl === cs.feedUrl).length,
              newestEntryPublishedAt: null,
              disabledReason: dbSource?.last_error || undefined,
              checkedAt: dbSource?.last_checked_at || latestEdition.generated_at || new Date().toISOString(),
            };
          });

          const issueDateFormatted = getFormattedIssueDate(
            parseDateOnly(latestEdition.issue_date),
            timezone
          );

          return {
            issueDate: issueDateFormatted,
            editionTitle: latestEdition.headline || 'The Daily AI Brief',
            updatedAt: latestEdition.generated_at || latestEdition.created_at || new Date().toISOString(),
            articles,
            sourceHealth,
            editionStatus: latestEdition.status,
            isPreservedPreviousEdition: false,
          };
        }
      }
    } catch (err) {
      console.warn('Could not query database for published edition:', err);
    }
  }

  // 2. Check in-memory cache if DB had no edition or threw
  const cached = getCachedEdition();
  if (cached && cached.articles.length > 0) {
    return cached;
  }

  // 3. If database is configured but no edition exists yet, return an honest waiting state.
  // We do NOT perform live scraping on user page visit.
  if (isDatabaseConfigured()) {
    const formattedDate = getFormattedIssueDate(new Date(), timezone);
    return {
      issueDate: formattedDate,
      editionTitle: 'The Daily AI Brief',
      updatedAt: new Date().toISOString(),
      articles: [],
      sourceHealth: candidateSources.map((cs) => ({
        id: cs.id,
        name: cs.name,
        category: cs.category,
        feedUrl: cs.feedUrl,
        isOfficial: cs.isOfficial,
        enabled: cs.enabled,
        status: 'healthy',
        httpStatus: 200,
        validEntriesCount: 0,
        newestEntryPublishedAt: null,
        checkedAt: new Date().toISOString(),
      })),
      editionStatus: 'ready',
      warningNotice:
        'Notice: Today’s edition is scheduled to generate at 07:00 AM IST before daily link dispatch. No edition has been generated yet for this date.',
      isPreservedPreviousEdition: false,
    };
  }

  // 4. In development mode without a database configured, run initial local ingestion once
  const localDevResult = await runIngestionPipeline({ forceFresh: false, limit });
  return localDevResult.edition;
}

export async function getLiveNewspaperData(options?: {
  forceFresh?: boolean;
  limit?: number;
  timezone?: string;
}): Promise<NewspaperPageData> {
  if (options?.forceFresh) {
    const result = await runIngestionPipeline(options);
    return result.edition;
  }
  return getPublishedNewspaperData(options);
}
