import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { editionsRepo } from '../../../lib/db/repository';
import { EditionDateParamSchema } from '../../../lib/preferences/schema';
import { Masthead } from '../../../components/layout/Masthead';
import { InteractiveEditionView } from '../../../components/editorial/InteractiveEditionView';
import { sourceRegistry } from '../../../lib/feeds/registry';
import type { Article } from '../../../types/article';
import type { SourceCategory } from '../../../types/sources';

export const dynamic = 'force-dynamic';

export default async function ArchivedEditionPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const resolvedParams = await params;
  const validation = EditionDateParamSchema.safeParse(resolvedParams.date);

  if (!validation.success) {
    notFound();
  }

  const editionDate = validation.data;
  const data = await editionsRepo.getEditionWithStoriesByDate(editionDate);

  if (!data || data.stories.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <aside
          aria-label="Archive Notice"
          className="mb-4 p-2.5 bg-surface-muted border-l-4 border-border-strong text-xs font-mono text-text-secondary flex items-center justify-between"
        >
          <span>ARCHIVED EDITION: {editionDate} • Asia/Kolkata</span>
          <Link href="/history" className="font-semibold text-text-primary underline ml-2 whitespace-nowrap">
            ← Back to Archive
          </Link>
        </aside>

        <div className="p-8 sm:p-12 border-2 border-border-strong bg-surface text-center my-8">
          <span className="inline-block px-3 py-1 text-xs font-mono uppercase tracking-widest border border-border-strong mb-4">
            Archive Notice
          </span>
          <h2 className="font-serif font-bold text-2xl text-text-primary mb-3">
            No archived edition found for {editionDate}
          </h2>
          <p className="text-sm font-sans text-text-secondary max-w-lg mx-auto leading-relaxed mb-6">
            We preserve only genuine editions generated from verified live sources. No synthetic
            or mock editions are generated for historical dates.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Link
              href="/"
              className="px-6 py-2 bg-text-primary text-background font-semibold text-xs uppercase tracking-wider hover:bg-text-secondary transition-colors"
            >
              Read Today&apos;s Edition
            </Link>
            <Link
              href="/history"
              className="px-6 py-2 border border-border-strong text-text-primary font-semibold text-xs uppercase tracking-wider hover:bg-surface-muted transition-colors"
            >
              View All Archived Editions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const candidateSources = sourceRegistry.getAllSources();
  const candidateMap = new Map(candidateSources.map((s) => [s.id, s]));

  // Map archived stories into typed Article objects
  const articles: Article[] = data.stories.map((story) => {
    const art = story.article;
    const cand = candidateMap.get(art.source_id);
    const sourceName = cand?.name || 'Verified Source';
    const isOfficial = cand?.isOfficial ?? false;
    const isArxiv =
      sourceName.toLowerCase().includes('arxiv') ||
      (art.canonical_url && art.canonical_url.includes('arxiv.org'));

    return {
      id: art.id,
      sourceId: art.source_id,
      sourceName,
      isOfficial,
      category: (story.section as SourceCategory) || (art.category as SourceCategory) || 'general_ai',
      title: art.title,
      canonicalUrl: art.canonical_url,
      originalFeedUrl: art.canonical_url,
      description: story.summary || art.description || '',
      author: art.author,
      publishedAt: art.published_at,
      fetchedAt: art.fetched_at,
      summaryKind: story.summary_kind === 'ai_generated' ? 'ai_generated' : 'source_snippet',
      provenanceLabel: isArxiv
        ? 'Preprint'
        : isOfficial
        ? 'Official release'
        : 'Independent reporting',
      categories: [story.section],
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Archive Header Banner */}
      <aside
        aria-label="Archive Notice"
        className="mb-4 p-2.5 bg-surface-muted border-l-4 border-border-strong text-xs font-mono text-text-secondary flex items-center justify-between"
      >
        <span>ARCHIVED EDITION: {editionDate} • Asia/Kolkata</span>
        <Link href="/history" className="font-semibold text-text-primary underline ml-2 whitespace-nowrap">
          ← Back to Archive
        </Link>
      </aside>

      {/* Masthead */}
      <Masthead
        issueDate={data.edition.issue_date}
        updatedAt={data.edition.generated_at || data.edition.created_at}
        totalStories={articles.length}
        healthySourcesCount={1}
        totalSourcesCount={1}
      />

      {/* Main Content */}
      <main className="mt-8">
        <InteractiveEditionView articles={articles} />
      </main>

      {/* Newspaper Footer */}
      <footer className="mt-16 pt-8 pb-12 border-t-2 border-border-strong text-center text-xs text-text-muted">
        <p className="font-serif font-bold text-sm text-text-primary uppercase tracking-wider mb-2">
          The Daily AI Brief — Archived Edition
        </p>
        <p className="max-w-xl mx-auto mb-3 leading-relaxed">
          Historical record preserved from real source ingestion. Strictly technical and developer-focused.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-mono">
          <span>ARCHIVE DATE: {editionDate}</span>
          <span>•</span>
          <span>TIMEZONE: ASIA/KOLKATA</span>
        </div>
      </footer>
    </div>
  );
}
