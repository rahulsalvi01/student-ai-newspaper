import React from 'react';
import type { Article } from '../../types/article';

interface StoryCardProps {
  article: Article;
  featured?: boolean;
}

export function StoryCard({ article, featured = false }: StoryCardProps) {
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
    <article
      className={`border-b border-border pb-4 mb-4 flex flex-col justify-between ${
        featured ? 'md:col-span-2 md:border-b-2 md:border-border-strong pb-6' : ''
      }`}
    >
      <div>
        {/* Kicker / Category and Provenance */}
        <div className="flex flex-wrap items-center justify-between text-[11px] uppercase tracking-wider text-text-muted mb-1.5">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-text-primary">
              {article.sourceName}
            </span>
            <span>•</span>
            <span className="text-[10px] px-1.5 py-0.2 border border-border">
              {article.provenanceLabel}
            </span>
          </div>
          <span className="text-[10px] font-mono">{formattedDate}</span>
        </div>

        {/* Headline */}
        <h3
          className={`font-serif font-bold text-text-primary leading-tight hover:underline mb-2 ${
            featured ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl'
          }`}
        >
          <a
            href={article.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="focus:outline-none focus:ring-1 focus:ring-text-primary"
          >
            {article.title}
          </a>
        </h3>

        {/* Source-Provided Description */}
        {article.description && (
          <p className="text-sm font-sans text-text-secondary leading-relaxed line-clamp-3 mb-3">
            {article.description}
          </p>
        )}
      </div>

      {/* Card Footer: Metadata and External Link */}
      <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50 text-text-muted">
        <span className="text-[10px] italic">
          [Source excerpt • unedited]
        </span>
        <a
          href={article.canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-text-primary hover:underline inline-flex items-center space-x-1"
        >
          <span>Read original</span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}
