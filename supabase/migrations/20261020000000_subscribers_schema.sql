-- 20261020000000_subscribers_schema.sql
-- Subscriber table and RLS policies for Student AI Newspaper
-- Authoritative Spec: Student AI Newspaper Email Subscription Automation Guide

--------------------------------------------------------------------------------
-- SUBSCRIBERS
--------------------------------------------------------------------------------
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  normalized_email text not null unique,
  status text not null default 'active' check (status in ('active', 'unsubscribed', 'pending')),
  source text not null default 'website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index on normalized email for fast uniqueness and lookup
create index if not exists idx_subscribers_normalized_email on public.subscribers (normalized_email);
create index if not exists idx_subscribers_status on public.subscribers (status);

--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
--------------------------------------------------------------------------------
alter table public.subscribers enable row level security;

-- Public can subscribe (insert new row with active or pending status)
create policy "Public can insert active subscriber"
  on public.subscribers
  for insert
  with check (status in ('active', 'pending'));

-- Read/Update/Delete reserved for service-role only (protects subscriber privacy)
-- Note: Service-role key automatically bypasses RLS in Supabase.
