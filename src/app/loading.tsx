import React from 'react';

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-pulse">
      {/* Masthead Skeleton */}
      <div className="border-b-2 border-border-strong pb-4">
        <div className="flex justify-between items-center mb-4">
          <div className="h-3 w-40 bg-surface-muted" />
          <div className="h-3 w-28 bg-surface-muted" />
        </div>
        <div className="h-12 w-96 max-w-full mx-auto bg-surface-muted mb-2" />
        <div className="h-4 w-64 max-w-full mx-auto bg-surface-muted" />
        <div className="h-1 w-full bg-border mt-4" />
      </div>

      {/* Grid Skeleton */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-b border-border pb-4 space-y-3">
            <div className="h-3 w-24 bg-surface-muted" />
            <div className="h-6 w-full bg-surface-muted" />
            <div className="h-6 w-3/4 bg-surface-muted" />
            <div className="h-16 w-full bg-surface-muted" />
          </div>
        ))}
      </div>

      <div className="text-center mt-12 text-xs font-mono text-text-muted">
        FETCHING LIVE SOURCES FROM PRIMARY & INDEPENDENT PUBLISHERS...
      </div>
    </div>
  );
}
