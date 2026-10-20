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
  const [viewMode, setViewMode] = useState<'compact' | 'card'>('compact');

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

  const categoriesConfig = useMemo(
    () => [
      {
        key: 'models-releases',
        filterKey: 'models_releases' as CategoryFilter,
        title: 'New Models & Releases',
        stories: articles.slice(3).filter((a) => a.category === 'models_releases'),
      },
      {
        key: 'developer-tools',
        filterKey: 'developer_tools' as CategoryFilter,
        title: 'AI Tools for Developers',
        stories: articles.slice(3).filter((a) => a.category === 'developer_tools'),
      },
      {
        key: 'open-source',
        filterKey: 'open_source' as CategoryFilter,
        title: 'Open Source & Build',
        stories: articles.slice(3).filter((a) => a.category === 'open_source'),
      },
      {
        key: 'research',
        filterKey: 'research' as CategoryFilter,
        title: 'Research Worth Knowing',
        stories: articles.slice(3).filter((a) => a.category === 'research'),
      },
      {
        key: 'infrastructure',
        filterKey: 'industry_infrastructure' as CategoryFilter,
        title: 'Industry & Infrastructure',
        stories: articles.slice(3).filter((a) => a.category === 'industry_infrastructure'),
      },
      {
        key: 'general-context',
        filterKey: 'general_ai' as CategoryFilter,
        title: 'Independent Context & Analysis',
        stories: articles.slice(3).filter((a) => a.category === 'general_ai'),
      },
    ],
    [articles]
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Sleek Interactive Control Bar: Search, Category Tabs, and View Switcher */}
      <section
        aria-label="Newspaper Story Filter and Search"
        className="p-3 sm:p-4 bg-surface border border-border-strong sm:border-2 space-y-3 sm:space-y-4 shadow-xs"
      >
        {/* Top Control Line: Search & View Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Keyword Search Input */}
          <div className="relative flex-1 max-w-lg">
            <label htmlFor="story-search" className="sr-only">
              Search verified stories
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-text-muted pointer-events-none">
                🔍
              </span>
              <input
                id="story-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search headlines, tools, models..."
                className="w-full pl-8 pr-8 py-2 border border-border bg-background text-sm font-sans focus:outline-none focus:ring-1 focus:ring-text-primary rounded-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-2.5 text-xs text-text-muted hover:text-text-primary font-mono px-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Right Toolbar: View Mode Toggle & Status Count */}
          <div className="flex items-center justify-between sm:justify-end space-x-3 text-xs font-mono">
            {/* Live Count Display */}
            <span className="text-[11px] text-text-secondary whitespace-nowrap">
              <span className="font-bold text-text-primary">{filteredArticles.length}</span> / {articles.length} STORIES
            </span>

            {/* Layout Mode Switcher (Feed Skim vs Traditional Cards) */}
            <div className="inline-flex rounded-xs border border-border p-0.5 bg-surface-muted text-[11px]">
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                aria-label="Switch to compact list view"
                title="Clean Feed (ideal for phones)"
                className={`px-2.5 py-1 font-semibold uppercase tracking-wider rounded-xs transition-colors flex items-center space-x-1 ${
                  viewMode === 'compact'
                    ? 'bg-text-primary text-background shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>☵</span>
                <span>Feed</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('card')}
                aria-label="Switch to card grid view"
                title="Traditional Cards"
                className={`px-2.5 py-1 font-semibold uppercase tracking-wider rounded-xs transition-colors flex items-center space-x-1 ${
                  viewMode === 'card'
                    ? 'bg-text-primary text-background shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>▦</span>
                <span>Cards</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Chips with Smooth Touch Scroll and Edge Fade */}
        <div className="relative">
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none touch-scroll mask-fade-x px-1">
            {CATEGORY_TABS.map((tab) => {
              const count = categoryCounts[tab.key];
              const isSelected = selectedCategory === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedCategory(tab.key)}
                  className={`px-2.5 py-1 text-xs uppercase tracking-wider font-semibold whitespace-nowrap transition-colors border rounded-xs flex items-center space-x-1 ${
                    isSelected
                      ? 'bg-text-primary text-background border-border-strong shadow-xs'
                      : 'bg-surface-muted text-text-secondary border-border hover:border-text-primary hover:text-text-primary'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="text-[10px] font-mono opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* When filtering or searching: Render filtered results */}
      {selectedCategory !== 'all' || searchQuery.trim() !== '' ? (
        <section className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between border-b-2 border-border-strong pb-2">
            <h2 className="font-serif font-black text-lg sm:text-2xl uppercase tracking-tight text-text-primary">
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
                className="px-4 py-2 bg-text-primary text-background font-semibold text-xs uppercase tracking-wider hover:bg-text-secondary transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : viewMode === 'compact' ? (
            <div className="divide-y divide-border border-t border-b border-border bg-surface px-2 sm:px-4">
              {filteredArticles.map((story) => (
                <StoryCard key={story.id} article={story} layout="compact" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredArticles.map((story) => (
                <StoryCard key={story.id} article={story} layout="card" />
              ))}
            </div>
          )}
        </section>
      ) : (
        /* Default All-Stories View: Lead Section + Categorized Sections */
        <div className="space-y-8 sm:space-y-12">
          {/* Lead Section: The 5-Minute Brief */}
          {topBriefStories.length > 0 && (
            <section id="top-brief" className="border-b-2 border-border-strong pb-6 sm:pb-8">
              <div className="flex items-center justify-between border-b-2 border-border-strong pb-2 mb-4 sm:mb-6">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 bg-text-primary inline-block" />
                  <h2 className="font-serif font-black text-lg sm:text-2xl uppercase tracking-tight text-text-primary">
                    The 5-Minute Brief — Highest Impact Developments
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-text-muted">3 LEAD STORIES</span>
              </div>

              {viewMode === 'compact' ? (
                <div className="divide-y divide-border border-t border-b border-border bg-surface px-2 sm:px-4">
                  {topBriefStories.map((story) => (
                    <StoryCard key={story.id} article={story} featured layout="compact" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {topBriefStories.map((story) => (
                    <StoryCard key={story.id} article={story} featured layout="card" />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Categorized Editorial Sections */}
          {categoriesConfig
            .filter((cat) => cat.stories.length > 0)
            .map((cat) => (
              <section key={cat.key} id={cat.key} className="border-b-2 border-border-strong pb-6 sm:pb-8">
                <div className="border-b-2 border-border-strong pb-2 mb-4 sm:mb-6 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-text-primary inline-block" />
                    <h3 className="font-serif font-black text-lg sm:text-2xl uppercase tracking-tight text-text-primary">
                      {cat.title}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-mono text-text-muted">
                      {cat.stories.length} {cat.stories.length === 1 ? 'story' : 'stories'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(cat.filterKey)}
                      className="text-[10px] font-mono text-text-secondary hover:text-text-primary underline sm:hidden"
                    >
                      View all →
                    </button>
                  </div>
                </div>

                {viewMode === 'compact' ? (
                  <div className="divide-y divide-border border-t border-b border-border bg-surface px-2 sm:px-4">
                    {cat.stories.map((story) => (
                      <StoryCard key={story.id} article={story} layout="compact" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {cat.stories.map((story) => (
                      <StoryCard key={story.id} article={story} layout="card" />
                    ))}
                  </div>
                )}
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
