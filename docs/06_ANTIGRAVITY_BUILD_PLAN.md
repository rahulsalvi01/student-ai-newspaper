# 06 — Antigravity Build Plan: Real News From Day One

## Non-negotiable product rule
**Never use sample, mock, placeholder, hard-coded, or invented news stories in the running newspaper UI.** The first visible article must come from a successfully fetched real source and retain its original source URL, publisher, and publication timestamp when available. Automated test fixtures are allowed only inside tests; never display them as live news.

If feeds have not been configured or cannot be reached, show a clear setup/connection/empty state—not fake headlines. If only two relevant verified stories are available, show two. Do not pad the edition.

## How to use
Open the project folder in Google Antigravity. Send one prompt at a time and inspect the result. This plan intentionally builds and verifies the real-news pipeline before rendering article cards.

## Prompt 0 — Read and plan only
> You are the lead engineer. Read `brain.md` and every file in `docs/`. Treat `docs/07_AI_STUDENT_EDITORIAL_POLICY.md` and `docs/09_REAL_NEWS_INTEGRATION_CHECKLIST.md` as binding. My strict requirement: the running newspaper must use real news from live, verified RSS/Atom sources from its first working version. Do not use sample/mock/placeholder news in the UI, and do not seed the database with fabricated stories. Test fixtures are allowed only inside automated tests. If no real articles can be fetched, show an honest empty/error/setup state. Summarise architecture, source-verification plan, security, free-tier limitations and milestones. Do not write code yet. Ask only blocking questions; otherwise use documented defaults.

## Prompt 1 — Verify real sources and build feed registry
> Implement Milestone 1: create an explicit server-side source registry based on `docs/07_AI_STUDENT_EDITORIAL_POLICY.md`. For each source, record name, category, feed URL, official/independent status, enabled status and last health result. Verify every feed URL by making a real request; parse RSS/Atom, enforce timeouts and response-size limits, validate HTTPS/HTTP policy and reject unsafe URL schemes. Do not fabricate successful results. Report which sources actually work, their latest article dates and any failures. If a source does not work, mark it disabled with a reason and suggest a verified alternative only after testing it. Do not build article cards or add sample content yet. Add automated parser fixtures for unit tests only. Run lint, typecheck and tests.

## Prompt 2 — Scaffold the real-data application shell
> Create the Next.js App Router + TypeScript strict-mode + Tailwind app and the black-and-white editorial shell from `docs/03_UI_UX_SPEC.md`. Connect the homepage to a server-side query for stored real articles or the verified feed service. Do not include mock/sample/placeholder news in any page, seed file, story fixture imported by the UI, or fallback array. If no real stories exist, render an honest empty state such as “No verified AI/technology stories are available yet” with a Retry/Refresh action and source-health details. Include loading and error states. Keep all feed fetching server-side. Run lint, typecheck, tests and production build.

## Prompt 3 — Database and persistence
> Implement the Supabase PostgreSQL schema in `docs/02_TRD.md` for sources, articles, editions and generation logs. Add unique constraints for canonical article URLs and idempotent edition dates. Persist only articles actually retrieved from real sources. Do not insert demo articles. Add typed repository functions and migrations. Keep service-role credentials server-only. Add RLS if authentication is enabled. Document setup and run tests.

## Prompt 4 — Real-news ingestion and ranking
> Implement the complete live ingestion pipeline using only sources that passed the feed-health verification. Fetch enabled sources, normalise metadata, deduplicate, apply freshness windows, rank for usefulness to an IT student, and group qualifying stories into the editorial sections in `docs/07_AI_STUDENT_EDITORIAL_POLICY.md`. Persist real source metadata and original links. Preserve per-source timestamps and report retrieval time separately. A partial source failure must not block working sources. If all sources fail, preserve the previous good edition and display a clear warning. If there are no qualifying stories, publish an honest empty/short edition; never fill gaps with generated or invented news. Without an AI provider, use only source-provided titles/descriptions and deterministic classification; omit unsupported takeaways rather than hallucinate. Add tests for duplicates, stale news, empty results, partial failure, all-source failure and repeat runs.

