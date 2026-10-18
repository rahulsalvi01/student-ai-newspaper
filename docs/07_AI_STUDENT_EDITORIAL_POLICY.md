# 07 — AI & IT Student Editorial Policy

## Mission
This is a practical AI-and-computing briefing for an IT student—not a general newspaper. Every edition should help the reader understand what changed, why it matters technically, what to learn or try, and what to watch next.

## Editorial promise
Prioritise verified developments in AI models, model releases, coding assistants, AI agents, developer tools, open-source models, research papers, APIs, cloud/compute, cybersecurity relevant to AI, and student career skills. Exclude celebrity, generic political, lifestyle, and unrelated breaking news unless it directly affects AI/technology or students.

## Default sections and daily budget (20–30 stories maximum)
1. **The 5-Minute Brief** — 3–5 highest-impact updates with a one-sentence why-it-matters.
2. **New Models & Releases** — model name/version, publisher, release date, capabilities, availability, pricing/licensing if verified, access link.
3. **AI Tools for Developers** — coding assistants, IDEs, APIs, agents, frameworks, local inference, workflow improvements.
4. **Research Worth Knowing** — papers, benchmarks, evaluations, datasets; explain maturity and limitations.
5. **Open Source & Build** — open-weight models, GitHub projects, Hugging Face releases, libraries and practical demos.
6. **Industry & Infrastructure** — chips, inference costs, cloud platforms, regulation/safety only when relevant to builders.
7. **Student Action Desk** — one small project/lab, one concept to learn, one portfolio/career implication, each grounded in a story or credible learning resource.
8. **Watchlist / What’s Unclear** — claims needing independent verification, upcoming events, missing pricing/weights/benchmarks.

## Relevance scoring (0–100)
- Direct usefulness to an IT student/developer: 0–25
- New model, capability, release or API/tool change: 0–20
- Hands-on build/learn potential: 0–20
- Source quality / primary evidence: 0–15
- Recency: 0–10
- Independent corroboration: 0–10

Penalties: duplicate/syndicated copy −15; vague hype without evidence −15; outside the editorial mission −30; stale item presented as new −20. A high score never overrides a credibility concern. Keep source diversity and avoid filling the edition with one company's announcements.

## Required article card format
- Headline and publisher
- Published date/time and original link
- `What happened` — factual, short summary
- `Why an IT student should care` — specific consequence, not generic hype
- `Technical detail` — model/version, API/library, benchmark, license, price, hardware or limitations only when sourced
- `Try this` — optional practical next step, clearly marked as an idea rather than reported fact
- `Confidence` — Primary source / independently corroborated / preliminary claim
- `Summary type` — Source excerpt or AI-generated summary

## Accuracy and model-release rules
- Prefer official release notes/model cards/docs for release facts; use independent reporting or evaluation to contextualise performance claims.
- Never present a vendor benchmark as an independent result. Attribute it: “The company reports…”.
- Distinguish **open-source**, **open-weight**, and **API-only**; do not call a model open-source unless the license and release artifacts support that term.
- Record exact model name, version, announcement date, availability and region where stated. Do not infer an unspecified launch date or price.
- Treat benchmark scores, model rankings and “best model” claims as dated and task-specific.
- Research papers are not necessarily peer-reviewed, reproduced or production-ready. Label arXiv/preprints accordingly.
- For fast-moving stories, label early or unconfirmed claims and seek a second reliable source. If uncertain, omit rather than invent.
- Show source links on every card; do not copy full articles or bypass paywalls.
- If no AI summarisation provider is configured, display source descriptions/snippets with clear labelling; do not fabricate a student takeaway.

## Starter source registry (verify feeds and terms during implementation)
**Primary/official:** OpenAI News (`https://openai.com/news/rss.xml`); Google DeepMind blog (`https://deepmind.google/blog/rss.xml`); Google AI blog (`https://blog.google/technology/ai/rss/`); Hugging Face blog (`https://huggingface.co/blog/feed.xml`); NVIDIA blog (`https://blogs.nvidia.com/feed/`); Microsoft Research (`https://www.microsoft.com/en-us/research/feed/`); Meta Engineering (`https://engineering.fb.com/feed/`); AWS AI blog (`https://aws.amazon.com/blogs/ai/feed/`); Apple Machine Learning Research (`https://machinelearning.apple.com/rss.xml`). Some publishers may not expose stable feeds or may change URLs; implement feed health checks and allow admin edits.

**Independent context:** TechCrunch AI (`https://techcrunch.com/category/artificial-intelligence/feed/`); The Decoder (`https://the-decoder.com/feed/`); MIT Technology Review AI (`https://www.technologyreview.com/topic/artificial-intelligence/feed`). Treat media reports as secondary evidence and link to primary sources when available.

**Research:** arXiv categories/search feeds for cs.AI, cs.LG, cs.CL and cs.SE; configure narrowly targeted queries rather than ingesting every paper. Paper relevance should consider abstract, authors/institution, code/dataset availability, and whether results are evaluated or merely proposed.

**Feed policy:** verify each URL works at setup time, record last success, apply timeouts and size limits, respect terms/robots/access restrictions, and disable failing feeds instead of silently pretending coverage is complete. RSS URLs above are starter candidates, not a guarantee of current availability.

## Acceptance tests
- At least 70% of top-ranked stories directly concern AI/model/tool/research/developer practice.
- Every model release card includes exact model/version and a primary source, or is marked unverified and excluded from the top brief.
- No duplicate canonical URLs in an edition.
- At least 3 publishers represented when enough relevant sources are available.
- At least one actionable student takeaway appears only when supported by the story.
- If fewer than 5 trustworthy relevant stories exist, publish a shorter edition and explain low coverage; never pad with irrelevant content.
