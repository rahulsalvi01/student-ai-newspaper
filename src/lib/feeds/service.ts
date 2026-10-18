import { CANDIDATE_SOURCES, sourceRegistry } from './registry';
import { fetchFeedXml, parseFeedXml } from './parser';
import type { Article, NewspaperPageData, SourceHealthSummary } from '../../types/article';
import type { Source } from '../../types/sources';

// In-memory server cache to avoid hammering feeds on multiple page requests
let cachedData: NewspaperPageData | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

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
      provenanceLabel: source.isOfficial ? 'Official release' : 'Independent reporting',
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

export async function getLiveNewspaperData(options?: {
  forceFresh?: boolean;
}): Promise<NewspaperPageData> {
  const now = Date.now();
  if (!options?.forceFresh && cachedData && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedData;
  }

  const allSources = sourceRegistry.getAllSources();
  // To keep server response snappy and reliable, fetch only enabled/candidate sources
  // in small batches so we don't overwhelm network or hit rate limits
  const enabledSources = allSources.length > 0 ? allSources : CANDIDATE_SOURCES;

  const allArticles: Article[] = [];
  const sourceHealthList: SourceHealthSummary[] = [];
  const seenUrls = new Set<string>();

  // Fetch in batches of 4
  const batchSize = 4;
  for (let i = 0; i < enabledSources.length; i += batchSize) {
    const batch = enabledSources.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((s) => fetchArticlesFromSource(s)));

    for (const r of results) {
      sourceHealthList.push(r.health);
      for (const article of r.articles) {
        if (!seenUrls.has(article.canonicalUrl)) {
          seenUrls.add(article.canonicalUrl);
          allArticles.push(article);
        }
      }
    }
  }

  // Sort articles with publishedAt descending, undated at end
  allArticles.sort((a, b) => {
    if (!a.publishedAt && !b.publishedAt) return 0;
    if (!a.publishedAt) return 1;
    if (!b.publishedAt) return -1;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  const failedCount = sourceHealthList.filter((s) => s.status === 'unhealthy').length;
  const partialNotice =
    failedCount > 0 && allArticles.length > 0
      ? `Notice: ${failedCount} of ${sourceHealthList.length} sources could not be reached. Showing ${allArticles.length} verified stories from healthy sources.`
      : undefined;

  // Format today's date in Asia/Kolkata timezone
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const issueDate = formatter.format(new Date());

  const data: NewspaperPageData = {
    issueDate,
    editionTitle: 'AI & Computing Edition',
    updatedAt: new Date().toISOString(),
    articles: allArticles,
    sourceHealth: sourceHealthList,
    partialFailureNotice: partialNotice,
  };

  cachedData = data;
  lastCacheTime = now;

  return data;
}
