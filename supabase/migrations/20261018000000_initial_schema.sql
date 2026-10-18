-- 20261018000000_initial_schema.sql
-- Supabase PostgreSQL Schema for Student AI Newspaper
-- Authoritative Spec: docs/02_TRD.md

-- Enable UUID extension if not already enabled
create extension if not exists "pgcrypto";

--------------------------------------------------------------------------------
-- 1. PROFILES
--------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'Asia/Kolkata',
  language text not null default 'en',
  topics text[] not null default '{}',
  regions text[] not null default '{}',
  daily_story_limit integer not null default 30 check (daily_story_limit between 5 and 100),
  email_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

--------------------------------------------------------------------------------
-- 2. SOURCES
--------------------------------------------------------------------------------
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  feed_url text not null unique,
  category text not null,
  language text not null default 'en',
  region text,
  enabled boolean not null default true,
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

--------------------------------------------------------------------------------
-- 3. ARTICLES
--------------------------------------------------------------------------------
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  canonical_url text not null unique,
  title text not null,
  description text,
  author text,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  language text default 'en',
  category text,
  content_hash text,
  created_at timestamptz not null default now()
);

--------------------------------------------------------------------------------
-- 4. EDITIONS
--------------------------------------------------------------------------------
create table if not exists public.editions (
  id uuid primary key default gen_random_uuid(),
  issue_date date not null,
  timezone text not null default 'Asia/Kolkata',
  status text not null check (status in ('building', 'ready', 'partial', 'failed')),
  headline text,
  generated_at timestamptz,
  article_count integer not null default 0,
  generation_run_id uuid,
  created_at timestamptz not null default now(),
  -- Idempotency constraint: exactly one edition per issue date and timezone
  constraint uq_editions_issue_date_timezone unique (issue_date, timezone)
);

--------------------------------------------------------------------------------
-- 5. EDITION_STORIES
--------------------------------------------------------------------------------
create table if not exists public.edition_stories (
  edition_id uuid not null references public.editions(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  rank integer not null,
  section text not null,
  summary text,
  summary_kind text not null default 'source_snippet' check (summary_kind in ('source_snippet', 'ai_generated', 'editorial')),
  created_at timestamptz not null default now(),
  primary key (edition_id, article_id),
  constraint uq_edition_stories_edition_rank unique (edition_id, rank)
);

--------------------------------------------------------------------------------
-- 6. GENERATION_RUNS
--------------------------------------------------------------------------------
create table if not exists public.generation_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  trigger text not null check (trigger in ('scheduled', 'manual')),
  status text not null check (status in ('running', 'succeeded', 'partial', 'failed')),
  feeds_attempted integer not null default 0,
  feeds_succeeded integer not null default 0,
  articles_ingested integer not null default 0,
  error_summary text,
  created_at timestamptz not null default now()
);

--------------------------------------------------------------------------------
-- 7. DELIVERY_LOGS (optional email notifications)
--------------------------------------------------------------------------------
create table if not exists public.delivery_logs (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id) on delete cascade,
  channel text not null check (channel in ('email')),
  recipient_hash text,
  status text not null check (status in ('pending', 'sent', 'failed', 'skipped')),
  provider_message_id text,
  error_summary text,
  created_at timestamptz not null default now()
);

--------------------------------------------------------------------------------
-- INDEXES (as specified in TRD)
--------------------------------------------------------------------------------
create index if not exists idx_articles_published_at on public.articles (published_at desc);
create index if not exists idx_articles_source_id on public.articles (source_id);
create index if not exists idx_edition_stories_edition_rank on public.edition_stories (edition_id, rank);
create index if not exists idx_generation_runs_started_at on public.generation_runs (started_at desc);

--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
--------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.sources enable row level security;
alter table public.articles enable row level security;
alter table public.editions enable row level security;
alter table public.edition_stories enable row level security;
alter table public.generation_runs enable row level security;
alter table public.delivery_logs enable row level security;

-- PROFILES: Users can read and update their own profile
create policy "Users can read own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

-- SOURCES: Public read access for enabled sources; mutations via service role only
create policy "Public can view sources"
  on public.sources
  for select
  using (true);

-- ARTICLES: Public read access for real news articles; mutations via service role only
create policy "Public can view articles"
  on public.articles
  for select
  using (true);

-- EDITIONS: Public can view ready or partial editions; building/failed hidden from public
create policy "Public can view published editions"
  on public.editions
  for select
  using (status in ('ready', 'partial'));

-- EDITION_STORIES: Public can view stories belonging to published editions
create policy "Public can view edition stories"
  on public.edition_stories
  for select
  using (
    exists (
      select 1 from public.editions
      where editions.id = edition_stories.edition_id
      and editions.status in ('ready', 'partial')
    )
  );

-- GENERATION_RUNS: Admin / service-role access only (no public select policy)
-- Note: Service-role key automatically bypasses RLS in Supabase.
