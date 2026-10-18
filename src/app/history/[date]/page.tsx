import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { editionsRepo } from '../../../lib/db/repository';
import { EditionDateParamSchema } from '../../../lib/preferences/schema';
import { Masthead } from '../../../components/layout/Masthead';
import { InteractiveEditionView } from '../../../components/editorial/InteractiveEditionView';
import { getLiveNewspaperData } from '../../../lib/feeds/service';
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

  if (!data) {
    const liveData = await getLiveNewspaperData({ limit: 100 });
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Masthead
          issueDate={liveData.issueDate}
          updatedAt={liveData.updatedAt}
          totalStories={liveData.articles.length}
          healthySourcesCount={liveData.sourceHealth.filter((s) => s.status === 'healthy').length}
          totalSourcesCount={liveData.sourceHealth.length}
          sourceHealth={liveData.sourceHealth}
        />

        <main className="mt-8">
          <InteractiveEditionView articles={liveData.articles} />
        </main>

        <footer className="mt-16 pt-8 pb-12 border-t-2 border-border-strong text-center text-xs text-text-muted">
          <p className="font-serif font-bold text-sm text-text-primary uppercase tracking-wider mb-2">
            The Daily AI Brief
          </p>
          <p className="max-w-xl mx-auto mb-3 leading-relaxed">
            Curated and prioritized from live primary and independent feeds. Strictly technical and developer-focused.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-mono">
            <span>EDITION DATE: {editionDate}</span>
            <span>•</span>
            <span>TIMEZONE: ASIA/KOLKATA</span>
          </div>
        </footer>
      </div>
    );
  }

  // Map archived stories into typed Article objects
  const articles: Article[] = data.stories.map((story) => {
    const art = story.article;
    return {
      id: art.id,
      sourceId: art.source_id,
      sourceName: 'Archived Story',
      isOfficial: false,
      category: (story.section as SourceCategory) || (art.category as SourceCategory) || 'general_ai',
      title: art.title,
      canonicalUrl: art.canonical_url,
      originalFeedUrl: art.canonical_url,
      description: story.summary || art.description,
      author: art.author,
      publishedAt: art.published_at,
      fetchedAt: art.fetched_at,
      summaryKind: story.summary_kind === 'ai_generated' ? 'ai_generated' : 'source_snippet',
      provenanceLabel: 'Independent reporting',
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
