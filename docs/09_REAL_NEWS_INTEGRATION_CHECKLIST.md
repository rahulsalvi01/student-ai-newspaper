# 09 — Real News Integration: Required Implementation Checklist

## Outcome
The deployed newspaper must ingest and display genuine, recently published AI/technology stories from live publishers from its first working version. A polished page with fake content is not a valid milestone.

## Non-negotiable rules
- Never create demo/sample/placeholder headlines, hard-coded article arrays, seeded fake database rows, or fallback story cards.
- Never invent publisher names, URLs, timestamps, model names, release details, benchmarks, prices, or licenses.
- A story can render only if it was retrieved from an enabled source and has a valid original URL plus a non-empty title.
- Test fixtures are permitted only inside automated tests and must not be imported by application code.
- If no valid stories are available, show an honest empty/error state and source-health information.
- If only a small number of relevant stories are available, display only those stories.
- Do not scrape full article text or bypass paywalls. Use permitted RSS/Atom metadata, official APIs where terms allow, and links to publishers.

## Feed verification gate
Before building story cards, Antigravity must run a real network verification for every candidate feed in `docs/07_AI_STUDENT_EDITORIAL_POLICY.md` and produce a table containing:

- Publisher and feed URL
- Fetch timestamp in UTC
- HTTP status / network result
- RSS or Atom parse result
- Count of valid entries
- Newest valid entry publication timestamp (or `not provided`)
- Example original article URL retrieved from that feed
- Whether enabled, and reason if disabled

Do not claim a source works without a successful fetch and parse. URLs in the editorial policy are candidate starting points, not a promise of current availability. Network restrictions in the development environment must be reported as a blocker, never treated as proof that a source is valid.

## Recommended source order
1. Official release notes, official company newsrooms, model cards and developer documentation for factual release details.
2. Research feeds such as narrowly filtered arXiv categories/queries for papers; label preprints and unreviewed work.
3. Independent technology journalism for context and corroboration.
4. Open-source project release feeds and repositories for code/tool releases.

Use the candidate source list in `docs/07_AI_STUDENT_EDITORIAL_POLICY.md`. Verify each source at runtime/setup time. Keep source URLs configurable in a server-only registry; never make the browser fetch feeds directly.

## Implementation sequence
1. **Verify feeds:** fetch and parse candidate feeds; disable broken sources with a logged reason.
2. **Ingest:** normalise metadata, validate URL scheme, enforce timeout and response-size limits, store fetch time separately from publication time.
3. **Deduplicate:** canonicalise URLs conservatively; use database uniqueness to prevent duplicate stories.
4. **Filter:** reject irrelevant, malformed, stale, undated-when-date-required, or low-confidence stories according to the editorial policy. Do not assume every entry in an AI feed is relevant.
5. **Rank:** apply the documented IT-student usefulness score, source-quality checks, freshness, and publisher diversity.
6. **Persist:** store only fetched metadata and source provenance. Make daily edition generation idempotent.
7. **Render:** show publisher, original link, publication time when available, fetched/updated time, category and provenance labels.
8. **Recover:** a failed feed should not block healthy feeds. If every feed fails, preserve the last good edition and show a warning. If no relevant articles qualify, show a genuinely empty/short edition.
9. **Automate:** invoke the same generation service manually and from the daily scheduler. Do not create a separate code path for scheduled runs.
10. **Prove:** run the acceptance checks below against actual fetched records.

## Story provenance fields
Every visible story must be traceable to:
- `source_id` and source name
- `canonical_url`
- `title`
- `published_at` if the publisher supplies it
- `fetched_at`
- original feed entry URL / source URL
- `summary_kind` such as `source_snippet` or `ai_generated`
- confidence/provenance label, such as `primary source`, `independent reporting`, or `preprint`

Do not display an AI-generated summary as a quote from the publisher. If no AI provider is configured, use a clearly labelled source-provided description or omit the summary.

## Required empty, partial and error states
- **No sources configured:** “News sources are not configured yet.” Show a safe setup action to the owner.
- **All sources failed:** “We couldn't refresh news from the configured sources.” Keep the last good edition if one exists and show last successful update.
- **No relevant articles:** “No verified stories matched your topics in this update.” Do not fill the page with old or unrelated content.
- **Partial source failure:** show the edition with a discreet warning and the number of sources that failed.
- **No previous edition:** show the honest empty state, not fabricated content.

## Acceptance gate — all must pass
- [ ] At least three distinct live sources have successfully fetched and parsed real entries during the test, where the sources are available.
- [ ] A visible story is confirmed to exist in a retrieved feed entry and its original publisher page opens.
- [ ] Visible article records can be traced to actual fetch logs and source IDs.
- [ ] No fake/sample/placeholder story is rendered or seeded.
- [ ] No duplicate canonical URLs occur in one edition.
- [ ] Publication time and fetch time are stored and labelled separately.
- [ ] Partial failures do not discard valid stories from healthy sources.
- [ ] Total feed failure preserves the last good edition or displays an honest empty state.
- [ ] A second generation for the same date is idempotent.
- [ ] The scheduled workflow and manual run call the same protected generation path.
- [ ] Lint, typecheck, tests and production build pass.

## Required report from Antigravity
At the end of source integration, return:
1. The exact feeds verified and disabled, with evidence.
2. Number of real articles fetched, accepted, rejected and deduplicated.
3. Latest publication date/time observed per source.
4. A link to a real displayed article and the publisher page.
5. Test/lint/typecheck/build results.
6. Any unresolved blocker. Do not claim deployment or automation is live until it is actually configured and tested.
