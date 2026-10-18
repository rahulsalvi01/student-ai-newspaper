import React from 'react';
import type { SourceHealthSummary } from '../../types/article';

interface SourceHealthPanelProps {
  sources: SourceHealthSummary[];
}

export function SourceHealthPanel({ sources }: SourceHealthPanelProps) {
  const healthy = sources.filter((s) => s.status === 'healthy');
  const unhealthy = sources.filter((s) => s.status === 'unhealthy');

  return (
    <section id="source-health" className="mt-12 pt-6 border-t-2 border-border-strong">
      <div className="flex flex-wrap items-baseline justify-between mb-4">
        <div>
          <h2 className="font-serif font-black text-xl sm:text-2xl uppercase tracking-tight text-text-primary">
            Source Registry & Feed Health
          </h2>
          <p className="text-xs text-text-muted mt-0.5 font-sans">
            Strict transparency: only real network-verified feeds are ingested. No fabricated content is permitted.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono mt-2 sm:mt-0">
          <span className="px-2 py-0.5 border border-border-strong">
            {healthy.length} HEALTHY
          </span>
          {unhealthy.length > 0 && (
            <span className="px-2 py-0.5 border border-text-muted text-text-muted">
              {unhealthy.length} DISABLED / SKIPPED
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-muted border-b border-border text-text-secondary font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Publisher</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Entries</th>
              <th className="py-2.5 px-3">Latest Entry (UTC)</th>
              <th className="py-2.5 px-3">Feed URL / Diagnosis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-mono text-[11px]">
            {sources.map((s) => {
              const isHealthy = s.status === 'healthy';
              return (
                <tr
                  key={s.id}
                  className={isHealthy ? 'hover:bg-surface-muted/50' : 'bg-surface-muted/30 text-text-muted'}
                >
                  <td className="py-2 px-3 font-sans font-semibold text-text-primary">
                    {s.name}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`inline-block px-1.5 py-0.2 border ${
                        isHealthy
                          ? 'border-border-strong text-text-primary'
                          : 'border-border text-text-muted'
                      }`}
                    >
                      {isHealthy ? 'HEALTHY' : 'DISABLED'}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-sans">
                    {s.isOfficial ? 'Official' : 'Independent'}
                  </td>
                  <td className="py-2 px-3">{s.validEntriesCount}</td>
                  <td className="py-2 px-3">
                    {s.newestEntryPublishedAt
                      ? s.newestEntryPublishedAt.slice(0, 19).replace('T', ' ')
                      : '—'}
                  </td>
                  <td className="py-2 px-3 max-w-xs truncate">
                    {isHealthy ? (
                      <a
                        href={s.feedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text-primary hover:underline"
                        title={s.feedUrl}
                      >
                        {s.feedUrl}
                      </a>
                    ) : (
                      <div>
                        <span className="text-text-primary font-sans block text-[10px]">
                          Reason: {s.disabledReason || 'Unreachable'}
                        </span>
                        {s.suggestedAlternative && (
                          <span className="text-[10px] text-text-secondary block">
                            Alt verified: {s.suggestedAlternative}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
