import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="border border-border-strong p-8 bg-surface">
        <span className="inline-block px-3 py-1 text-xs font-mono uppercase tracking-widest border border-border-strong mb-4">
          404 • Not Found
        </span>

        <h1 className="font-serif font-black text-3xl text-text-primary mb-3">
          Page Not Found
        </h1>

        <p className="text-sm font-sans text-text-secondary leading-relaxed mb-6">
          The requested edition or section does not exist in the editorial archive.
        </p>

        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-text-primary text-background font-semibold text-xs uppercase tracking-wider hover:bg-text-secondary transition-colors"
        >
          Return to Today&apos;s Edition
        </Link>
      </div>
    </div>
  );
}
