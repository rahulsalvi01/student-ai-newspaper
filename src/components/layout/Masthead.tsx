'use client';

import React from 'react';
import Link from 'next/link';
import type { SourceHealthSummary } from '../../types/article';
import { HeaderSubscribeButton } from '../subscription/CornerSubscribeButton';

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
      return '07:00:00 IST';
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

  const [showSourcesModal, setShowSourcesModal] = React.useState(false);

  return (
    <header className="border-b-2 border-border-strong pt-2 sm:pt-3 pb-2">
      {/* Top Meta Line: Responsive Dateline & Navigation */}
      {/* Desktop / Tablet View (>= sm) */}
      <div className="hidden sm:flex flex-wrap items-center justify-between text-xs text-text-muted border-b border-border pb-2 mb-2 gap-2">
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
          <HeaderSubscribeButton />
          <span>•</span>
          <span className="font-semibold text-text-primary">
            {totalStories} TOP PRIORITIZED {totalStories === 1 ? 'STORY' : 'STORIES'}
          </span>
        </div>
      </div>

      {/* Mobile-Only Clean, Compact Editorial Bar (< sm) */}
      <div className="sm:hidden flex items-center justify-between border-b border-border pb-2 mb-2">
        <div className="flex items-center space-x-1.5 text-[11px] font-mono text-text-muted truncate">
          <span className="font-bold uppercase tracking-wider text-text-primary">
            AI & Computing
          </span>
          <span>•</span>
          <span className="font-serif text-text-secondary truncate">{issueDate}</span>
        </div>
        <div className="flex items-center space-x-2 text-[11px] font-mono flex-shrink-0">
          <Link href="/history" className="text-text-secondary hover:text-text-primary py-0.5">
            ARCHIVE
          </Link>
          <span>•</span>
          <Link href="/settings" className="text-text-secondary hover:text-text-primary py-0.5">
            PREFS
          </Link>
          <span>•</span>
          <HeaderSubscribeButton />
        </div>
      </div>

      {/* Main Title / Brand Display with Modern Fluid Typography */}
      <div className="text-center py-2 sm:py-3">
        <h1 className="font-serif font-black fluid-title text-3xl sm:text-5xl md:text-6xl tracking-tight text-text-primary uppercase">
          <Link href="/" className="hover:opacity-95 transition-opacity">
            The Daily AI Brief
          </Link>
        </h1>
        <p className="text-xs sm:text-sm font-serif italic text-text-secondary mt-1 max-w-2xl mx-auto px-2">
          A Technical AI & Computing Newspaper for Engineering Students
          <span className="hidden sm:inline"> • 100 Highest-Priority Verified Stories</span>
        </p>
      </div>

      {/* Status Bar: Clean, Minimalist & Interactive */}
      <div className="bg-surface-muted border border-border px-2.5 sm:px-3 py-1.5 my-2 text-[11px] font-mono text-text-secondary flex items-center justify-between gap-1">
        <div className="flex items-center space-x-1.5 sm:space-x-2 truncate">
          <span
            className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${
              healthySourcesCount > 0 ? 'bg-green-600 dark:bg-green-400' : 'bg-text-muted'
            }`}
          />
          <span className="font-semibold text-text-primary truncate">
            {healthySourcesCount}/{totalSourcesCount} ONLINE
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">LAST FETCH: {formattedLastFetch}</span>
          <span className="text-[10px] text-text-muted hidden xs:inline">
            ({totalStories} STORIES)
          </span>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0 text-[10px] sm:text-[11px]">
          <span className="hidden md:inline">TIMEZONE: ASIA/KOLKATA •</span>
          <span className="hidden sm:inline">UPDATED: {formattedUpdatedAt}</span>
          {sourceHealth.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSourcesModal(true)}
              aria-label="View verified sources list"
              className="px-1.5 py-0.5 bg-surface border border-border hover:border-text-primary text-text-primary text-[10px] rounded-xs font-mono transition-colors"
            >
              Sources ({healthySourcesCount}) ▾
            </button>
          )}
        </div>
      </div>

      {/* Verified Sources Modal / Bottom Sheet for Mobile & Desktop */}
      {showSourcesModal && sourceHealth.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Verified Feed Sources Breakdown"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-surface border-2 border-border-strong w-full max-w-lg p-5 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-border-strong pb-3 mb-3">
              <div>
                <h3 className="font-serif font-black text-lg uppercase tracking-tight text-text-primary">
                  Verified Feed Sources
                </h3>
                <p className="text-[11px] font-mono text-text-muted">
                  {healthySourcesCount} healthy • {totalSourcesCount - healthySourcesCount} inactive
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSourcesModal(false)}
                aria-label="Close sources list"
                className="w-7 h-7 flex items-center justify-center border border-border hover:border-text-primary text-text-primary font-mono text-xs"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto divide-y divide-border/60 text-xs font-mono pr-1">
              {sourceHealth.map((s) => (
                <div key={s.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="truncate">
                    <span className="font-sans font-semibold text-text-primary block truncate">
                      {s.name}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {s.isOfficial ? 'Official' : 'Independent'} • {s.category.replace('_', ' ')}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 font-bold ${
                      s.status === 'healthy'
                        ? 'text-green-700 dark:text-green-400 bg-green-500/10'
                        : 'text-text-muted bg-surface-muted'
                    }`}
                  >
                    {s.status === 'healthy' ? '✓ ONLINE' : 'OFFLINE'}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setShowSourcesModal(false)}
                className="px-4 py-1.5 bg-text-primary text-background text-xs font-semibold uppercase tracking-wider hover:bg-text-secondary transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Double divider rule */}
      <div className="rule-double my-1.5" />

      {/* Editorial Navigation / Section Index with Touch-Friendly Scroll and Edge Mask */}
      <nav aria-label="Editorial Sections" className="overflow-x-auto scrollbar-none touch-scroll py-1 mask-fade-x">
        <ul className="flex items-center space-x-1.5 sm:space-x-6 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-text-secondary whitespace-nowrap px-2">
          <li>
            <a
              href="#top-brief"
              className="px-2.5 py-1 rounded-sm bg-surface-muted sm:bg-transparent border sm:border-0 border-border/70 hover:text-text-primary hover:border-text-primary inline-block transition-colors"
            >
              The 5-Min Brief
            </a>
          </li>
          <li>
            <a
              href="#models-releases"
              className="px-2.5 py-1 rounded-sm bg-surface-muted sm:bg-transparent border sm:border-0 border-border/70 hover:text-text-primary hover:border-text-primary inline-block transition-colors"
            >
              Models & Releases
            </a>
          </li>
          <li>
            <a
              href="#developer-tools"
              className="px-2.5 py-1 rounded-sm bg-surface-muted sm:bg-transparent border sm:border-0 border-border/70 hover:text-text-primary hover:border-text-primary inline-block transition-colors"
            >
              Developer Tools
            </a>
          </li>
          <li>
            <a
              href="#research"
              className="px-2.5 py-1 rounded-sm bg-surface-muted sm:bg-transparent border sm:border-0 border-border/70 hover:text-text-primary hover:border-text-primary inline-block transition-colors"
            >
              Research
            </a>
          </li>
          <li>
            <a
              href="#open-source"
              className="px-2.5 py-1 rounded-sm bg-surface-muted sm:bg-transparent border sm:border-0 border-border/70 hover:text-text-primary hover:border-text-primary inline-block transition-colors"
            >
              Open Source
            </a>
          </li>
          <li>
            <a
              href="#infrastructure"
              className="px-2.5 py-1 rounded-sm bg-surface-muted sm:bg-transparent border sm:border-0 border-border/70 hover:text-text-primary hover:border-text-primary inline-block transition-colors"
            >
              Infrastructure
            </a>
          </li>
          <li>
            <a
              href="#subscribe"
              className="px-2.5 py-1 rounded-sm bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900 font-bold hover:bg-red-100 dark:hover:bg-red-900/60 inline-block transition-colors"
            >
              ✉ Subscribe
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
