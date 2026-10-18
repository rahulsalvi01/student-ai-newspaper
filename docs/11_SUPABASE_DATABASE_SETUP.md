# 11 — Supabase Database Setup & Schema Guide

This document details the Supabase PostgreSQL schema implementation, unique constraints, Row Level Security (RLS) policies, and repository usage according to `docs/02_TRD.md`.

---

## 1. Schema Overview

The database migration is located at:
`supabase/migrations/20261018000000_initial_schema.sql`

It creates the following 7 core relational tables:

| Table | Description | Primary Key & Constraints |
|---|---|---|
| `profiles` | Reader preferences, topics, limits | `id uuid primary key references auth.users(id)` |
| `sources` | RSS/Atom source registry & health | `id uuid primary key`, `feed_url text unique` |
| `articles` | Real articles fetched from live feeds | `id uuid primary key`, `canonical_url text unique` |
| `editions` | Daily dated newspaper editions | `id uuid primary key`, `unique(issue_date, timezone)` |
| `edition_stories` | Ranked stories within an edition | `primary key (edition_id, article_id)`, `unique(edition_id, rank)` |
| `generation_runs` | Scheduled and manual run audit logs | `id uuid primary key` |
| `delivery_logs` | Edition delivery tracking (email) | `id uuid primary key` |

---

## 2. Invariants & Constraints

1. **Unique Canonical Article URLs**:
   ```sql
   canonical_url text not null unique
   ```
   Ensures that no matter how many times feeds are ingested, duplicate articles are never inserted.

2. **Idempotent Edition Dates**:
   ```sql
   constraint uq_editions_issue_date_timezone unique (issue_date, timezone)
   ```
   Prevents duplicate editions for the same date and timezone. Running generation multiple times for the same day updates or returns the existing edition idempotently.

3. **Real-News-Only Policy**:
   The repository function `persistRealArticles(articles)` strictly validates all articles via `isLegitimateRealArticle(article)`:
   - Rejects synthetic fixtures, `localhost`, `example.com`, or placeholder text.
   - Enforces valid `http:`/`https:` protocols.
   - Ensures only real retrieved source articles enter the database.

4. **Server-Only Service-Role Key**:
   - `getSupabaseAdminClient()` throws immediately if called in a browser environment.
   - The service role key is never exported or used on the client side.

5. **Row Level Security (RLS)**:
   - RLS is enabled on all tables.
   - Public read access is granted only for published editions (`status in ('ready', 'partial')`), edition stories, articles, and sources.
   - Mutating sources, articles, and editions requires the service-role client.
   - Profiles are restricted so authenticated users can only access their own profile (`auth.uid() = id`).

---

## 3. How to Apply Migrations

### Option A: Supabase Web Dashboard (Recommended for Free Tier)
1. Open your Supabase project dashboard at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** tab on the left sidebar.
3. Click **New Query**.
4. Copy the entire contents of `supabase/migrations/20261018000000_initial_schema.sql` and paste it into the query editor.
5. Click **Run**.
6. Verify that the 7 tables appear under the **Table Editor**.

### Option B: Supabase CLI
```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

---

## 4. Environment Variables

Create `.env.local` (never commit this file) with the following values:

```bash
# Public URL and Anonymous Key (Safe for browser / public reads)
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Server-Only Service Role Key (Bypasses RLS for scheduled background runs)
# WARNING: NEVER prefix with NEXT_PUBLIC_ or expose to client code.
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 5. Typed Repository Usage

Import typed repositories from `src/lib/db/repository`:

```typescript
import {
  sourcesRepo,
  articlesRepo,
  editionsRepo,
  generationRunsRepo
} from '@/lib/db/repository';

// 1. Upsert live sources
await sourcesRepo.upsertSources([
  {
    name: 'OpenAI News',
    feed_url: 'https://openai.com/news/rss.xml',
    category: 'models_releases',
    language: 'en',
    enabled: true,
  }
]);

// 2. Persist real articles (strictly rejects demo/mock items)
const savedArticles = await articlesRepo.persistRealArticles([
  {
    source_id: 'source-uuid',
    canonical_url: 'https://openai.com/news/example-real-post',
    title: 'Real Article Title',
    published_at: new Date().toISOString(),
  }
]);

// 3. Create or retrieve idempotent daily edition
const edition = await editionsRepo.createOrGetIdempotentEdition({
  issueDate: '2026-10-18',
  timezone: 'Asia/Kolkata',
  status: 'ready',
  headline: 'AI & Computing Daily',
});
```
