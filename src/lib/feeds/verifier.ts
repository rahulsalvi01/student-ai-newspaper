import { fetchFeedXml, parseFeedXml } from './parser';
import { sourceRegistry } from './registry';
import type { Source, FeedHealthResult } from '../../types/sources';

export async function verifySingleFeed(
  source: Source,
  options?: { timeoutMs?: number; maxSizeBytes?: number }
): Promise<FeedHealthResult> {
  const checkedAt = new Date().toISOString();

  try {
    const { xmlContent, responseTimeMs, contentType, httpStatus } = await fetchFeedXml(
      source.feedUrl,
      options
    );

    const parsed = parseFeedXml(xmlContent, source.feedUrl);

    if (parsed.entries.length === 0) {
      return {
        status: 'unhealthy',
        httpStatus,
        contentType,
        validEntriesCount: 0,
        newestEntryPublishedAt: null,
        exampleArticleUrl: null,
        sampleArticleTitle: null,
        responseTimeMs,
        error: 'Feed parsed successfully but returned 0 valid entries',
        checkedAt,
      };
    }

    // Sort entries to find newest publication date
    const sortedWithDates = parsed.entries
      .filter((e) => e.publishedAt)
      .sort((a, b) => new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime());

    const newestDate = sortedWithDates[0]?.publishedAt ?? null;
    const sampleEntry = parsed.entries[0];

    return {
      status: 'healthy',
      httpStatus,
      contentType,
      validEntriesCount: parsed.entries.length,
      newestEntryPublishedAt: newestDate,
      exampleArticleUrl: sampleEntry.url,
      sampleArticleTitle: sampleEntry.title,
      responseTimeMs,
      error: null,
      checkedAt,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      status: 'unhealthy',
      httpStatus: null,
      contentType: null,
      validEntriesCount: 0,
      newestEntryPublishedAt: null,
      exampleArticleUrl: null,
      sampleArticleTitle: null,
      responseTimeMs: 0,
      error: errorMessage,
      checkedAt,
    };
  }
}

export async function verifyAllSources(
  sources: Source[] = sourceRegistry.getAllSources(),
  options?: { timeoutMs?: number; batchSize?: number }
): Promise<{ source: Source; health: FeedHealthResult }[]> {
  const results: { source: Source; health: FeedHealthResult }[] = [];
  const batchSize = options?.batchSize ?? 4;

  for (let i = 0; i < sources.length; i += batchSize) {
    const batch = sources.slice(i, i + batchSize);
    const batchPromises = batch.map(async (source) => {
      const health = await verifySingleFeed(source, { timeoutMs: options?.timeoutMs });
      sourceRegistry.updateHealthResult(source.id, health);
      return { source, health };
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}
