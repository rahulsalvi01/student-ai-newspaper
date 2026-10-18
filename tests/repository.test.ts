/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  isLegitimateRealArticle,
  articlesRepo,
  editionsRepo,
} from '../src/lib/db/repository';
import { getSupabaseAdminClient } from '../src/lib/db/client';
import type { ArticleInsert } from '../src/types/database';

describe('Supabase Database Schema & Migration Verification', () => {
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/20261018000000_initial_schema.sql');

  it('migration file exists and contains all required TRD tables', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    expect(sql).toContain('create table if not exists public.profiles');
    expect(sql).toContain('create table if not exists public.sources');
    expect(sql).toContain('create table if not exists public.articles');
    expect(sql).toContain('create table if not exists public.editions');
    expect(sql).toContain('create table if not exists public.edition_stories');
    expect(sql).toContain('create table if not exists public.generation_runs');
    expect(sql).toContain('create table if not exists public.delivery_logs');
  });

  it('migration enforces unique canonical_url and idempotent edition dates', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // canonical_url unique constraint
    expect(sql).toMatch(/canonical_url\s+text\s+not\s+null\s+unique/i);

    // idempotent edition date & timezone unique constraint
    expect(sql).toMatch(/constraint\s+uq_editions_issue_date_timezone\s+unique\s*\(issue_date,\s*timezone\)/i);

    // edition stories primary key & unique rank
    expect(sql).toMatch(/primary\s+key\s*\(edition_id,\s*article_id\)/i);
    expect(sql).toMatch(/constraint\s+uq_edition_stories_edition_rank\s+unique\s*\(edition_id,\s*rank\)/i);
  });

  it('migration enables Row Level Security (RLS) on all tables', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    expect(sql).toContain('alter table public.profiles enable row level security;');
    expect(sql).toContain('alter table public.sources enable row level security;');
    expect(sql).toContain('alter table public.articles enable row level security;');
    expect(sql).toContain('alter table public.editions enable row level security;');
    expect(sql).toContain('alter table public.edition_stories enable row level security;');
    expect(sql).toContain('alter table public.generation_runs enable row level security;');
    expect(sql).toContain('alter table public.delivery_logs enable row level security;');
  });

  it('migration includes performance indexes specified in TRD', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    expect(sql).toContain('idx_articles_published_at');
    expect(sql).toContain('idx_articles_source_id');
    expect(sql).toContain('idx_edition_stories_edition_rank');
    expect(sql).toContain('idx_generation_runs_started_at');
  });
});

describe('Real-News-Only Invariant Enforcement', () => {
  it('accepts legitimate articles from real publishers', () => {
    const realArticle: ArticleInsert = {
      source_id: '11111111-1111-1111-1111-111111111111',
      canonical_url: 'https://openai.com/news/gpt-4o-realtime-api',
      title: 'OpenAI Releases Realtime API and Vision Fine-Tuning',
      description: 'Developers can now build natural speech-to-speech experiences.',
      published_at: new Date().toISOString(),
    };

    expect(isLegitimateRealArticle(realArticle)).toBe(true);
  });

  it('strictly rejects synthetic, mock, or placeholder demo articles', () => {
    const mockArticles: ArticleInsert[] = [
      {
        source_id: '11111111-1111-1111-1111-111111111111',
        canonical_url: 'https://example.com/demo-post',
        title: 'Demo Story Title',
      },
      {
        source_id: '11111111-1111-1111-1111-111111111111',
        canonical_url: 'http://localhost:3000/posts/1',
        title: 'Localhost article',
      },
      {
        source_id: '11111111-1111-1111-1111-111111111111',
        canonical_url: 'https://techcrunch.com/sample',
        title: 'Mock Headline for Testing',
      },
      {
        source_id: '',
        canonical_url: 'https://deepmind.google/post',
        title: 'Missing source ID',
      },
      {
        source_id: '11111111-1111-1111-1111-111111111111',
        canonical_url: 'ftp://invalid-protocol.com',
        title: 'Invalid URL Scheme',
      },
    ];

    for (const art of mockArticles) {
      expect(isLegitimateRealArticle(art)).toBe(false);
    }
  });
});

describe('Typed Repository Function Tests with Mock Client', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    };
  });

  it('articlesRepo.persistRealArticles filters out demo articles and upserts real ones', async () => {
    const selectMock = vi.fn().mockResolvedValue({
      data: [{ id: 'art-1', canonical_url: 'https://deepmind.google/blog/gemini-pro' }],
      error: null,
    });
    const upsertMock = vi.fn().mockReturnValue({ select: selectMock });
    mockSupabase.from.mockReturnValue({ upsert: upsertMock });

    const mixedArticles: ArticleInsert[] = [
      {
        source_id: 'src-1',
        canonical_url: 'https://deepmind.google/blog/gemini-pro',
        title: 'Gemini 1.5 Pro Available for Developers',
      },
      {
        source_id: 'src-1',
        canonical_url: 'https://example.com/fake-story',
        title: 'Mock Headline',
      },
    ];

    const result = await articlesRepo.persistRealArticles(mixedArticles, mockSupabase);

    // Only the 1 real article should be passed to upsert
    expect(upsertMock).toHaveBeenCalledWith(
      [mixedArticles[0]],
      { onConflict: 'canonical_url', ignoreDuplicates: false }
    );
    expect(result).toHaveLength(1);
  });

  it('editionsRepo.createOrGetIdempotentEdition returns existing edition if one exists', async () => {
    const existingEdition = {
      id: 'ed-existing-1',
      issue_date: '2026-10-18',
      timezone: 'Asia/Kolkata',
      status: 'ready',
    };

    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: existingEdition,
      error: null,
    });
    const eqTzMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const eqDateMock = vi.fn().mockReturnValue({ eq: eqTzMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqDateMock });

    mockSupabase.from.mockReturnValue({ select: selectMock });

    const edition = await editionsRepo.createOrGetIdempotentEdition(
      { issueDate: '2026-10-18', timezone: 'Asia/Kolkata' },
      mockSupabase
    );

    expect(edition.id).toBe('ed-existing-1');
  });

  it('editionsRepo.addStoriesToEdition upserts stories and marks edition ready', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'edition_stories') {
        return { upsert: upsertMock };
      }
      if (table === 'editions') {
        return { update: updateMock };
      }
      return {};
    });

    await editionsRepo.addStoriesToEdition(
      'ed-1',
      [
        { articleId: 'art-1', rank: 1, section: 'models_releases' },
        { articleId: 'art-2', rank: 2, section: 'developer_tools' },
      ],
      mockSupabase
    );

    expect(upsertMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ edition_id: 'ed-1', article_id: 'art-1', rank: 1 }),
        expect.objectContaining({ edition_id: 'ed-1', article_id: 'art-2', rank: 2 }),
      ]),
      { onConflict: 'edition_id,article_id' }
    );
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ article_count: 2, status: 'ready' })
    );
  });
});

describe('Security & Service-Role Isolation', () => {
  it('throws an error if getSupabaseAdminClient is invoked in browser context', () => {
    // Temporarily simulate browser window
    const originalWindow = (globalThis as any).window;
    (globalThis as any).window = {};

    try {
      expect(() => getSupabaseAdminClient()).toThrow(/FATAL.*browser/);
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });

  it('returns null gracefully if server credentials are not configured', () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      const client = getSupabaseAdminClient();
      expect(client).toBeNull();
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    }
  });
});
