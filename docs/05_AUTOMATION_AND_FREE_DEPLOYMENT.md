# 05 — Daily 08:00 Automation and Free-First Deployment

## 1. Daily timing
Default target: **08:00 Asia/Kolkata (IST)**. India does not currently use seasonal daylight-saving changes. 08:00 IST corresponds to 02:30 UTC.

A GitHub Actions schedule can be configured as `30 2 * * *`. GitHub's scheduled workflows are best-effort and may be delayed during load; they do not guarantee delivery at precisely 08:00. Ensure the workflow file exists on the repository's default branch and verify current GitHub plan/usage limits.

## 2. Suggested MVP execution
1. GitHub Actions starts at 02:30 UTC.
2. It sends an authenticated POST to `/api/generate`.
3. The server verifies the generation secret.
4. The generation job fetches configured RSS/Atom feeds, normalises and deduplicates stories, ranks them and stores the edition.
5. The generation endpoint returns only after the edition is saved and includes `editionUrl`, `issueDate`, and `articleCount` in its JSON response.
6. GitHub Actions dynamically fetches active recipients from the protected `/api/subscribers/recipients` endpoint (using `NEWSPAPER_GENERATE_SECRET`), with fallback to `NEWSPAPER_GMAIL_ADDRESS` if the list is empty. It then sends the HTTPS edition link using Gmail SMTP and a Google App Password.
7. The workflow records status and exits non-zero if generation or email delivery fails. The saved in-app edition remains available even if email fails.
8. Monitor failures through workflow history and application run logs.

If deployment platform request duration is too short for feed collection, use a runner that executes the generation script directly or a background-job service. Do not assume serverless functions can run indefinitely.

## 3. Free-first stack and caveats
- Antigravity: used to build the project; it is not the production scheduler.
- GitHub: repository and scheduled workflow; quotas and scheduled-run behavior depend on current terms.
- Supabase: database/auth free tier; check project pause behavior, storage, database and request limits.
- Vercel: hosting free tier may be limited to personal/non-commercial use and has usage limits.
- RSS/Atom: prefer publisher-provided feeds; respect terms, robots policies where applicable, copyright, and attribution requirements.
- Email: optional. Free tiers can change and may require domain verification. If no reliable free sender is configured, keep the edition available in the website and skip email.
- AI: not required for MVP. Do not put a paid model API in the critical path. If a free quota is available, treat it as optional and enforce limits. Local inference is not “cloud-free” unless an always-on computer is available.
- Custom domain: usually not free.
- Always-on uptime and exact delivery: cannot be guaranteed by a collection of free tiers.

## 4. Security setup
Create secrets in GitHub repository Settings → Secrets and variables → Actions:
- `NEWSPAPER_GENERATE_URL`: deployed generation endpoint URL.
- `NEWSPAPER_GENERATE_SECRET`: same secret configured server-side as `GENERATION_SECRET`.
- `NEWSPAPER_GMAIL_ADDRESS`: the Gmail account that sends the notification (typically your own Gmail).
- `NEWSPAPER_GMAIL_APP_PASSWORD`: Google App Password for that Gmail account; never use your normal Google account password. App Passwords generally require 2-Step Verification and may be unavailable for some managed/security configurations.

> **Recipient Management:** Individual recipient emails are **not** stored in GitHub Secrets. Supabase is the single source of truth. The workflow queries `/api/subscribers/recipients` at dispatch time. Add recipients either via the website Subscribe form or by running `npm run add-recipient <email>`.

Never put any secret directly into workflow YAML. Restrict repository access. Rotate the secret if exposed. Use separate development and production secrets.

## 5. Test before activation
- Run generation manually against test feeds.
- Verify target issue date is correct in `Asia/Kolkata`.
- Test one invalid feed, one slow feed, and all feeds failing.
- Test repeated generation for the same issue date.
- Confirm a failed run preserves the last good edition.
- Confirm the workflow logs contain no secrets.
- Run a manual workflow dispatch before relying on the schedule.
- Check the next day's actual start time and monitor for at least a week.

## 6. Gmail delivery of the ready edition
The scheduled workflow is configured to email the edition link after generation completes successfully. To activate it:
1. In your Google Account, enable 2-Step Verification if eligible, then create an App Password for this project. Never use your normal Google password. Google may restrict App Passwords for managed accounts or accounts with certain security settings.
2. In the GitHub repository, open Settings → Secrets and variables → Actions and add `NEWSPAPER_GMAIL_ADDRESS` and `NEWSPAPER_GMAIL_APP_PASSWORD`. Recipients are dynamically fetched from Supabase via `/api/subscribers/recipients` at send time; if no subscribers exist, the email is delivered to `NEWSPAPER_GMAIL_ADDRESS`.
3. Make the protected generation endpoint return JSON containing `editionUrl` (an absolute HTTPS URL), `issueDate`, and `articleCount` only after the edition has been saved. The workflow validates `editionUrl` before sending.
4. Run the workflow manually and confirm the email arrives, the link opens the deployed edition, and no credentials appear in logs.
5. If generation succeeds but email fails, the newspaper remains available on the website; inspect Actions logs and retry after fixing Gmail settings.

Gmail has sending limits and anti-abuse controls. Delivery is best-effort, and GitHub Actions itself can start late. This is a notification containing the edition link, not a copy of publisher articles. Do not send real email from automated tests.
