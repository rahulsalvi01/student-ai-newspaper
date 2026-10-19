import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from './client';
import type {
  Database,
  SourceRow,
  SourceInsert,
  ArticleRow,
  ArticleInsert,
  EditionRow,
  EditionInsert,
  EditionStoryRow,
  EditionStoryInsert,
  GenerationRunRow,
  GenerationRunInsert,
  EditionStatus,
  SummaryKind,
  GenerationTrigger,
  GenerationStatus,
  SubscriberRow,
  SubscriberInsert,
} from '../../types/database';

/**
 * Validates that an article is legitimate and not a mock/demo placeholder.
 * Strict invariant from docs/07_AI_STUDENT_EDITORIAL_POLICY.md and docs/06_ANTIGRAVITY_BUILD_PLAN.md.
 */
export function isLegitimateRealArticle(article: ArticleInsert): boolean {
  if (!article.canonical_url || !article.title || !article.source_id) {
    return false;
  }

  const urlLower = article.canonical_url.toLowerCase();
  const titleLower = article.title.toLowerCase();

  // Explicitly reject synthetic, mock, or placeholder demo fixtures
  const blockedPatterns = [
    'example.com',
    'localhost',
    'placeholder',
    'demo story',
    'mock headline',
    'synthetic fixture',
    'test article',
    'sample card',
  ];

  for (const pattern of blockedPatterns) {
    if (urlLower.includes(pattern) || titleLower.includes(pattern)) {
      return false;
    }
  }

  // Must have a valid HTTP/HTTPS URL
  try {
    const parsed = new URL(article.canonical_url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

/**
 * Sources Repository
 */
export const sourcesRepo = {
  async upsertSources(
    sources: SourceInsert[],
    client: SupabaseClient<Database> | null = getSupabaseAdminClient()
  ): Promise<SourceRow[]> {
    if (!client || sources.length === 0) return [];

    const { data, error } = await client
      .from('sources')
      .upsert(sources, { onConflict: 'feed_url' })
      .select();

    if (error) {
      throw new Error(`Failed to upsert sources: ${error.message}`);
    }

    return data || [];
  },

  async getAllSources(
    client: SupabaseClient<Database> | null = getSupabaseAdminClient()
  ): Promise<SourceRow[]> {
    if (!client) return [];

    const { data, error } = await client
      .from('sources')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch sources: ${error.message}`);
    }

    return data || [];
  },

  async updateSourceHealth(
    feedUrl: string,
    health: { success: boolean; error?: string },
    client: SupabaseClient<Database> | null = getSupabaseAdminClient()
  ): Promise<void> {
    if (!client) return;

    const now = new Date().toISOString();
    const updatePayload = health.success
      ? {
          last_checked_at: now,
          last_success_at: now,
          last_error: null,
          enabled: true,
        }
      : {
          last_checked_at: now,
          last_error: health.error || 'Connection failed',
        };

    const { error } = await client
      .from('sources')
      .update(updatePayload)
      .eq('feed_url', feedUrl);

    if (error) {
      console.error(`Failed to update source health for ${feedUrl}:`, error.message);
    }
  },
};

/**
 * Articles Repository
 */
export const articlesRepo = {
  /**
   * Persists only articles actually retrieved from real sources.
   * Enforces canonical URL uniqueness (upsert on canonical_url).
   * Rejects demo, synthetic, or mock stories.
   */
  async persistRealArticles(
    articles: ArticleInsert[],
    client: SupabaseClient<Database> | null = getSupabaseAdminClient()
  ): Promise<ArticleRow[]> {
    if (!client || articles.length === 0) return [];

    // Filter out any invalid or demo fixtures
    const validRealArticles = articles.filter(isLegitimateRealArticle);

    if (validRealArticles.length === 0) {
      return [];
    }

    // Upsert on canonical_url unique constraint
    const { data, error } = await client
      .from('articles')
      .upsert(validRealArticles, {
        onConflict: 'canonical_url',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      throw new Error(`Failed to persist real articles: ${error.message}`);
    }

    return data || [];
  },

  async getRecentArticles(
    limit = 100,
    client: SupabaseClient<Database> | null = getSupabaseAdminClient()
  ): Promise<ArticleRow[]> {
    if (!client) return [];

    const { data, error } = await client
      .from('articles')
      .select('*')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch recent articles: ${error.message}`);
    }

    return data || [];
  },
};

/**
 * Editions Repository
 */
export const editionsRepo = {
  /**
   * Creates or gets an edition for an issue date and timezone.
   * Strictly enforces the unique constraint (issue_date, timezone) for idempotency.
   */
  async createOrGetIdempotentEdition(
    params: {
      issueDate: string; // YYYY-MM-DD
      timezone?: string;
      status?: EditionStatus;
      headline?: string | null;
      runId?: string | null;
    },
    client: SupabaseClient<Database> | null = getSupabaseAdminClient()
  ): Promise<EditionRow> {
    if (!client) {
      throw new Error('Supabase client is not configured.');
    }

    const timezone = params.timezone || 'Asia/Kolkata';

    // 1. Check if edition for this issue_date and timezone already exists
    const { data: existing, error: findError } = await client
      .from('editions')
      .select('*')
      .eq('issue_date', params.issueDate)
      .eq('timezone', timezone)
      .maybeSingle();

    if (findError) {
      throw new Error(`Error checking existing edition: ${findError.message}`);
    }

    if (existing) {
      return existing;
    }

    // 2. Otherwise insert new edition
    const insertPayload: EditionInsert = {
      issue_date: params.issueDate,
      timezone,
      status: params.status || 'building',
      headline: params.headline || null,
      generation_run_id: params.runId || null,
      generated_at: new Date().toISOString(),
      article_count: 0,
    };

    const { data, error } = await client
      .from('editions')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      // If concurrent insert occurred, fetch the existing one
      if (error.code === '23505') {
        const { data: retryExisting } = await client
          .from('editions')
          .select('*')
          .eq('issue_date', params.issueDate)
          .eq('timezone', timezone)
          .single();
        if (retryExisting) return retryExisting;
      }
      throw new Error(`Failed to create edition: ${error.message}`);
    }

    return data;
  },

  /**
   * Adds stories to an edition with ordered ranks and sections.
   * Enforces (edition_id, rank) and (edition_id, article_id) constraints.
   */
  async addStoriesToEdition(
    editionId: string,
    stories: {
      articleId: string;
      rank: number;
      section: string;
      summary?: string | null;
      summaryKind?: SummaryKind;
    }[],
    client: SupabaseClient<Database> | null = getSupabaseAdminClient()
  ): Promise<void> {
    if (!client || stories.length === 0) return;

    const payload: EditionStoryInsert[] = stories.map((s) => ({
      edition_id: editionId,
      article_id: s.articleId,
      rank: s.rank,
      section: s.section,
      summary: s.summary || null,
      summary_kind: s.summaryKind || 'source_snippet',
    }));

    const { error } = await client
      .from('edition_stories')
      .upsert(payload, { onConflict: 'edition_id,article_id' });

    if (error) {
      throw new Error(`Failed to add stories to edition: ${error.message}`);
    }

    // Update article count on edition
    await client
      .from('editions')
      .update({
        article_count: stories.length,
        status: 'ready',
        generated_at: new Date().toISOString(),
      })
      .eq('id', editionId);
  },

  async getLatestEdition(
    timezone = 'Asia/Kolkata',
    client: SupabaseClient<Database> | null = getSupabaseAdminClient()
  ): Promise<EditionRow | null> {
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('editions')
        .select('*')
        .eq('timezone', timezone)
        .in('status', ['ready', 'partial'])
        .order('issue_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('Could not fetch latest edition:', error.message);
        return null;
      }

      return data;
    } catch (err) {
      console.warn('Error querying latest edition:', err);
      return null;
    }
  },

  async getAllEditions(
    timezone = 'Asia/Kolkata',
    client: SupabaseClient<Database> | null = getSupabaseAdminClient()
  ): Promise<EditionRow[]> {
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('editions')
        .select('*')
        .eq('timezone', timezone)
        .in('status', ['ready', 'partial'])
        .order('issue_date', { ascending: false });

      if (error) {
        console.warn('Could not fetch editions list:', error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.warn('Error querying editions list:', err);
      return [];
    }
  },

  async getEditionByDate(
    issueDate: string,
    timezone = 'Asia/Kolkata',
    client: SupabaseClient<Database> | null = getSupabaseAdminClient()
  ): Promise<EditionRow | null> {
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('editions')
        .select('*')
        .eq('issue_date', issueDate)
        .eq('timezone', timezone)
        .maybeSingle();

      if (error) {
        console.warn(`Could not fetch edition for date ${issueDate}:`, error.message);
        return null;
      }

      return data;
    } catch (err) {
      console.warn(`Error querying edition for date ${issueDate}:`, err);
      return null;
    }
  },

  async getEditionWithStoriesByDate(
    issueDate: string,
    timezone = 'Asia/Kolkata',
    client: SupabaseClient<Database> | null = getSupabaseAdminClient()
  ): Promise<{
    edition: EditionRow;
    stories: (EditionStoryRow & { article: ArticleRow })[];
  } | null> {
    if (!client) return null;

    try {
      const edition = await this.getEditionByDate(issueDate, timezone, client);
      if (!edition) return null;

      const { data: stories, error } = await client
        .from('edition_stories')
        .select('*, article:articles(*)')
        .eq('edition_id', edition.id)
        .order('rank', { ascending: true });

      if (error) {
        console.warn(`Could not fetch edition stories:`, error.message);
        return null;
      }

      return {
        edition,
        stories: (stories as unknown as (EditionStoryRow & { article: ArticleRow })[]) || [],
      };
    } catch (err) {
      console.warn(`Error querying edition with stories:`, err);
      return null;
    }
  },
};

