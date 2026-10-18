import React from 'react';
import Link from 'next/link';
import { editionsRepo } from '../../lib/db/repository';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const editions = await editionsRepo.getAllEditions();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Header */}
      <div className="border-b-2 border-border-strong pb-4 mb-8">
        <div className="flex items-center justify-between text-xs font-mono text-text-muted mb-2">
          <Link href="/" className="hover:text-text-primary hover:underline">
            ← Back to Today&apos;s Edition
          </Link>
          <span>CHRONOLOGICAL EDITION ARCHIVE</span>
        </div>
        <h1 className="font-serif font-black text-3xl sm:text-4xl uppercase tracking-tight text-text-primary">
          Edition Archive
        </h1>
        <p className="text-sm font-sans text-text-secondary mt-1">
          Historical record of daily technical editions published from verified live sources.
        </p>
      </div>

      {/* Real Persisted Editions List or Genuine Empty State */}
      {editions.length === 0 ? (
        <div className="p-8 sm:p-12 border-2 border-border-strong bg-surface text-center my-8">
          <span className="inline-block px-3 py-1 text-xs font-mono uppercase tracking-widest border border-border-strong mb-4">
            Honest Archive Notice
          </span>
          <h2 className="font-serif font-bold text-2xl text-text-primary mb-3">
            No previous editions have been archived yet
          </h2>
          <p className="text-sm font-sans text-text-secondary max-w-lg mx-auto leading-relaxed mb-6">
            This repository follows a strict editorial invariant: we never create demo editions, mock dates,
            or synthetic historical data. Real editions are persisted automatically when daily live news is
            ingested and verified.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Link
              href="/"
              className="px-6 py-2 bg-text-primary text-background font-semibold text-xs uppercase tracking-wider hover:bg-text-secondary transition-colors"
            >
              Read Today&apos;s Live Edition
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-mono text-text-muted pb-2 border-b border-border flex justify-between">
            <span>SHOWING {editions.length} ARCHIVED {editions.length === 1 ? 'EDITION' : 'EDITIONS'}</span>
            <span>TIMEZONE: ASIA/KOLKATA</span>
          </div>

          <div className="divide-y divide-border border border-border bg-surface">
            {editions.map((edition) => (
              <article
                key={edition.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-surface-muted/50 transition-colors gap-3"
              >
                <div>
                  <div className="flex items-center space-x-2 text-xs font-mono text-text-muted mb-1">
                    <span className="font-bold text-text-primary uppercase tracking-wider">
                      {edition.issue_date}
                    </span>
                    <span>•</span>
                    <span className="px-1.5 py-0.2 border border-border uppercase text-[10px]">
                      {edition.status}
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-lg text-text-primary">
                    <Link
                      href={`/history/${edition.issue_date}`}
                      className="hover:underline focus:outline-none focus:ring-1 focus:ring-text-primary"
                    >
                      {edition.headline || 'The Daily AI Brief'}
                    </Link>
                  </h3>
                </div>

                <div className="flex items-center space-x-4 text-xs font-mono">
                  <span className="text-text-secondary whitespace-nowrap">
                    {edition.article_count} {edition.article_count === 1 ? 'story' : 'stories'}
                  </span>
                  <Link
                    href={`/history/${edition.issue_date}`}
                    className="px-3 py-1 bg-surface border border-border-strong text-text-primary font-semibold hover:bg-text-primary hover:text-background transition-colors whitespace-nowrap"
                  >
                    Read Issue ↗
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
