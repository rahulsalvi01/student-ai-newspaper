# 12 — Production Deployment & Real-Data Acceptance Guide

**Goal:** Provide end-to-end deployment instructions for the zero-cost-first stack (GitHub, Supabase, Vercel, Gmail SMTP), detail real-world provider quotas and caveats, and establish a strict acceptance checklist requiring live news verification.

---

## 1. Free-First Stack & Quota Disclosures

> [!IMPORTANT]
> **No free tier is unlimited.** All services below operate under explicit usage policies, rate limits, and operational caveats. Do not promise permanent zero-cost uptime or exact 08:00:00 SLA without reviewing these quotas.

| Provider | Role in Architecture | Free-Tier Limits & Operational Caveats |
|---|---|---|
| **Vercel** | Next.js Hosting & Serverless Functions | • **Hobby Plan**: Restricted to personal and non-commercial projects.<br>• **Execution Timeout**: 10s default, max 60s for Serverless Functions. (The generation route sets `export const maxDuration = 60;`).<br>• **Bandwidth**: 100 GB/month; 100 edge requests/sec.<br>• **Cold Starts**: Serverless functions spin down when inactive. |
| **Supabase** | Managed PostgreSQL Storage | • **Database Storage**: 500 MB (sufficient for ~150,000 article metadata rows).<br>• **Direct Connections**: 60 connection pool limit.<br>• **7-Day Inactivity Pausing**: Free-tier projects are paused automatically if no database query occurs for 7 consecutive days. (The daily 08:00 schedule serves as a heartbeat, but if disabled for a week, you must manually unpause). |
| **GitHub** | Code Repository & Daily Workflow Scheduler | • **Actions Minutes**: 2,000 minutes/month for private repositories; unlimited for public.<br>• **Best-Effort Scheduling**: Cron schedules are queued behind paying customers; execution may be delayed by 5–30 minutes during peak GitHub load.<br>• **Job Timeout**: Hard cap of 6 hours per job (our workflow timeout is set to 10 minutes). |
| **Gmail SMTP** | Scheduled Edition Link Notification | • **Daily Quota**: 500 emails/day for standard personal `@gmail.com` accounts.<br>• **Authentication**: Requires Google 2-Step Verification and a generated **16-character Google App Password** (regular passwords are rejected).<br>• **Anti-Abuse**: Rapid bursts or suspicious traffic can trigger temporary sending blocks. |
| **RSS/Atom Feeds** | Primary Data Ingestion | • **Publisher Limits**: Some publishers enforce Cloudflare rate limits, bot checks, or deprecate feed paths.<br>• **SSRF & Size**: Feeds are capped at 5 MB and 8-second timeouts per request. |

---

## 2. Step-by-Step Deployment Instructions

