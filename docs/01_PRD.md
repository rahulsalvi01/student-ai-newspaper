# 01 — Product Requirements Document (PRD)

> **Real-news-only requirement:** The running newspaper must show only stories fetched from verified live sources. No mock, sample, placeholder, hard-coded or invented stories may appear in the UI or be seeded into the database. Test fixtures may exist only in automated tests. When no real stories are available, show an honest empty/error state.

**Project:** Personalised Daily Newspaper  
**Status:** MVP specification  
**Primary build environment:** Google Antigravity  
**Timezone for daily issue:** Asia/Kolkata (IST), default 08:00

## 1. Executive summary

### Problem
Readers manually visit multiple news sites and feeds every morning. This is fragmented, repetitive and makes it hard to prioritise stories that match their interests.

### Proposed solution
A responsive website that lets a reader configure interests and preferences, collects news metadata from configured RSS/Atom sources, filters and ranks stories, and creates a daily newspaper edition. A scheduled cloud workflow attempts to generate the edition at 08:00 IST and makes it available on the website. Email delivery is an optional adapter, not a hard dependency for the first MVP.

### Target users
- Primary: one individual reader who wants a personal morning briefing.
- Secondary, later: multiple readers with separate profiles and preferences.

### North Star metric
**Successful daily editions available by the user's morning reading time.** Track scheduled runs, successful editions, source freshness and delivery outcomes. Initial target: at least 95% of scheduled runs succeed over a rolling 30-day test period, excluding upstream outages; this is a target, not a guarantee of third-party scheduling precision.

### MVP outcome
A user can configure interests, view today's personalised edition, open original publisher links, and inspect when the edition was generated. A scheduled job can create the daily edition without opening Antigravity.

## 2. Visual product direction
Use a black-and-white, print-inspired Indian business-newspaper look with bold editorial headlines, narrow column structure, thin horizontal rules and restrained metadata. The Economic Times is a broad visual reference, not a source of logos, proprietary assets, exact fonts or copied layouts. Use the detailed tokens and typography in `03_UI_UX_SPEC.md`.

## 3. Editorial mission and sections
`docs/07_AI_STUDENT_EDITORIAL_POLICY.md` is the source of truth for editorial decisions. Default sections: The 5-Minute Brief; New Models & Releases; AI Tools for Developers; Research Worth Knowing; Open Source & Build; Industry & Infrastructure; Student Action Desk; Watchlist / What's Unclear. Keep the default edition to 20–30 stories maximum and publish fewer when there is not enough credible relevant news.

Every top story must identify what happened, why an IT student should care, and which technical details are verified. Primary sources are preferred for release facts. Vendor claims must be attributed; preprints and early claims must be labelled. No fabricated learning takeaways or unsupported model rankings.

## 4. Scope using MoSCoW

### Must have
- Responsive home/edition page.
- User profile or single-user settings with topics, language, region and story-count preferences.
- RSS/Atom feed registry with enabled/disabled status.
- Fetch, parse, normalise and deduplicate article metadata.
- Rank stories using selected interests, freshness and source diversity.
- Generate a dated edition and persist it.
- Daily schedule configured for 08:00 Asia/Kolkata (02:30 UTC) with run logs.
- Source title, publisher, timestamp when available, and original link on each story.
- Empty, loading, stale-data, partial-source-failure and job-failure states.
- Secure environment configuration; no secrets in browser bundles or Git.
- Manual “Generate edition now” action for testing and recovery.
- A no-paid-AI baseline: edition creation works with feed titles/descriptions even when no AI API is configured.

### Should have
- Optional email delivery with a provider adapter.
- Save/bookmark story.
- Search within past editions.
- Basic admin screen for feed health.
- Optional AI-generated summaries through a replaceable provider interface.
- Export/print-friendly edition.

