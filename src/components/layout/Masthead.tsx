'use client';

import React from 'react';
import Link from 'next/link';
import type { SourceHealthSummary } from '../../types/article';

interface MastheadProps {
  issueDate: string;
  updatedAt: string;
  totalStories: number;
  healthySourcesCount: number;
  totalSourcesCount: number;
  sourceHealth?: SourceHealthSummary[];
}

export function Masthead({
  issueDate,
  updatedAt,
  totalStories,
  healthySourcesCount,
  totalSourcesCount,
  sourceHealth = [],
}: MastheadProps) {
  // Format Updated at in Asia/Kolkata timezone
  const formattedUpdatedAt = React.useMemo(() => {
    try {
      return new Date(updatedAt).toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '08:00:00 IST';
    }
  }, [updatedAt]);

  // Determine latest successful fetch time across sources
  const formattedLastFetch = React.useMemo(() => {
    try {
      const healthyDates = sourceHealth
        .filter((s) => s.status === 'healthy' && s.checkedAt)
        .map((s) => new Date(s.checkedAt).getTime());

      if (healthyDates.length > 0) {
        const latest = Math.max(...healthyDates);
        return new Date(latest).toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      return formattedUpdatedAt;
    } catch {
      return formattedUpdatedAt;
    }
  }, [sourceHealth, formattedUpdatedAt]);

  return (
    <header className="border-b-2 border-border-strong pt-3 pb-2">
      {/* Top Meta Line: Dateline, Archive/Preferences Links & Edition */}
      <div className="flex flex-wrap items-center justify-between text-xs text-text-muted border-b border-border pb-2 mb-2 gap-2">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Link href="/" className="font-bold text-text-primary uppercase tracking-wider hover:underline">
            AI & Computing Edition
          </Link>
          <span>•</span>
          <span className="font-serif font-semibold">{issueDate}</span>
          <span>•</span>
          <span className="font-mono text-[11px]">Asia/Kolkata</span>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3 text-xs font-mono">
          <Link href="/history" className="hover:text-text-primary hover:underline">
            ARCHIVE
          </Link>
          <span>•</span>
          <Link href="/settings" className="hover:text-text-primary hover:underline">
            PREFERENCES
          </Link>
          <span>•</span>
          <span className="font-semibold text-text-primary">
            {totalStories} TOP PRIORITIZED {totalStories === 1 ? 'STORY' : 'STORIES'}
          </span>
        </div>
      </div>

      {/* Compact Status Area: Source Health, Last Fetch, Updated At */}
      <div className="bg-surface-muted border border-border px-3 py-1.5 mb-3 text-[11px] font-mono text-text-secondary flex flex-wrap items-center justify-between gap-y-1">
        <div className="flex items-center space-x-2">
          <span
            className={`w-2 h-2 rounded-full inline-block ${
              healthySourcesCount > 0 ? 'bg-text-primary' : 'bg-text-muted'
            }`}
          />
          <span className="font-semibold text-text-primary">
            {healthySourcesCount}/{totalSourcesCount} SOURCES ONLINE
          </span>
          <span>•</span>
          <span>LAST FETCH: {formattedLastFetch}</span>
        </div>

        <div className="flex items-center space-x-3">
          <span>TIMEZONE: ASIA/KOLKATA</span>
          <span>•</span>
          <span>UPDATED AT: {formattedUpdatedAt}</span>
        </div>
      </div>

      {/* Optional Compact Source Transparency Drawer */}
      {sourceHealth.length > 0 && (
        <details className="mb-3 text-[10px] font-mono text-text-muted cursor-pointer">
          <summary className="hover:text-text-primary focus:outline-none focus:underline inline-block">
            ▸ View verified source status breakdown ({healthySourcesCount} healthy, {totalSourcesCount - healthySourcesCount} inactive)
          </summary>
          <div className="mt-2 p-2 bg-surface border border-border grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {sourceHealth.map((s) => (
              <div key={s.id} className="truncate flex items-center justify-between border-b border-border/40 pb-1">
                <span className="truncate pr-1 text-text-primary font-sans">{s.name}</span>
                <span className={s.status === 'healthy' ? 'text-text-primary font-bold' : 'text-text-muted'}>
                  {s.status === 'healthy' ? '✓ OK' : '✗ OFF'}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Main Title / Brand Display */}
      <div className="text-center py-2">
        <h1 className="font-serif font-black text-3xl sm:text-5xl md:text-6xl tracking-tight text-text-primary uppercase">
          <Link href="/" className="hover:opacity-95">
            The Daily AI Brief
          </Link>
        </h1>
        <p className="text-xs sm:text-sm font-serif italic text-text-secondary mt-1">
          A Technical AI & Computing Newspaper for Engineering Students • 100 Highest-Priority Verified Stories
        </p>
      </div>

      {/* Double divider rule */}
      <div className="rule-double my-2" />

      {/* Editorial Navigation / Section Index */}
      <nav aria-label="Editorial Sections" className="overflow-x-auto py-1">
        <ul className="flex items-center justify-center space-x-4 sm:space-x-8 text-xs font-semibold uppercase tracking-wider text-text-secondary whitespace-nowrap">
          <li>
            <a href="#top-brief" className="hover:text-text-primary hover:underline">
              The 5-Min Brief
            </a>
          </li>
          <li>
            <a href="#models-releases" className="hover:text-text-primary hover:underline">
              Models & Releases
            </a>
          </li>
          <li>
            <a href="#developer-tools" className="hover:text-text-primary hover:underline">
              Developer Tools
            </a>
          </li>
          <li>
            <a href="#research" className="hover:text-text-primary hover:underline">
              Research
            </a>
          </li>
          <li>
            <a href="#open-source" className="hover:text-text-primary hover:underline">
              Open Source
            </a>
          </li>
          <li>
            <a href="#infrastructure" className="hover:text-text-primary hover:underline">
              Infrastructure
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