### Phase 1 — Supabase PostgreSQL Database Setup
1. Log in to [supabase.com](https://supabase.com) and click **New project**.
2. Set a project name (e.g., `student-ai-newspaper`) and generate a strong database password.
3. Select your closest region (e.g. `ap-south-1` / Mumbai for India-centric low latency).
4. Navigate to the **SQL Editor** tab in the left sidebar.
5. Open [`supabase/migrations/20261018000000_initial_schema.sql`](file:///d:/PROJECTS/student-ai-newspaper/supabase/migrations/20261018000000_initial_schema.sql) in this repository, copy its entire contents, and paste it into the Supabase SQL Editor.
6. Click **Run**. Verify that all 7 tables are created under **Table Editor**:
   - `profiles`
   - `sources`
   - `articles`
   - `editions`
   - `edition_stories`
   - `generation_runs`
   - `delivery_logs`
7. Navigate to **Project Settings → API** and copy:
   - **Project URL** (e.g. `https://xyzcompany.supabase.co`)
   - **`anon` public key** (Safe for browser client)
   - **`service_role` secret key** (Server-only; bypasses RLS for scheduled background ingestion)

---

### Phase 2 — GitHub Repository Setup
1. Create a new GitHub repository (public or private):
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/student-ai-newspaper.git
   git branch -M main
   git push -u origin main
   ```
2. Verify that `.gitignore` prevents `.env.local` and `.next/` from being pushed to Git.
3. In GitHub, open **Settings → Secrets and variables → Actions** and add the repository secrets:

| Secret Name | Value to Set |
|---|---|
| `NEWSPAPER_GENERATE_URL` | Your production endpoint: `https://YOUR_APP.vercel.app/api/generate` |
| `NEWSPAPER_GENERATE_SECRET` | A strong 32+ character random secret (matching server `GENERATION_SECRET`) |
| `NEWSPAPER_GMAIL_ADDRESS` | Your full Gmail address (sender and fallback recipient) |
| `NEWSPAPER_GMAIL_APP_PASSWORD` | 16-character Google App Password (without spaces) |

> **Dynamic Recipient Delivery:** No static recipient secret is needed. The automated dispatch job dynamically queries `/api/subscribers/recipients` at send time. Supabase (`subscribers` table) is the single source of truth. Users can subscribe via the website form, and you can add manual recipients anytime with `npm run add-recipient <email>`. If the database has no subscribers, the workflow exits cleanly without sending. Unsubscribing immediately stops delivery.

---

### Phase 3 — Vercel Production Deployment
1. Log in to [vercel.com](https://vercel.com) and click **Add New → Project**.
2. Import your GitHub repository `student-ai-newspaper`.
3. Under **Environment Variables**, add the production variables:

```ini
NEXT_PUBLIC_APP_NAME="Student AI Newspaper"
NEXT_PUBLIC_APP_URL="https://YOUR_PROJECT_NAME.vercel.app"

# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."

# Protected Generation Secret (MUST match NEWSPAPER_GENERATE_SECRET in GitHub Actions)
GENERATION_SECRET="YOUR_STRONG_RANDOM_SECRET_KEY"

# Operational Defaults
DEFAULT_TIMEZONE="Asia/Kolkata"
DAILY_GENERATION_CRON="30 2 * * *"
MAX_ARTICLES_PER_SOURCE="100"
FEED_TIMEOUT_MS="10000"
```

4. Click **Deploy**. Vercel will run `npm run build` and output your live production URL (e.g. `https://student-ai-newspaper.vercel.app`).
5. Update `NEXT_PUBLIC_APP_URL` in Vercel to match the exact assigned domain and trigger a redeploy if needed.

---

## 3. Real-Data Acceptance Checklist (Mandatory Gates)

> [!CAUTION]
> **Zero Tolerance for Fake News:** Screenshots, test outputs, or UI cards that show synthetic fixtures (`example.com`, "Lorem Ipsum", or mocked headlines) are **STRICTLY DISQUALIFIED** as evidence of news functionality. Every visible article must trace back to a live verified network request.

### Acceptance Gate 1: Live Feed Fetch Verification
- [ ] Run feed verification: `npm run verify-feeds`.
- [ ] Confirm at least 3 distinct primary/independent feeds return HTTP 200 with valid parsed entries.
- [ ] Confirm no candidate feed URL scheme is insecure or rejected (must be valid `https:` or `http:`).
- [ ] Unhealthy or broken feeds are explicitly logged as disabled with documented reasons; no broken feed is quietly claimed as working.

### Acceptance Gate 2: Real Article Publisher Link Opening
- [ ] Open the live production newspaper in a browser.
- [ ] Inspect the lead story and click the original publisher link (e.g. "Read original↗" or publisher domain).
- [ ] Confirm the link navigates to the authentic external publisher page (e.g., `https://openai.com/index/...`, `https://deepmind.google/blog/...`, `https://the-decoder.com/...`).
- [ ] Confirm the article headline on your newspaper matches the external article headline.

### Acceptance Gate 3: Successful Edition Persistence
- [ ] In the Supabase dashboard **Table Editor**, inspect `editions`:
  - `issue_date`: Valid dated entry (e.g. `2026-10-19`).
  - `status`: `'ready'` or `'partial'`.
  - `article_count`: Positive integer matching displayed stories.
- [ ] Inspect `articles`:
  - `canonical_url`: Real publisher URLs.
  - `published_at`: UTC timestamp provided by the publisher.
  - `fetched_at`: Ingestion timestamp.
- [ ] Confirm no duplicate canonical URLs exist in the database.

### Acceptance Gate 4: Manual Generation Test
- [ ] Invoke `POST /api/generate` with an invalid token: verify it returns `401 Unauthorized` (`UNAUTHORIZED`).
- [ ] Invoke `POST /api/generate` with the valid secret:
  ```bash
  curl -X POST https://YOUR_APP.vercel.app/api/generate \
    -H "Authorization: Bearer YOUR_GENERATION_SECRET" \
    -H "Content-Type: application/json" \
    -d '{"trigger":"manual","timezone":"Asia/Kolkata","force":true}'
  ```
- [ ] Confirm it returns HTTP 200 with:
  - `editionUrl`: Absolute `https://YOUR_APP.vercel.app/history/YYYY-MM-DD`
  - `issueDate`: Target date
  - `articleCount`: Total qualifying stories
  - Counts breakdown: `sourcesFetched`, `sourcesAccepted`, `sourcesRejected`, `sourcesFailed`.
- [ ] Confirm the returned JSON does **not** leak the secret, auth token, or database keys.

### Acceptance Gate 5: Successful Scheduled-Run Test
- [ ] In GitHub, navigate to **Actions → Daily newspaper generation**.
- [ ] Click **Run workflow** (manual `workflow_dispatch`).
- [ ] Verify Step 1 (`Trigger protected generation endpoint`) completes with HTTP 200 and prints summary metrics.
- [ ] Verify Step 2 (`Email the ready edition link to Gmail`) validates the HTTPS URL and logs `Edition link emailed successfully`.
- [ ] Check the destination Gmail inbox:
  - Confirm the email arrives with subject: `Your AI & Tech Newspaper is ready — YYYY-MM-DD`.
  - Confirm the body contains the HTTPS link to the live newspaper edition.
  - Click the link on desktop and mobile and confirm the edition opens.
- [ ] Confirm no passwords or secrets appear anywhere in the GitHub Actions execution logs.

---

## 4. Operational Troubleshooting

| Symptom | Cause | Resolution |
|---|---|---|
| `401 Unauthorized` during generation | Mismatched secret | Ensure `NEWSPAPER_GENERATE_SECRET` in GitHub matches `GENERATION_SECRET` in Vercel. |
| `504 Gateway Timeout` on Vercel | Feed fetch took >60s | Verify `maxDuration = 60` is set in `route.ts`. Check if a specific feed is hanging. |
| `All live sources failed` (HTTP 502) | Temporary network block | The pipeline preserves the previous good edition if one exists. Check feed URLs in registry. |
| Supabase query errors | Project paused | Log into Supabase and unpause the project if it was inactive for >7 days. |
| Gmail SMTP `AuthenticationRequired` | Invalid App Password | Re-generate a Google App Password under Google Account → Security → 2-Step Verification. Remove spaces. |
| Scheduled run delayed past 08:00 IST | GitHub Actions load | GitHub cron is best-effort. Verify workflow file is on default branch. |
