import React from 'react';
import type { SourceHealthSummary } from '../../types/article';
import { SourceHealthPanel } from './SourceHealthPanel';

interface EmptyStateProps {
  sourceHealth: SourceHealthSummary[];
  customMessage?: string;
}

export function EmptyState({ sourceHealth, customMessage }: EmptyStateProps) {
  return (
    <div className="py-12 px-4 max-w-4xl mx-auto text-center">
      <div className="border border-border-strong p-8 bg-surface">
        <span className="inline-block px-3 py-1 text-xs font-mono uppercase tracking-widest border border-border-strong mb-4">
          Honest Editorial Notice
        </span>

        <h2 className="font-serif font-bold text-2xl sm:text-3xl text-text-primary mb-3">
          {customMessage || 'No verified AI/technology stories are available yet'}
        </h2>

        <p className="text-sm font-sans text-text-secondary max-w-xl mx-auto leading-relaxed mb-6">
          This publication follows a strict non-negotiable rule: we never display sample, placeholder,
          or fabricated news stories. If candidate feeds are temporarily offline, undergoing maintenance,
          or returning 0 entries, we present an honest empty state instead of fake headlines.
        </p>

        <div className="flex items-center justify-center space-x-4 mb-2">
          <form action="" method="GET">
            <button
              type="submit"
              className="px-6 py-2 bg-text-primary text-background font-semibold text-xs uppercase tracking-wider hover:bg-text-secondary transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-text-primary"
            >
              Retry / Refresh Live Feeds
            </button>
          </form>
        </div>
      </div>

      {/* Source Health Details */}
      <div className="text-left mt-8">
        <SourceHealthPanel sources={sourceHealth} />
      </div>
    </div>
  );
}
