# 10 — Gmail Delivery: Email the Newspaper Link When Ready

## Intended behavior
Every successful scheduled generation should save the real-news edition first, then email its link to the configured Gmail inbox. The email contains a link and a small amount of metadata, not copied articles. If generation fails, do not send a success email. If email fails, keep the saved edition accessible on the website and report the delivery failure in GitHub Actions.

## How it works
1. GitHub Actions starts on its best-effort 08:00 IST schedule (`30 2 * * *` UTC) or when manually dispatched.
2. It calls the protected generation endpoint. The endpoint must wait until the edition is saved before returning HTTP 2xx.
3. Its JSON response must include `editionUrl` as an absolute HTTPS URL, `issueDate`, and `articleCount`. Do not return a fake URL or claim success before persistence completes.
4. GitHub Actions fetches active recipients dynamically from `/api/subscribers/recipients` using `NEWSPAPER_GENERATE_SECRET` (falling back to `NEWSPAPER_GMAIL_ADDRESS` if no subscribers exist in the database), logs into Gmail SMTP over SSL, and sends the link email to all active recipients.

## Configure Gmail safely
1. Use the Gmail account from which you want to send the notice.
2. If Google permits it for your account, enable 2-Step Verification and create a Google App Password for this workflow. Do not use your normal Google password. Some managed/workspace accounts or security configurations may not offer App Passwords.
3. In the GitHub repository, open **Settings → Secrets and variables → Actions** and add:
   - `NEWSPAPER_GMAIL_ADDRESS` — your full Gmail address (sender and fallback recipient).
   - `NEWSPAPER_GMAIL_APP_PASSWORD` — the App Password; store only as a secret.
   - `NEWSPAPER_GENERATE_URL` — the deployed protected generation endpoint URL.
   - `NEWSPAPER_GENERATE_SECRET` — same value as server-side `GENERATION_SECRET`.

> **Note on Recipients:** Static repository recipient secrets are not used. Recipients are stored in Supabase (`subscribers` table) as the single source of truth and fetched dynamically at send time via `/api/subscribers/recipients`. Subscribers can join via the website Subscribe box, and manual recipients can be added with `npm run add-recipient <email>`. Unsubscribing immediately stops delivery.
4. Run the workflow manually once. Confirm that the edition was generated and the email arrives with the correct link. Open the link on mobile and desktop.
5. Check the Actions run if email is not received. Verify secrets, the Gmail App Password, spam folder, endpoint response fields, and the link's public accessibility. Never paste passwords into chat or commit them to the repository.

## Limits and honest expectations
- This does not require a paid AI API or a separate paid email API.
- Gmail has sending limits and may block suspicious activity; it is not an unlimited bulk-email service.
- GitHub scheduled workflows are best-effort, so the email may arrive after 08:00 IST.
- This setup sends a link notification; it does not attach the newspaper or copy publisher articles into email.
- Email delivery failure must not delete or invalidate the saved edition.
