import React from 'react';
import type { Article } from '../../types/article';

export interface StoryCardProps {
  article: Article;
  featured?: boolean;
  layout?: 'card' | 'compact';
}

export function StoryCard({ article, featured, layout = 'card' }: StoryCardProps) {
  const formattedDate = React.useMemo(() => {
    if (!article.publishedAt) return 'Date not provided';
    try {
      return new Date(article.publishedAt).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Date not provided';
    }
  }, [article.publishedAt]);

  const shortDate = React.useMemo(() => {
    if (!article.publishedAt) return '';
    try {
      const d = new Date(article.publishedAt);
      return d.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return '';
    }
  }, [article.publishedAt]);

  // Streamlined Compact Feed View (Ideal for high-speed skimming on mobile)
  if (layout === 'compact') {
    return (
      <article className="group py-3.5 sm:py-4 border-b border-border/80 hover:bg-surface-muted/40 transition-colors px-1 sm:px-2">
        {/* Meta Bar */}
        <div className="flex items-center justify-between text-[11px] text-text-muted mb-1.5 gap-2">
          <div className="flex items-center space-x-1.5 truncate">
            <span className="font-bold text-text-primary font-sans truncate">
              {article.sourceName}
            </span>
            <span>•</span>
            <span className="text-[10px] text-text-secondary font-mono">
              {article.provenanceLabel}
            </span>
            {shortDate && (
              <>
                <span className="hidden xs:inline">•</span>
                <span className="hidden xs:inline text-[10px] font-mono text-text-muted">{shortDate}</span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-1.5 flex-shrink-0">
            {article.summaryKind === 'ai_generated' ? (
              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                ✦ AI Brief
              </span>
            ) : (
              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-surface-muted text-text-muted border border-border">
                Excerpt
              </span>
            )}
            {article.priorityScore !== undefined && (
              <span
                className="text-[10px] font-mono font-semibold px-1.5 py-0.5 bg-surface-muted text-text-primary border border-border"
                title={article.priorityReasons?.join('; ') || 'Prioritized score'}
              >
                {article.priorityScore}
              </span>
            )}
          </div>
        </div>

        {/* Headline */}
        <h3 className="font-serif font-bold text-base sm:text-lg text-text-primary leading-snug group-hover:underline mb-1.5">
          <a
            href={article.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="focus:outline-none focus:ring-1 focus:ring-text-primary"
          >
            {article.title}
          </a>
        </h3>

        {/* Description */}
        {article.description && (
          <p className="text-xs sm:text-sm font-sans text-text-secondary line-clamp-2 leading-relaxed mb-2">
            {article.description}
          </p>
        )}

        {/* Action Link */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-[10px] font-mono text-text-muted">{formattedDate}</span>
          <a
            href={article.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-text-primary hover:underline inline-flex items-center space-x-1 text-xs py-1"
          >
            <span>Read original</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </article>
    );
  }

  // Modernized Standard Card View (Crisp, clean, reduced visual clutter)
  return (
    <article
      className={`border border-border p-3.5 sm:p-5 bg-surface flex flex-col justify-between hover:border-border-strong hover:shadow-sm transition-all h-full ${
        featured ? 'ring-1 ring-border-strong bg-surface-muted/10' : ''
      }`}
    >
      <div>
        {/* Kicker: Source Name, Provenance & Published Date (Asia/Kolkata) */}
        <div className="flex flex-wrap items-center justify-between text-[11px] uppercase tracking-wider text-text-muted mb-2 pb-2 border-b border-border/60 gap-1.5">
          <div className="flex items-center space-x-1.5 truncate">
            <span className="font-bold text-text-primary truncate">
              {article.sourceName}
            </span>
            <span>•</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-surface-muted border border-border font-mono text-text-secondary">
              {article.provenanceLabel}
            </span>
          </div>
          <span className="text-[10px] font-mono text-text-muted flex-shrink-0">{shortDate || formattedDate}</span>
        </div>

        {/* Headline */}
        <h3 className="font-serif font-bold text-text-primary leading-snug hover:underline mb-2 text-base sm:text-lg md:text-xl">
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
        <div className="mb-2.5">
          {article.summaryKind === 'ai_generated' ? (
            <span className="inline-flex items-center space-x-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-xs bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              <span>✦</span>
              <span>AI-generated summary</span>
            </span>
          ) : (
            <span className="inline-block text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-xs border border-border bg-surface-muted text-text-secondary">
              Source excerpt • verified
            </span>
          )}
        </div>

        {/* Technical Description */}
        {article.description && (
          <p className="text-xs sm:text-sm font-sans text-text-secondary leading-relaxed line-clamp-3 mb-4">
            {article.description}
          </p>
        )}
      </div>

      {/* Card Footer: Priority Score & External Source Link */}
      <div className="flex items-center justify-between text-xs pt-3 border-t border-border/60 text-text-muted mt-auto gap-2">
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
          className="font-semibold text-text-primary hover:underline inline-flex items-center space-x-1 ml-auto text-xs py-1"
        >
          <span>Read original</span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}

