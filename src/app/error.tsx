'use client';

import React from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="border-2 border-border-strong p-8 bg-surface">
        <span className="inline-block px-3 py-1 text-xs font-mono uppercase tracking-widest border border-border-strong mb-4">
          Editorial Service Alert
        </span>

        <h1 className="font-serif font-black text-3xl text-text-primary mb-3">
          Edition Loading Error
        </h1>

        <p className="text-sm font-sans text-text-secondary leading-relaxed mb-6">
          We encountered an issue while retrieving live stories from verified publishers.
          Per our transparency rules, raw server internals are masked, but you may attempt to re-establish
          connections to the primary feeds.
        </p>

        {error.message && (
          <div className="mb-6 p-3 bg-surface-muted text-xs font-mono text-text-muted text-left border border-border">
            Diagnostic: {error.message}
          </div>
        )}

        <button
          onClick={() => reset()}
          className="px-6 py-2.5 bg-text-primary text-background font-semibold text-xs uppercase tracking-wider hover:bg-text-secondary transition-colors focus:ring-2 focus:ring-text-primary"
        >
          Retry Connection
        </button>
      </div>
    </div>
  );
}
