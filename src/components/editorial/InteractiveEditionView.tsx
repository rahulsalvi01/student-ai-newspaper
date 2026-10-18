'use client';

import React, { useState, useMemo } from 'react';
import type { Article } from '../../types/article';
import { StoryCard } from './StoryCard';

interface InteractiveEditionViewProps {
  articles: Article[];
}

type CategoryFilter =
  | 'all'
  | 'top_brief'
  | 'models_releases'
  | 'developer_tools'
  | 'open_source'
  | 'research'
  | 'industry_infrastructure'
  | 'general_ai';

const CATEGORY_TABS: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'All Verified Stories' },
  { key: 'top_brief', label: 'The 5-Min Brief' },
  { key: 'models_releases', label: 'Models & Releases' },
  { key: 'developer_tools', label: 'Developer Tools' },
  { key: 'open_source', label: 'Open Source' },
  { key: 'research', label: 'Research' },
  { key: 'industry_infrastructure', label: 'Infrastructure' },
  { key: 'general_ai', label: 'Context & Analysis' },
];

export function InteractiveEditionView({ articles }: InteractiveEditionViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Top 3 stories for the 5-Minute Brief
  const topBriefStories = useMemo(() => articles.slice(0, 3), [articles]);

  // Filter articles based on real active data only
  const filteredArticles = useMemo(() => {
    let result = articles;

    // Category filtering
    if (selectedCategory === 'top_brief') {
      result = topBriefStories;
    } else if (selectedCategory !== 'all') {
      result = articles.filter((a) => a.category === selectedCategory);
    }

    // Search query filtering across title, description, and sourceName
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.description && a.description.toLowerCase().includes(q)) ||
          a.sourceName.toLowerCase().includes(q)
      );
    }

    return result;
  }, [articles, selectedCategory, searchQuery, topBriefStories]);

  // Category counts based on actual live data (no fake counts)
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryFilter, number> = {
      all: articles.length,
      top_brief: Math.min(3, articles.length),
      models_releases: articles.filter((a) => a.category === 'models_releases').length,
      developer_tools: articles.filter((a) => a.category === 'developer_tools').length,
      open_source: articles.filter((a) => a.category === 'open_source').length,
      research: articles.filter((a) => a.category === 'research').length,
      industry_infrastructure: articles.filter((a) => a.category === 'industry_infrastructure').length,
      general_ai: articles.filter((a) => a.category === 'general_ai').length,
    };
    return counts;
  }, [articles]);

  return (
    <div className="space-y-8">
      {/* Interactive Filter & Search Bar */}
      <section
        aria-label="Newspaper Story Filter and Search"
        className="p-4 bg-surface border-2 border-border-strong space-y-4"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Keyword Search Input */}
          <div className="relative flex-1 max-w-md">
            <label htmlFor="story-search" className="sr-only">
              Search verified stories
            </label>
            <input
              id="story-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search verified headlines, tools, models..."
              className="w-full px-3 py-2 border border-border bg-background text-sm font-sans focus:outline-none focus:ring-1 focus:ring-text-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-xs text-text-muted hover:text-text-primary font-mono"
              >
                ✕ Clear
              </button>
            )}
          </div>

          {/* Actual Live Count Display */}
          <div className="text-xs font-mono text-text-secondary whitespace-nowrap">
            SHOWING <span className="font-bold text-text-primary">{filteredArticles.length}</span> OF{' '}
            <span className="font-bold text-text-primary">{articles.length}</span> VERIFIED STORIES
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
          {CATEGORY_TABS.map((tab) => {
            const count = categoryCounts[tab.key];
            const isSelected = selectedCategory === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedCategory(tab.key)}
                className={`px-3 py-1.5 text-xs uppercase tracking-wider font-semibold whitespace-nowrap transition-colors border ${
                  isSelected
                    ? 'bg-text-primary text-background border-border-strong shadow-sm'
                    : 'bg-surface-muted text-text-secondary border-border hover:border-text-primary hover:text-text-primary'
                }`}
              >
                <span>{tab.label}</span>
                <span className="ml-1.5 text-[10px] font-mono opacity-80">({count})</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* When filtering or searching: Render filtered results in a 3-column grid */}
      {selectedCategory !== 'all' || searchQuery.trim() !== '' ? (
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b-2 border-border-strong pb-2">
            <h2 className="font-serif font-black text-xl sm:text-2xl uppercase tracking-tight text-text-primary">
              {CATEGORY_TABS.find((t) => t.key === selectedCategory)?.label || 'Search Results'}
            </h2>
            <span className="text-xs font-mono text-text-muted">
              {filteredArticles.length} {filteredArticles.length === 1 ? 'story' : 'stories'}
            </span>
          </div>

          {filteredArticles.length === 0 ? (
            <div className="p-8 text-center border border-border bg-surface-muted/50 my-6">
              <p className="font-serif font-bold text-lg text-text-primary mb-2">
                No verified stories match your filter
              </p>
              <p className="text-xs font-sans text-text-secondary max-w-md mx-auto mb-4">
                Strict transparency: we only display real retrieved stories. No placeholder or mock articles are shown.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-4 py-1.5 bg-text-primary text-background font-semibold text-xs uppercase tracking-wider hover:bg-text-secondary transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((story) => (
                <StoryCard key={story.id} article={story} />
              ))}
            </div>
          )}
        </section>
      ) : (
        /* Default All-Stories View: Lead Section + Category Sections (Consistent 3-Column Grid) */
        <div className="space-y-12">
          {/* Lead Section: The 5-Minute Brief */}
          {topBriefStories.length > 0 && (
            <section id="top-brief" className="border-b-2 border-border-strong pb-8">
              <div className="flex items-center justify-between border-b-2 border-border-strong pb-2 mb-6">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-text-primary inline-block" />
                  <h2 className="font-serif font-black text-xl sm:text-2xl uppercase tracking-tight text-text-primary">
                    The 5-Minute Brief — Highest Impact Developments
                  </h2>
                </div>
                <span className="text-xs font-mono text-text-muted">3 LEAD STORIES</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topBriefStories.map((story) => (
                  <StoryCard key={story.id} article={story} />
                ))}
              </div>
            </section>
          )}

          {/* Categorized Sections: Each rendered in a consistent 3-column grid */}
          {[
            {
              key: 'models-releases',
              title: 'New Models & Releases',
              stories: articles.slice(3).filter((a) => a.category === 'models_releases'),
            },
            {
              key: 'developer-tools',
              title: 'AI Tools for Developers',
              stories: articles.slice(3).filter((a) => a.category === 'developer_tools'),
            },
            {
              key: 'open-source',
              title: 'Open Source & Build',
              stories: articles.slice(3).filter((a) => a.category === 'open_source'),
            },
            {
              key: 'research',
              title: 'Research Worth Knowing',
              stories: articles.slice(3).filter((a) => a.category === 'research'),
            },
            {
              key: 'infrastructure',
              title: 'Industry & Infrastructure',
              stories: articles.slice(3).filter((a) => a.category === 'industry_infrastructure'),
            },
            {
              key: 'general-context',
              title: 'Independent Context & Analysis',
              stories: articles.slice(3).filter((a) => a.category === 'general_ai'),
            },
          ]
            .filter((c) => c.stories.length > 0)
            .map((cat) => (
              <section key={cat.key} id={cat.key} className="border-b-2 border-border-strong pb-8">
                <div className="border-b-2 border-border-strong pb-2 mb-6 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 bg-text-primary inline-block" />
                    <h3 className="font-serif font-black text-xl sm:text-2xl uppercase tracking-tight text-text-primary">
                      {cat.title}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-text-muted">
                    {cat.stories.length} {cat.stories.length === 1 ? 'story' : 'stories'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cat.stories.map((story) => (
                    <StoryCard key={story.id} article={story} />
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