/**
 * Generation Runs Repository
 */
export const generationRunsRepo = {
  async startRun(
    trigger: GenerationTrigger,
    client: SupabaseClient<Database> | null = getSupabaseAdminClient()
  ): Promise<GenerationRunRow | null> {
    if (!client) return null;

    const payload: GenerationRunInsert = {
      trigger,
      status: 'running',
      started_at: new Date().toISOString(),
      feeds_attempted: 0,
      feeds_succeeded: 0,
      articles_ingested: 0,
    };

    const { data, error } = await client
      .from('generation_runs')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Failed to log generation run start:', error.message);
      return null;
    }

    return data;
  },

  async finishRun(
    id: string,
    result: {
      status: GenerationStatus;
      feedsAttempted: number;
      feedsSucceeded: number;
      articlesIngested: number;
      errorSummary?: string | null;
    },
    client: SupabaseClient<Database> | null = getSupabaseAdminClient()
  ): Promise<void> {
    if (!client) return;

    const { error } = await client
      .from('generation_runs')
      .update({
        status: result.status,
        finished_at: new Date().toISOString(),
        feeds_attempted: result.feedsAttempted,
        feeds_succeeded: result.feedsSucceeded,
        articles_ingested: result.articlesIngested,
        error_summary: result.errorSummary || null,
      })
      .eq('id', id);

    if (error) {
      console.error(`Failed to finish generation run ${id}:`, error.message);
    }
  },
};

