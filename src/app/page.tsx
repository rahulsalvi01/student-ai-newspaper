import React from 'react';
import { getLiveNewspaperData } from '../lib/feeds/service';
import { Masthead } from '../components/layout/Masthead';
import { SectionGrid } from '../components/editorial/SectionGrid';
import { EmptyState } from '../components/editorial/EmptyState';
import { SourceHealthPanel } from '../components/editorial/SourceHealthPanel';

// Ensure this page runs dynamically server-side
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const data = await getLiveNewspaperData();
  const healthyCount = data.sourceHealth.filter((s) => s.status === 'healthy').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Partial failure notice if applicable */}
      {data.partialFailureNotice && (
        <aside
          aria-label="Source Availability Notice"
          className="mb-4 p-2.5 bg-surface-muted border-l-4 border-border-strong text-xs font-sans text-text-secondary flex items-center justify-between"
        >
          <span>{data.partialFailureNotice}</span>
          <a
            href="#source-health"
            className="font-semibold text-text-primary underline ml-2 whitespace-nowrap"
          >
            View details
          </a>
        </aside>
      )}

      {/* Editorial Masthead */}
      <Masthead
        issueDate={data.issueDate}
        totalStories={data.articles.length}
        healthySourcesCount={healthyCount}
        totalSourcesCount={data.sourceHealth.length}
      />

      <main className="mt-8">
        {data.articles.length === 0 ? (
          <EmptyState sourceHealth={data.sourceHealth} />
        ) : (
          <>
            <SectionGrid articles={data.articles} />
            <SourceHealthPanel sources={data.sourceHealth} />
          </>
        )}
      </main>

      {/* Newspaper Footer */}
      <footer className="mt-16 pt-8 pb-12 border-t-2 border-border-strong text-center text-xs text-text-muted">
        <p className="font-serif font-bold text-sm text-text-primary uppercase tracking-wider mb-2">
          The Daily AI Brief
        </p>
        <p className="max-w-xl mx-auto mb-3 leading-relaxed">
          Published exclusively from live primary and independent feeds. No fabricated stories, sample
          cards, or synthetic headlines. Designed for IT students and developers.
        </p>
        <div className="flex items-center justify-center space-x-4 text-[11px] font-mono">
          <span>TIMEZONE: ASIA/KOLKATA</span>
          <span>•</span>
          <span>STRICT SEPARATION: SNIPPET VS AI</span>
          <span>•</span>
          <span>EDITORIAL POLICY: VERIFIED</span>
        </div>
      </footer>
    </div>
  );
}
