# brain.md — Authoritative Agent Context

## System core essence
This repository builds an AI-and-IT-student-focused daily newspaper. It collects permitted RSS/Atom metadata, filters and ranks AI model releases, coding tools, developer platforms, research, open-source projects and practical learning opportunities, then presents a dated editorial edition. `docs/07_AI_STUDENT_EDITORIAL_POLICY.md` is the authoritative editorial rulebook. The default issue timezone is `Asia/Kolkata`, with a best-effort scheduled run at 08:00 IST. The baseline must function without paid AI APIs. After Gmail Actions secrets are configured, the scheduled workflow emails the saved edition link to the configured Gmail address; if email fails, the in-app edition remains available.

## Read before coding
1. `docs/01_PRD.md`
2. `docs/02_TRD.md`
3. `docs/03_UI_UX_SPEC.md`
4. `docs/04_APP_FLOW.md`
5. `docs/05_AUTOMATION_AND_FREE_DEPLOYMENT.md`
6. `docs/06_ANTIGRAVITY_BUILD_PLAN.md`
7. `docs/07_AI_STUDENT_EDITORIAL_POLICY.md`
8. `docs/08_STEP_BY_STEP_SETUP.md`

## Visual direction — user-approved
- Use an original black-and-white, print-inspired business-newspaper interface, broadly referencing The Economic Times' editorial density and hierarchy.
- Use serif editorial headlines (Source Serif 4 or Georgia/system serif) and sans-serif UI/metadata (Arial, Helvetica or Inter); do not claim these are the exact Economic Times fonts.
- White background, black text, neutral grey rules, strong section dividers, minimal rounding and no colorful accent palette.
- Never use The Economic Times logo, exact masthead, proprietary artwork or a pixel-for-pixel copy. Use an original product name and design.

## Editorial invariants — non-negotiable
- This is not a general news aggregator. Keep the feed and ranking pipeline focused on AI, model releases, developer tools, AI research, open source and student-relevant computing.
- Each important story should answer: what happened, why an IT student should care, what technical details are verified, and what to try next (only when supported).
- Prioritise primary sources for release facts and use independent sources for context; attribute company benchmark claims.
- Distinguish open-source, open-weight and API-only models. Never invent release dates, prices, model versions, license terms or benchmark results.
- Label preprints and unverified claims; omit low-confidence hype from the top brief.
- If a quiet news day yields few good stories, publish a shorter edition rather than pad with unrelated items.

## Real-news-only invariant — highest priority
- Never display sample, mock, placeholder, hard-coded or invented news in the running UI.
- Visible articles must originate from actual retrievals from verified live RSS/Atom sources and preserve the original publisher URL and attribution.
- Automated synthetic fixtures are allowed only in tests. Never seed the database with demo stories or import fixtures into app components.
- If sources are not configured, unreachable, or return no qualifying items, display a truthful setup, error or empty state. Do not fabricate content to make the design look populated.
- Build and verify source ingestion before connecting article cards; the first working article list must be real.

## Non-negotiable invariants
- Do not generate or modify code until the relevant spec is read.
- Build one milestone at a time; do not scaffold every feature in one prompt.
- TypeScript strict mode. Avoid `any`; validate external input with Zod.
- Never expose server secrets in client code or commit real secrets.
- Use RSS/Atom metadata and permitted excerpts only. Never copy full articles or bypass paywalls.
- Preserve source attribution and original links.
- Never invent news facts. Without a configured AI provider, use source-provided descriptions/snippets.
- AI summaries must be labelled `AI-generated summary`.
- Generation is idempotent per issue date/timezone and article canonical URL.
- Partial feed failure should produce a partial edition if usable sources remain.
- All-feed failure must preserve the previous good edition.
- Email failure must not invalidate the in-app edition.
- Gmail notifications must only be sent after the edition is saved and a valid HTTPS `editionUrl` is returned.
- Gmail App Passwords and all generation secrets belong only in GitHub Actions/server secrets, never source files or logs.
- The app must work when optional email and AI credentials are absent.
- Daily schedule is best-effort unless a scheduler with a formal SLA is configured.
- Keep tokens, colors and spacing in the design system; do not scatter hardcoded styles.
- Run lint, typecheck, tests and production build before declaring a milestone complete.

## Architecture guardrails
- Next.js App Router + TypeScript.
- Supabase PostgreSQL for persistence; use RLS if multi-user accounts are enabled.
- Server-only feed fetching; never fetch feeds from browser components.
- Keep source registry explicit and controlled.
- Use small modules: `lib/feeds`, `lib/news`, `lib/generation`, `lib/db`, `lib/security`, `lib/email`.
- Keep provider interfaces replaceable: `SummaryProvider`, `EmailProvider`, `SchedulerTrigger`.
- Keep `.env.example` documented and free of real credentials.

## Suggested repository topology
```text
.
├── .spec/                         # optional copy of docs
├── docs/
│   ├── 01_PRD.md
│   ├── 02_TRD.md
│   ├── 03_UI_UX_SPEC.md
│   ├── 04_APP_FLOW.md
│   ├── 05_AUTOMATION_AND_FREE_DEPLOYMENT.md
│   └── 06_ANTIGRAVITY_BUILD_PLAN.md
├── brain.md
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   │   ├── feeds/
│   │   ├── news/
│   │   ├── generation/
│   │   ├── db/
│   │   ├── security/
│   │   └── email/
│   └── types/
├── supabase/
│   └── migrations/
├── .github/workflows/
├── .env.example
└── README.md
```

## Progress ledger
- [ ] Milestone 0: Read all specs and confirm assumptions.
- [ ] Milestone 1: Verify live source registry and working RSS/Atom feeds.
- [ ] Milestone 2: Scaffold the responsive newspaper shell connected to real data and honest empty/error states.
- [ ] Milestone 3: Implement database schema and idempotent persistence.
- [ ] Milestone 4: Implement real-news ingestion, freshness filters, ranking and edition generation.
- [ ] Milestone 5: Connect the UI to persisted real editions; no demo stories.
- [ ] Milestone 6: Add preferences/history and protected manual generation endpoint.
- [ ] Milestone 7: Configure scheduled workflow and test timezone.
- [ ] Milestone 8: Scheduled generation plus Gmail link notification; test with a configured Gmail App Password.
- [ ] Milestone 9: Test security, accessibility, source health, failure states and deployment.
- Known blockers: user must create accounts and supply credentials where needed; provider free tiers and schedule precision must be verified before launch.

## Agent task protocol
For every task:
1. State which spec sections apply.
2. Inspect existing files and avoid replacing working code unnecessarily.
3. Implement only the requested milestone.
4. Run checks and report exact results.
5. Summarise changed files, decisions, tests and remaining risks.
6. Update this ledger only when work is actually complete.


## REAL-NEWS RULE — NON-NEGOTIABLE
- The running newspaper must contain only real articles retrieved from verified live sources.
- Never display or seed sample, mock, placeholder, hard-coded, or invented stories. Automated test fixtures must remain inside tests.
- Verify each candidate RSS/Atom feed with a real fetch and parse before enabling it; log evidence and disable failures honestly.
- If sources fail or no relevant stories qualify, show an honest empty/partial/error state and preserve the last good edition when possible. Never pad with filler.
- Follow `docs/09_REAL_NEWS_INTEGRATION_CHECKLIST.md` and report real-source evidence before claiming success.
