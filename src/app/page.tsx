import React from 'react';
import { getPublishedNewspaperData } from '../lib/feeds/service';
import { Masthead } from '../components/layout/Masthead';
import { InteractiveEditionView } from '../components/editorial/InteractiveEditionView';
import { EmptyState } from '../components/editorial/EmptyState';

// Ensure this page runs dynamically server-side
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Load the persisted top prioritized articles from real sources / published edition
  const data = await getPublishedNewspaperData({ limit: 100 });
  const healthyCount = data.sourceHealth.filter((s) => s.status === 'healthy').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* All-Source Failure or Fallback Warning Notice */}
      {data.warningNotice && (
        <aside
          role="alert"
          aria-label="Editorial Warning Notice"
          className="mb-4 p-3 bg-surface border-2 border-border-strong text-xs font-mono text-text-primary flex items-center justify-between"
        >
          <div className="flex items-center space-x-2">
            <span className="font-bold uppercase tracking-wider">[EDITORIAL NOTICE]</span>
            <span>{data.warningNotice}</span>
          </div>
        </aside>
      )}

      {/* Editorial Masthead with Asia/Kolkata date, updated at, and compact source status */}
      <Masthead
        issueDate={data.issueDate}
        updatedAt={data.updatedAt}
        totalStories={data.articles.length}
        healthySourcesCount={healthyCount}
        totalSourcesCount={data.sourceHealth.length}
        sourceHealth={data.sourceHealth}
      />

      {/* Main Content: Interactive search/filters connected to real persisted stories */}
      <main className="mt-8">
        {data.articles.length === 0 ? (
          <EmptyState
            sourceHealth={data.sourceHealth}
            customMessage={data.warningNotice}
          />
        ) : (
          <InteractiveEditionView articles={data.articles} />
        )}
      </main>

      {/* Newspaper Footer */}
      <footer className="mt-16 pt-8 pb-12 border-t-2 border-border-strong text-center text-xs text-text-muted">
        <p className="font-serif font-bold text-sm text-text-primary uppercase tracking-wider mb-2">
          The Daily AI Brief
        </p>
        <p className="max-w-xl mx-auto mb-3 leading-relaxed">
          Curated and prioritized from live primary and independent feeds. Strictly technical and developer-focused:
          model releases, engineering tools, and evaluated research.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-mono">
          <span>TIMEZONE: ASIA/KOLKATA</span>
          <span>•</span>
          <span>EDITION: TOP 100 PRIORITIZED</span>
          <span>•</span>
          <span>QUALITY FILTERING: ACTIVE</span>
        </div>
      </footer>
    </div>
  );
}
