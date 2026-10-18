/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  PreferencesSchema,
  EditionDateParamSchema,
  DEFAULT_PREFERENCES,
} from '../src/lib/preferences/schema';
import {
  getPreferences,
  updatePreferences,
  resetPreferencesForTesting,
} from '../src/lib/preferences/service';

describe('Preferences & Zod Validation Tests', () => {
  beforeEach(() => {
    resetPreferencesForTesting();
  });

  it('validates default preferences successfully with Zod', () => {
    const result = PreferencesSchema.safeParse(DEFAULT_PREFERENCES);
    expect(result.success).toBe(true);
  });

  it('rejects daily story limits below 5 or above 100', () => {
    const tooLow = PreferencesSchema.safeParse({
      ...DEFAULT_PREFERENCES,
      dailyStoryLimit: 4,
    });
    expect(tooLow.success).toBe(false);
    if (!tooLow.success) {
      expect(tooLow.error.errors[0].message).toContain('between 5 and 100');
    }

    const tooHigh = PreferencesSchema.safeParse({
      ...DEFAULT_PREFERENCES,
      dailyStoryLimit: 101,
    });
    expect(tooHigh.success).toBe(false);
    if (!tooHigh.success) {
      expect(tooHigh.error.errors[0].message).toContain('between 5 and 100');
    }
  });

  it('rejects invalid or non-whitelisted topic identifiers', () => {
    const invalidTopic = PreferencesSchema.safeParse({
      ...DEFAULT_PREFERENCES,
      topics: ['celebrity_lifestyle' as any],
    });
    expect(invalidTopic.success).toBe(false);
  });

  it('successfully updates and retrieves reader preferences', async () => {
    const update = await updatePreferences({
      displayName: 'Systems Engineer',
      dailyStoryLimit: 50,
      timezone: 'Asia/Kolkata',
      topics: ['models_releases', 'developer_tools'],
      emailEnabled: true,
    });

    expect(update.success).toBe(true);
    expect(update.data?.dailyStoryLimit).toBe(50);
    expect(update.data?.topics).toEqual(['models_releases', 'developer_tools']);

    const current = await getPreferences();
    expect(current.dailyStoryLimit).toBe(50);
    expect(current.emailEnabled).toBe(true);
  });

  it('EditionDateParamSchema strictly validates YYYY-MM-DD format', () => {
    expect(EditionDateParamSchema.safeParse('2026-10-18').success).toBe(true);
    expect(EditionDateParamSchema.safeParse('18-10-2026').success).toBe(false);
    expect(EditionDateParamSchema.safeParse('2026/10/18').success).toBe(false);
    expect(EditionDateParamSchema.safeParse('invalid-date').success).toBe(false);
  });
});
