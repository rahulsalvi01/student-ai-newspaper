import React from 'react';

interface MastheadProps {
  issueDate: string;
  totalStories: number;
  healthySourcesCount: number;
  totalSourcesCount: number;
}

export function Masthead({
  issueDate,
  totalStories,
  healthySourcesCount,
  totalSourcesCount,
}: MastheadProps) {
  return (
    <header className="border-b-2 border-border-strong pt-3 pb-2">
      {/* Top Meta Line: Classic newspaper ear / dateline */}
      <div className="flex flex-wrap items-center justify-between text-xs text-text-muted border-b border-border pb-2 mb-3">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-text-primary uppercase tracking-wider">
            AI & Computing Edition
          </span>
          <span>•</span>
          <span>{issueDate}</span>
          <span>•</span>
          <span>Asia/Kolkata</span>
        </div>
        <div className="flex items-center space-x-3 mt-1 sm:mt-0">
          <span className="inline-flex items-center px-2 py-0.5 border border-border-strong text-[11px] font-mono">
            {healthySourcesCount}/{totalSourcesCount} SOURCES ONLINE
          </span>
          <span>•</span>
          <span className="font-mono text-[11px]">
            {totalStories} VERIFIED {totalStories === 1 ? 'STORY' : 'STORIES'}
          </span>
        </div>
      </div>

      {/* Main Title / Brand Display */}
      <div className="text-center py-2">
        <h1 className="font-serif font-black text-3xl sm:text-5xl md:text-6xl tracking-tight text-text-primary uppercase">
          The Daily AI Brief
        </h1>
        <p className="text-xs sm:text-sm font-serif italic text-text-secondary mt-1">
          A Technical AI & Computing Newspaper for Engineering Students • Live Sources Only
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
          <li>
            <a href="#source-health" className="hover:text-text-primary hover:underline">
              Source Health
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
