# Personalised Daily Newspaper — Antigravity Project Pack

This repository specification pack is based on the five-pillar specification framework and eight-stage delivery pipeline in *Engineering Autonomous Web Systems* (the PDF supplied by the project owner), adapted for a zero-cost-first personal newspaper application.

## Visual direction
Use an original black-and-white, print-inspired Indian business-newspaper aesthetic, with compact editorial columns, bold serif headlines, sans-serif metadata and thin rules. The Economic Times is a broad style reference only: do not copy its logo, exact masthead, proprietary assets or exact page design. See `docs/03_UI_UX_SPEC.md`.

## Product in one sentence
A focused AI-and-IT-student briefing that filters for new AI models, model releases, coding assistants, developer tools, research, open-source projects and practical student takeaways. It curates permitted RSS/Atom metadata, ranks stories for usefulness, and attempts to publish a daily edition at 08:00 Asia/Kolkata.

## Read these documents in order
1. `docs/01_PRD.md` — what to build and what not to build.
2. `docs/02_TRD.md` — architecture, stack, data model, security, API contracts.
3. `docs/03_UI_UX_SPEC.md` — visual system and interface behavior.
4. `docs/04_APP_FLOW.md` — routes, workflows, states and failure handling.
5. `brain.md` — persistent instructions and progress ledger for Antigravity.
7. `docs/05_AUTOMATION_AND_FREE_DEPLOYMENT.md` — 08:00 scheduling and free-tier trade-offs.
8. `docs/06_ANTIGRAVITY_BUILD_PLAN.md` — staged prompts to paste into Antigravity.
9. `docs/08_STEP_BY_STEP_SETUP.md` — beginner-friendly setup, deployment, schedule and troubleshooting.
10. `docs/09_REAL_NEWS_INTEGRATION_CHECKLIST.md` — strict real-feed verification and acceptance gate.
11. `.env.example` — configuration names only; never place real secrets in this file.
12. `.github/workflows/daily-newspaper.yml` — GitHub Actions scheduled generation plus Gmail link notification.

## Recommended zero-cost-first MVP
- Frontend and server: Next.js App Router + TypeScript.
- Database/auth: Supabase free tier, subject to current quotas and policies.
- Hosting: Vercel free tier for personal/non-commercial use, subject to current terms.
- News collection: RSS/Atom feeds whose terms permit this use.
- Daily schedule: GitHub Actions scheduled workflow as a simple starter; its timing is best-effort, not an exact-time SLA.
- Gmail notification: the scheduled workflow emails the saved edition link after successful generation using Gmail SMTP and a Google App Password. Configure secrets in GitHub Actions; Gmail limits and schedule delays apply.
- AI summaries: optional adapter. The MVP must still work without a paid AI API by showing source-provided titles/descriptions and deterministic snippets. Add an AI provider only after confirming a genuinely free quota or running a local model on always-on hardware.

## Important meaning of “free end-to-end”
The design avoids mandatory paid APIs, but no document can guarantee a permanently free service. Free-tier quotas, provider terms, email limits, scheduled-job reliability and hosting policies can change. A custom domain is usually an additional cost. Do not promise exact 08:00 delivery from GitHub Actions; it is a best-effort scheduler. If exact delivery becomes essential, use a scheduler with an explicit SLA or a self-hosted always-on runner.

## Real-news-only rule (critical)
- The running UI must never display sample, mock, placeholder, hard-coded or invented stories. Visible stories must be fetched from verified live RSS/Atom sources and retain publisher attribution and original links.
- Synthetic fixtures are permitted only in automated tests and must never be imported into the UI or seeded into the database.
- If feeds are unavailable or no relevant stories exist, show an honest empty/error state or a shorter edition. Never pad the newspaper.
- Follow the revised build sequence in `docs/06_ANTIGRAVITY_BUILD_PLAN.md`: verify real feeds first, then connect the UI directly to live/persisted real data.

## Build rules
- Do not build all features in one prompt. Follow `docs/06_ANTIGRAVITY_BUILD_PLAN.md` one milestone at a time.
- Ask Antigravity to inspect the repository and `brain.md` before every task.
- After each milestone: run lint, typecheck, tests and build; inspect the diff; commit a working checkpoint.
- Use only public RSS/Atom metadata and permitted article excerpts. Link to publishers and do not copy full articles.
- The app must show source name, original publication time when available, original link, and a clear “generated summary” label for summaries.
- Store secrets in environment variables; never commit `.env.local` or private service keys.

## Editorial focus (important)
This is not a general-purpose newspaper. `docs/07_AI_STUDENT_EDITORIAL_POLICY.md` is authoritative for what qualifies as news. Every edition should help an IT student understand what changed in AI, which new models/tools matter, what evidence supports the claims, and what they can learn or build next.
