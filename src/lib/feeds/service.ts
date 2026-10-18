import { fetchFeedXml, parseFeedXml } from './parser';
import { runIngestionPipeline } from '../generation/pipeline';
import type { Article, NewspaperPageData, SourceHealthSummary } from '../../types/article';
import type { Source } from '../../types/sources';

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

export async function getLiveNewspaperData(options?: {
  forceFresh?: boolean;
  limit?: number;
}): Promise<NewspaperPageData> {
  const result = await runIngestionPipeline(options);
  return result.edition;
}
