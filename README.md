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
13. `docs/12_DEPLOYMENT_AND_ACCEPTANCE_GUIDE.md` — production deployment instructions, quota disclosures and 5 mandatory acceptance gates.

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

## Protected Generation API (`POST /api/generate`) & Local Invocation

The generation pipeline is exposed via `POST /api/generate` as specified in the Technical Requirements Document (`docs/02_TRD.md`).

### Security & Invariants
- **Authentication**: Requires a server-side `GENERATION_SECRET`. Bearer token (`Authorization: Bearer <GENERATION_SECRET>`) or custom header (`x-generation-secret: <GENERATION_SECRET>`) is verified in constant time (`crypto.timingSafeEqual`) to prevent timing attacks. Missing or invalid credentials return `401 Unauthorized`. If the secret is not configured on the server, returns `503 Service Unavailable`.
- **Concurrency Control**: Prevents concurrent duplicate generation runs. If a generation job is already active, incoming requests are rejected with `409 Conflict`.
- **Abuse Protection**:
  - Sliding-window rate limiter blocks rapid request flooding (`429 Too Many Requests`).
  - Cooldown timer enforces spacing between successive runs (`429 Too Many Requests` with `Retry-After` header).
  - Payload size cap rejects oversized requests (`413 Payload Too Large` for >64KB payloads).
- **Validation**: Enforces strict Zod validation:
  - `issueDate`: Valid calendar date in `YYYY-MM-DD` format (rejects impossible calendar dates like `2026-02-31`).
  - `timezone`: Valid IANA timezone name (e.g. `Asia/Kolkata`, `UTC`).
  - `limit`: Integer between 5 and 100.
  - `force`: Boolean to bypass cache.
  - `trigger`: `'manual' | 'scheduled'`.
- **Source & Article Counts**: Returns breakdown metrics without leaking credentials:
  - `sourcesFetched`: Number of candidate feed sources queried.
  - `sourcesAccepted`: Number of sources that succeeded and returned valid news articles.
  - `sourcesRejected`: Sources that were disabled, unhealthy, or filtered out.
  - `sourcesFailed`: Number of sources that encountered network or HTTP errors.
  - `articlesFetched`: Total raw articles parsed from live feeds.
  - `articlesAccepted`: Ranked qualifying stories for the edition.
  - `articlesRejected`: Articles removed due to duplicates, freshness cutoff, or lower ranking score.

---

### Local Invocation Instructions

#### 1. Configure the Generation Secret
In your `.env.local` file, set a strong random generation secret:
```bash
GENERATION_SECRET="local-dev-secret-key-123456"
```

#### 2. Start the Local Server
```bash
npm run dev
```
The server will start at `http://localhost:3000`.

#### 3. Trigger Generation

##### Option A: Using the CLI Runner (Recommended)
You can trigger generation using the built-in CLI helper:
```bash
# Default trigger (current date in Asia/Kolkata)
npm run generate

# Or specify custom parameters
npx tsx scripts/trigger-generate.ts --date=2026-10-19 --timezone=Asia/Kolkata
```

##### Option B: Using cURL (Linux / macOS / Git Bash)
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Authorization: Bearer local-dev-secret-key-123456" \
  -H "Content-Type: application/json" \
  -d '{
    "issueDate": "2026-10-19",
    "timezone": "Asia/Kolkata",
    "limit": 50,
    "force": true
  }'
```

##### Option C: Using PowerShell (Windows)
```powershell
$headers = @{
  "Authorization" = "Bearer local-dev-secret-key-123456"
  "Content-Type"  = "application/json"
}

