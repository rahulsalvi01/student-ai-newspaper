# 08 — Step-by-Step Setup: Real News From the First Working Version

## Critical rule
The running newspaper must never display sample, mock, placeholder, hard-coded or invented stories. The app may use synthetic fixtures inside automated parser tests, but those fixtures must never be imported into the app UI or seeded into the database. If no real feed items are available, display an honest empty/error/setup state.

## Stage 1 — Prepare the project
1. Install/update Google Antigravity and Git if needed.
2. Create a new empty folder named `student-ai-newspaper`.
3. Extract this specification ZIP into that folder so `README.md`, `brain.md`, `docs/`, `.env.example` and `.github/` sit at the repository root.
4. Open that folder in Antigravity.
5. Paste Prompt 0 from `docs/06_ANTIGRAVITY_BUILD_PLAN.md`. Review the plan; do not let it code yet.

## Stage 2 — Verify real news feeds before designing article cards
1. Paste Prompt 1. Ask Antigravity to test each RSS/Atom URL in `docs/07_AI_STUDENT_EDITORIAL_POLICY.md` with real network requests.
2. Require a report with feed URL, publisher, HTTP/fetch status, parse status, newest published timestamp and number of valid items. A URL must not be called working unless a real request and parse succeeded.
3. Disable broken or stale feeds with a logged reason. Do not quietly pretend they work. Add replacements only after testing the replacement URL.
4. Keep parser fixtures in test files only. They are for proving parser behavior, not for showing news on the website.
5. Do not proceed until at least a few appropriate sources return real, relevant articles. If access/network restrictions prevent verification, have Antigravity explain the blocker rather than fabricate results.

## Stage 3 — Build the app shell connected to real data
1. Paste Prompt 2. Build the monochrome newspaper layout, but wire it to the live source service or database immediately.
2. The UI must have loading, error, and genuinely empty states. It must not show sample headlines while the backend is being built.
3. Verify the first visible article has a real source link that opens the original publisher page.
4. Run lint, typecheck, tests and production build. Commit a checkpoint.

## Stage 4 — Add database and ingestion
1. Paste Prompt 3 to add Supabase migrations and persistence.
2. Paste Prompt 4 to implement real feed ingestion, filtering, ranking and edition generation.
3. Check canonical URL deduplication, freshness windows, per-source failure handling, and issue-date idempotency.
4. Verify that only fetched records are persisted. Do not create demo rows or seed stories.
5. Confirm that a failed feed does not prevent other sources from contributing. If all sources fail, the previous good edition should remain available with a visible warning.

## Stage 5 — Connect the final newspaper UI
1. Paste Prompt 5. The page should render only persisted real articles from actual source retrievals.
2. Every story should show the publisher, original link, publication timestamp when available, and a clear label if any summary is AI-generated.
3. Show edition date and “last updated” in `Asia/Kolkata`. Distinguish source publication time from retrieval time.
4. Confirm that a quiet news day produces a short edition rather than filler.

## Stage 6 — Set up accounts and deploy
1. Create a GitHub repository and push the project. Check current Actions availability and quotas for your account.
2. Create a Supabase project if persistence is enabled. Put credentials in local `.env.local` and hosting settings only. Never commit real secrets or expose a service-role key in browser code.
3. Create a Vercel project connected to GitHub, or use another compatible host. Check current terms, quotas, and background execution limits before relying on it.
4. Add the environment variables from `.env.example` in local and hosted environments as needed. The example file contains names/placeholders only.
5. Deploy and verify the production site can retrieve persisted real stories.

## Stage 7 — Enable automatic daily generation
1. Paste Prompt 7 to create the protected generation endpoint.
2. Paste Prompt 8 to configure GitHub Actions. Add `NEWSPAPER_GENERATE_URL` and `NEWSPAPER_GENERATE_SECRET` in GitHub repository Settings → Secrets and variables → Actions. Configure the matching `GENERATION_SECRET` on the server.
3. Add Gmail secrets in GitHub Actions: `NEWSPAPER_GMAIL_ADDRESS` (your Gmail address) and `NEWSPAPER_GMAIL_APP_PASSWORD` (a Google App Password, not your normal password). Recipients are stored in Supabase and fetched dynamically at send time via `/api/subscribers/recipients`; if the database has no subscribers yet, the email defaults to `NEWSPAPER_GMAIL_ADDRESS`. You can add recipients anytime via the website Subscribe form or `npm run add-recipient <email>`. App Password setup usually requires Google 2-Step Verification and may not be available for all accounts.
4. Ensure the workflow file is on the default branch and Actions are enabled.
5. Run the workflow manually. Inspect logs and confirm it fetched real stories, saved an edition, returned an absolute HTTPS `editionUrl`, and sent a Gmail message containing that link. Never print credentials in logs.
6. Confirm the configured schedule targets 08:00 India time. GitHub schedule is best-effort and can be delayed; it is not an exact-time guarantee.
7. Run generation twice for the same issue date. There should be one edition, with no duplicate stories; avoid sending repeated test emails unnecessarily.

## Stage 8 — Acceptance tests before daily use
- [ ] At least a few live, relevant RSS/Atom sources are verified and enabled.
- [ ] Visible stories all come from actual source retrievals.
- [ ] No sample/mock/placeholder stories appear anywhere in the UI.
- [ ] Every story has a working original publisher link.
- [ ] Publication time and retrieval time are not confused.
- [ ] Duplicate URLs are removed and stale stories are filtered.
- [ ] One failed feed does not stop successful feeds.
- [ ] All-feed failure preserves the previous edition and shows a warning.
- [ ] No qualifying stories results in an honest empty/short edition.
- [ ] Manual generation succeeds and is idempotent.
- [ ] Scheduled workflow is enabled and a successful run is verified.
- [ ] Gmail notification arrives after a successful generation and its HTTPS edition link opens the correct edition.
- [ ] Gmail App Password is stored only as a GitHub Actions secret, never in source files or logs.
- [ ] Lint, typecheck, tests and production build pass.
- [ ] Secrets are absent from Git history and client bundles.

## Troubleshooting
- **No stories appear:** inspect source health and fetch logs, test each feed URL, check the freshness window and retry manually. Do not insert sample stories to make the page look populated.
- **Only a few stories appear:** this can be correct if only a few relevant stories were published. Verify feed health before expanding the source list.
- **Repeated stories:** inspect canonical URL normalisation and database uniqueness constraints.
- **Outdated news:** inspect publication timestamps, feed ordering and freshness filters.
- **One feed fails:** log it and continue using healthy feeds.
- **All feeds fail:** keep the previous good edition visible with a warning; do not overwrite it with an empty failed run.
- **Schedule did not run:** inspect GitHub Actions logs and check that the workflow is on the default branch and enabled.

## Optional features
Add AI summaries only after real ingestion and display work reliably. The no-AI mode must use source-provided descriptions or concise metadata, not invented explanation. Gmail delivery is wired into the scheduled workflow but only works after Gmail secrets are configured and the generation endpoint returns the required edition URL fields.