### Could have
- Multiple profiles and family sharing.
- Hindi and other language-specific source packs.
- Read-aloud, audio briefings, push notifications.
- Weather, market and sports modules.
- Reading-time estimates and topic controls per story.

### Won't have in v1
- Republishing full publisher articles or paywalled content.
- Scraping sites that prohibit it or bypassing access controls.
- Paid subscriptions, payments or advertising.
- Social network, comments or public user profiles.
- Guaranteed exact-to-the-minute delivery using a best-effort free scheduler.
- Mandatory paid AI API usage.
- Mobile native apps.

## 4. Primary user stories and acceptance criteria

### Story A — Configure interests
As a reader, I want to select topics and a preferred language so that the edition is relevant to me.
- Given the preferences page is open, when I save valid topics and preferences, then the settings are persisted and shown after refresh.
- Given the input is invalid, when I save, then a clear validation message appears and no invalid data is stored.

### Story B — Read today's edition
As a reader, I want one newspaper page organised by topic so that I can scan the morning's important stories.
- Given an edition exists for today's local date, when I open the home page, then its stories are grouped by category and sorted by relevance.
- Given no edition exists, when I open the page, then the app explains this and offers a permitted manual generation action.

### Story C — Open original reporting
As a reader, I want to open the publisher's original story so that I can read the source.
- Given a story has a valid URL, when I select its source link, then the original publisher opens in a new tab with safe link attributes.
- The app displays the publisher/source name and does not present the summary as the publisher's own text.

### Story D — Generate an edition
As the system, I want to create a daily edition from available feeds so that it can run without manual work.
- Given the scheduled workflow starts, when feeds respond, then articles are normalised, deduplicated, ranked and stored under the target issue date.
- Given some feeds fail, when at least one feed succeeds, then a partial edition can be stored and failed sources are recorded in the run log.
- Given all feeds fail, when generation ends, then the run is marked failed and the previous edition remains available.

### Story E — Avoid duplicate daily editions
As a reader, I want a rerun not to create duplicate editions or stories.
- Given an edition already exists for a date, when generation runs again, then the system updates/reuses the same date's edition idempotently rather than creating a duplicate.
- Given an article URL has already been ingested, when it is fetched again, then it is matched to the existing canonical URL/article record.

### Story F — Delivery status
As a reader, I want to know whether today's edition was generated and delivered.
- Given a scheduled run completes, when I view status, then I can see started/completed time, outcome, article count and delivery status.
- Given email is not configured, then in-app availability still succeeds and email is marked “not configured,” not as a failed edition.

### Story G — Recover from failure
As an operator, I want to retry generation manually so that I can recover after a failed schedule.
- Given the last run failed, when I trigger a manual run as an authorised user, then a new run log is created and duplicate-safe generation occurs.
- The endpoint rejects unauthorised calls and applies a rate limit or equivalent abuse guard.

## 5. Non-functional requirements
- TypeScript strict mode; validate external input and feed payloads.
- Secure authentication and per-user data isolation if multi-user mode is enabled.
- OWASP-aligned input validation, safe outbound links and server-only secrets.
- Accessibility: keyboard navigation, visible focus, semantic headings and adequate contrast; target WCAG 2.1 AA.
- Performance target: fast initial edition rendering; use server rendering for read-heavy pages and paginate older editions.
- Resilience: per-feed timeouts, bounded retries, per-source error logging and idempotent runs.
- Observability: structured run logs, source health, generation duration and failure reason.
- Privacy: collect only required preferences and account information; provide account/data deletion if user accounts are enabled.

## 6. Product decisions / assumptions
- Default locale/timezone is `en` / `Asia/Kolkata`; users may later choose another timezone.
- Default schedule is 08:00 local time.
- Initial deployment is for personal use and should remain within free tiers.
- The first release uses RSS/Atom feed metadata. Source selection must respect feed/publisher terms.
- AI-generated summaries are optional and must be labelled. Without a configured provider, use the feed description/snippet and do not invent facts.
