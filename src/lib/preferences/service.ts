import {
  PreferencesSchema,
  DEFAULT_PREFERENCES,
  type UserPreferences,
} from './schema';
import { isDatabaseConfigured, getSupabaseAdminClient } from '../db/client';

// In-memory fallback for local personal usage without DB
let inMemoryPreferences: UserPreferences = { ...DEFAULT_PREFERENCES };

/**
 * Retrieves the current reader preferences.
 * Reads from Supabase profiles if configured; otherwise returns in-memory state.
 */
export async function getPreferences(userId?: string): Promise<UserPreferences> {
  if (isDatabaseConfigured() && userId) {
    const client = getSupabaseAdminClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (!error && data) {
          const parsed = PreferencesSchema.safeParse({
            displayName: data.display_name || '',
            timezone: data.timezone,
            language: data.language,
            topics: data.topics,
            regions: data.regions,
            dailyStoryLimit: data.daily_story_limit,
            emailEnabled: data.email_enabled,
          });

          if (parsed.success) {
            return parsed.data;
          }
        }
      } catch (err) {
        console.warn('Could not load preferences from database, using fallback:', err);
      }
    }
  }

  return inMemoryPreferences;
}

/**
 * Validates with Zod and updates the reader preferences.
 */
export async function updatePreferences(
  input: unknown,
  userId?: string
): Promise<{ success: boolean; data?: UserPreferences; errors?: string[] }> {
  const result = PreferencesSchema.safeParse(input);

  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    return {
      success: false,
      errors: errorMessages,
    };
  }

  const validPreferences = result.data;

  if (isDatabaseConfigured() && userId) {
    const client = getSupabaseAdminClient();
    if (client) {
      try {
        const { error } = await client.from('profiles').upsert({
          id: userId,
          display_name: validPreferences.displayName || null,
          timezone: validPreferences.timezone,
          language: validPreferences.language,
          topics: validPreferences.topics,
          regions: validPreferences.regions,
          daily_story_limit: validPreferences.dailyStoryLimit,
          email_enabled: validPreferences.emailEnabled,
          updated_at: new Date().toISOString(),
        });

        if (error) {
          console.error('Database profile update error:', error.message);
        }
      } catch (err) {
        console.warn('Failed to persist preferences to Supabase:', err);
      }
    }
  }

  // Update in-memory fallback
  inMemoryPreferences = validPreferences;

  return {
    success: true,
    data: validPreferences,
  };
}

/**
 * Reset preferences (used for testing).
 */
export function resetPreferencesForTesting(): void {
  inMemoryPreferences = { ...DEFAULT_PREFERENCES };
}