$body = @{
  "issueDate" = "2026-10-19"
  "timezone"  = "Asia/Kolkata"
  "limit"     = 50
  "force"     = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/generate" `
  -Method POST `
  -Headers $headers `
  -Body $body
```

---

### Example Response Payload

```json
{
  "success": true,
  "editionUrl": "http://localhost:3000/history/2026-10-19",
  "issueDate": "2026-10-19",
  "articleCount": 24,
  "editionStatus": "ready",
  "sourcesFetched": 16,
  "sourcesAccepted": 14,
  "sourcesRejected": 2,
  "sourcesFailed": 0,
  "articlesFetched": 92,
  "articlesAccepted": 24,
  "articlesRejected": 68,
  "counts": {
    "sourcesFetched": 16,
    "sourcesAccepted": 14,
    "sourcesRejected": 2,
    "sourcesFailed": 0,
    "articlesFetched": 92,
    "articlesAccepted": 24,
    "articlesRejected": 68
  },
  "durationMs": 1420
}
```

### Stable Error Codes
| Status | Error Code | Description |
|---|---|---|
| `400` | `INVALID_JSON` / `VALIDATION_FAILED` | Malformed JSON or invalid parameter (e.g., impossible calendar date or invalid timezone). |
| `401` | `UNAUTHORIZED` | Missing or invalid `GENERATION_SECRET` bearer token. |
| `405` | `METHOD_NOT_ALLOWED` | GET request attempted; endpoint only accepts POST. |
| `409` | `CONCURRENT_RUN_IN_PROGRESS` | Another generation job is currently running. |
| `413` | `PAYLOAD_TOO_LARGE` | Request payload exceeds 64KB cap. |
| `429` | `RATE_LIMIT_EXCEEDED` | Request frequency exceeds sliding-window limit or cooldown. |
| `502` | `ALL_SOURCES_FAILED` | All live sources failed and no prior edition could be preserved. |
| `503` | `SERVER_MISCONFIGURED` | `GENERATION_SECRET` is not set in server environment. |

---

## Optional AI Summaries & Zero-Cost-First Resilience

AI summaries are **optional and disabled by default** (`AI_SUMMARIES_ENABLED="false"` or omitted). The application does not require any paid AI APIs to generate, display, or archive daily editions.

### Behavior & Fallback
- **Default State**: Uses genuine source snippets and publisher excerpts (`summaryKind: 'source_snippet'`), badged as `Source excerpt • verified`.
- **Enabling AI Summaries**: Set `AI_SUMMARIES_ENABLED="true"` and configure a provider:
  - **Google Gemini (Free Tier)**: Set `AI_SUMMARY_PROVIDER="gemini"` and `GEMINI_API_KEY="your-gemini-key"`.
  - **OpenAI-Compatible (Groq / Ollama / Local)**: Set `AI_SUMMARY_PROVIDER="openai"` with `OPENAI_API_KEY` and optional `OPENAI_BASE_URL` (e.g., `http://localhost:11434/v1` for local Ollama).
- **Graceful Error Handling**: If an AI provider request times out (>6s), encounters rate limits (HTTP 429), or fails, the generation pipeline silently falls back to the original source description without failing the edition.
- **Editorial Attribution**: Any story enriched by an LLM is transparently badged with `AI-generated summary` in accordance with `docs/07_AI_STUDENT_EDITORIAL_POLICY.md`.

---

## Gmail Link Notifications & Delivery Safety

Scheduled delivery sends an email containing a link to the published edition via Gmail SMTP.

### Google App Password Requirements
1. **2-Step Verification**: Your Google account must have 2-Step Verification enabled.
2. **16-Character Password**: Google generates a 16-character App Password (e.g., `abcd efgh ijkl mnop`). Any spaces are automatically sanitized by the adapter.
3. **Daily Quota**: Personal Gmail accounts have a sending limit of **500 emails/day** (Google Workspace accounts have a limit of 2,000/day). Because this newspaper sends a single link notification per daily run, quota consumption is negligible (~1 email/day).

### Non-Destructive In-App Resilience
The in-app newspaper **never depends on email delivery**. If `NEWSPAPER_GMAIL_ADDRESS` or `NEWSPAPER_GMAIL_APP_PASSWORD` are absent, misconfigured, or if Google SMTP encounters a temporary failure:
- The edition generation succeeds.
- The web edition remains 100% accessible to readers on the web.
- The delivery adapter records `skipped: true` or reports the error without invalidating the edition.

### Dry-Run & Test Safety
To prevent accidental emails during testing or CI:
- **Automated Tests**: In `NODE_ENV === 'test'`, network sockets are completely disabled. The adapter runs in simulation mode and never contacts Gmail.
- **Delivery Test Endpoint (`POST /api/delivery/test`)**: Test the delivery adapter safely without sending real emails:
  ```bash
  curl -X POST http://localhost:3000/api/delivery/test \
    -H "Authorization: Bearer local-dev-secret-key-123456" \
    -H "Content-Type: application/json" \
    -d '{ "dryRun": true }'
  ```
  Returns:
  ```json
  {
    "success": true,
    "dryRun": true,
    "skipped": false,
    "recipient": "student.editor@gmail.com",
    "messageId": "<simulated-1740000000000@gmail.com>",
    "details": "[DRY-RUN] Simulated link email to student.editor@gmail.com for edition 2026-10-19. No network request was made."
  }
  ```

