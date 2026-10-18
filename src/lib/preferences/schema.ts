import { z } from 'zod';

export const VALID_TOPICS = [
  'models_releases',
  'developer_tools',
  'open_source',
  'research',
  'industry_infrastructure',
  'student_action',
  'general_ai',
] as const;

export type ValidTopic = typeof VALID_TOPICS[number];

export const PreferencesSchema = z.object({
  displayName: z.string().trim().max(100).optional().default(''),
  timezone: z.string().trim().min(1).default('Asia/Kolkata'),
  language: z.enum(['en', 'hi', 'ta', 'te', 'bn']).default('en'),
  topics: z
    .array(z.enum(VALID_TOPICS))
    .default(['models_releases', 'developer_tools', 'open_source', 'research']),
  regions: z.array(z.string().trim()).default([]),
  dailyStoryLimit: z
    .number()
    .int('Story limit must be an integer')
    .min(5, 'Daily story limit must be between 5 and 100')
    .max(100, 'Daily story limit must be between 5 and 100')
    .default(30),
  emailEnabled: z.boolean().default(false),
});

export type UserPreferences = z.infer<typeof PreferencesSchema>;

export const EditionDateParamSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format: must be YYYY-MM-DD');

export const DEFAULT_PREFERENCES: UserPreferences = {
  displayName: 'IT Student',
  timezone: 'Asia/Kolkata',
  language: 'en',
  topics: ['models_releases', 'developer_tools', 'open_source', 'research'],
  regions: [],
  dailyStoryLimit: 30,
  emailEnabled: false,
};
