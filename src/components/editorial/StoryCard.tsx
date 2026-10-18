import React from 'react';
import type { Article } from '../../types/article';

interface StoryCardProps {
  article: Article;
  featured?: boolean;
}

export function StoryCard({ article }: StoryCardProps) {
  const formattedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Date not provided';

  return (
    <article className="border border-border p-4 sm:p-5 bg-surface flex flex-col justify-between hover:border-border-strong hover:shadow-sm transition-all h-full">
      <div>
        {/* Kicker: Source Name, Provenance & Published Date (Asia/Kolkata) */}
        <div className="flex flex-wrap items-center justify-between text-[11px] uppercase tracking-wider text-text-muted mb-2.5 pb-2 border-b border-border/60 gap-1">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-text-primary">
              {article.sourceName}
            </span>
            <span>•</span>
            <span className="text-[10px] px-1.5 py-0.5 border border-border font-mono">
              {article.provenanceLabel}
            </span>
          </div>
          <span className="text-[10px] font-mono text-text-muted">{formattedDate}</span>
        </div>

        {/* Headline */}
        <h3 className="font-serif font-bold text-text-primary leading-snug hover:underline mb-2.5 text-lg sm:text-xl">
          <a
            href={article.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="focus:outline-none focus:ring-1 focus:ring-text-primary"
          >
            {article.title}
          </a>
        </h3>

        {/* Summary Kind Distinction: Source Excerpt vs AI-Generated Summary */}
        <div className="mb-2">
          <span className="inline-block text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 border border-border bg-surface-muted text-text-secondary">
            {article.summaryKind === 'ai_generated' ? 'AI-generated summary' : 'Source excerpt • verified'}
          </span>
        </div>

        {/* Technical Description */}
        {article.description && (
          <p className="text-xs sm:text-sm font-sans text-text-secondary leading-relaxed line-clamp-3 mb-4">
            {article.description}
          </p>
        )}
      </div>

      {/* Card Footer: Priority Score & External Source Link */}
      <div className="flex items-center justify-between text-xs pt-3 border-t border-border/60 text-text-muted mt-auto">
        {article.priorityScore !== undefined ? (
          <span
            className="text-[10px] font-mono font-semibold px-2 py-0.5 border border-border bg-surface-muted text-text-primary"
            title={article.priorityReasons?.join('; ') || 'Prioritized based on quality and relevance'}
          >
            SCORE: {article.priorityScore}/100
          </span>
        ) : (
          <span className="text-[10px] font-mono text-text-muted">VERIFIED</span>
        )}
        <a
          href={article.canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-text-primary hover:underline inline-flex items-center space-x-1 ml-auto text-xs"
        >
          <span>Read original</span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}