## Prompt 5 — Live newspaper UI and source transparency
> Connect the UI to persisted editions generated from real sources. Render only records with valid source URLs and actual retrieved source metadata. Every story must show publisher, published time when available, source link, and a clear distinction between source-provided description and any AI-generated summary. Display “Updated at” and edition date in Asia/Kolkata. Show source health and last successful fetch time in a compact status area. Add filters/search only if supported by actual data. Do not add placeholder headlines, fallback articles or fake counts. Run checks.

## Prompt 6 — Preferences and history
> Implement topic preferences and edition history using real persisted editions only. Empty history must be genuinely empty with an explanation; do not create demo editions. Validate input with Zod. Run all checks.

## Prompt 7 — Protected generation endpoint
> Implement `POST /api/generate` according to the TRD. Require server-only `GENERATION_SECRET`, reject missing/invalid credentials, prevent concurrent duplicate runs, validate issue date/timezone and apply abuse protection. Return counts of fetched, accepted, rejected and failed sources without exposing secrets. Add integration tests and local invocation instructions.

> Configure `.github/workflows/daily-newspaper.yml` to call the deployed protected generation endpoint at the configured 08:00 Asia/Kolkata target. Use `02:30 UTC` if using UTC cron without timezone support. Keep secrets in GitHub Actions secrets. After successful generation, fetch active recipients dynamically from the protected `/api/subscribers/recipients` endpoint using `NEWSPAPER_GENERATE_SECRET` and send the edition link to subscribers via Bcc using Gmail SMTP (`smtp.gmail.com:465`, SSL) and a Google App Password (`NEWSPAPER_GMAIL_ADDRESS`, `NEWSPAPER_GMAIL_APP_PASSWORD`). The endpoint must finish generation and persistence before returning HTTP 2xx and must return JSON fields `editionUrl` (absolute HTTPS URL), `issueDate`, and `articleCount`. Validate the URL and do not send if it is absent or invalid. Never log secrets. Add manual workflow dispatch and failure visibility. Never claim it is active until deployment, repository secrets and a successful manual run are verified. Document best-effort scheduling, Gmail limits, and idempotency. A mail failure must not delete or invalidate the saved edition.

## Prompt 9 — Deployment and real-data acceptance test
> Prepare deployment instructions for GitHub, Supabase and Vercel or equivalent free-first services, subject to current quotas. Do not claim any free tier is unlimited. Provide a checklist requiring a successful live feed fetch, a real article opening at its publisher, successful edition persistence, manual generation, and a successful scheduled-run test. Do not accept screenshots or tests that use mock stories as evidence of news functionality.

## Prompt 10 — Optional AI summaries and email safety
> Only after real news ingestion, display, persistence and scheduling work reliably, add optional AI summaries. The scheduled Gmail link notification is implemented by GitHub Actions and must not depend on a paid email API. Verify Gmail App Password requirements and sending limits. The in-app newspaper must continue working if email credentials are missing or delivery fails. Never send real emails during tests; provide a dry-run/test mode that does not contact Gmail.

## Prompt 11 — Pre-launch audit
> Test responsive UI, accessibility, source attribution, feed failures, duplicate prevention, freshness rules, timestamp/timezone, secret handling, no-AI/no-email mode and scheduler behavior. Verify that the running UI contains only fetched real articles. Report PASS/FAIL/BLOCKED with evidence. Test fixtures must remain confined to automated tests and must never appear in the app UI.

## Mandatory real-news integration checklist
Before declaring the project complete, follow every requirement in `docs/09_REAL_NEWS_INTEGRATION_CHECKLIST.md` and report evidence for each acceptance gate. The feed URLs in the policy are candidates until fetched and parsed successfully.

## Domain-specific rule for every prompt
> This is a specialised AI/IT-student newspaper, not a general news aggregator. Follow `docs/07_AI_STUDENT_EDITORIAL_POLICY.md`. Real source data is mandatory for visible stories. Never invent headlines, dates, pricing, model versions, benchmarks, licences or links. Show fewer stories rather than padding.


## Mandatory Milestone Quality Gate

After every milestone, stop and run the available lint, TypeScript typecheck, automated tests, and production build checks. Review the code changes, fix issues, and rerun the checks. Report actual results and disclose any failures or checks that could not run. Save a Git commit only after the required checks pass. Never claim tests passed without executing them. Never proceed to the next milestone until the current milestone's quality review is complete. Preserve existing work and never commit secrets.