/**
 * In-memory fallback storage for subscribers when database is not yet configured.
 * Preserves local development resilience.
 */
const inMemorySubscribers = new Map<string, SubscriberRow>();

/**
 * Subscribers Repository
 */
export const subscribersRepo = {
  /**
   * Adds or activates a subscriber.
   * Handles duplicate emails idempotently and normalizes whitespace/casing.
   */
  async addSubscriber(
    rawEmail: string,
    source = 'website',
    client: SupabaseClient<Database> | null = getSupabaseAdminClient()
  ): Promise<SubscriberRow> {
    const trimmed = rawEmail.trim();
    const normalized = trimmed.toLowerCase();
    const now = new Date().toISOString();

    if (client) {
      const payload: SubscriberInsert = {
        email: trimmed,
        normalized_email: normalized,
        status: 'active',
        source,
        updated_at: now,
      };

      const { data, error } = await client
        .from('subscribers')
        .upsert(payload, { onConflict: 'normalized_email' })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save subscriber: ${error.message}`);
      }

      return data;
    }

    // In-memory fallback
    const existing = inMemorySubscribers.get(normalized);
    if (existing) {
      existing.status = 'active';
      existing.updated_at = now;
      inMemorySubscribers.set(normalized, existing);
      return existing;
    }

    const newSubscriber: SubscriberRow = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      email: trimmed,
      normalized_email: normalized,
      status: 'active',
      source,
      created_at: now,
      updated_at: now,
    };
    inMemorySubscribers.set(normalized, newSubscriber);
    return newSubscriber;
  },

  /**
   * Retrieves all active subscribers' email addresses.
   */
  async getActiveSubscribers(
    client: SupabaseClient<Database> | null = getSupabaseAdminClient()
  ): Promise<string[]> {
    if (client) {
      const { data, error } = await client
        .from('subscribers')
        .select('email')
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to retrieve subscribers: ${error.message}`);
      }

      return (data || []).map((row) => row.email);
    }

    // In-memory fallback
    return Array.from(inMemorySubscribers.values())
      .filter((s) => s.status === 'active')
      .map((s) => s.email);
  },

  /**
   * Clear in-memory subscribers (primarily for unit tests).
   */
  clearInMemory(): void {
    inMemorySubscribers.clear();
  },
};
