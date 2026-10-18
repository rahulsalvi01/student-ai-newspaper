import React from 'react';
import type { Article } from '../../types/article';
import { StoryCard } from './StoryCard';

interface SectionGridProps {
  articles: Article[];
}

export function SectionGrid({ articles }: SectionGridProps) {
  if (articles.length === 0) return null;

  // The 5-Minute Brief: Top 3 stories
  const topBriefStories = articles.slice(0, 3);
  const remainingStories = articles.slice(3);

  // Group remaining stories by category
  const categories: { key: string; title: string; stories: Article[] }[] = [
    {
      key: 'models-releases',
      title: 'New Models & Releases',
      stories: remainingStories.filter((a) => a.category === 'models_releases'),
    },
    {
      key: 'developer-tools',
      title: 'AI Tools for Developers',
      stories: remainingStories.filter((a) => a.category === 'developer_tools'),
    },
    {
      key: 'open-source',
      title: 'Open Source & Build',
      stories: remainingStories.filter((a) => a.category === 'open_source'),
    },
    {
      key: 'research',
      title: 'Research Worth Knowing',
      stories: remainingStories.filter((a) => a.category === 'research'),
    },
    {
      key: 'infrastructure',
      title: 'Industry & Infrastructure',
      stories: remainingStories.filter((a) => a.category === 'industry_infrastructure'),
    },
    {
      key: 'general-context',
      title: 'Independent Context & Analysis',
      stories: remainingStories.filter((a) => a.category === 'general_ai'),
    },
  ];

  // Render only sections that have at least one story
  const populatedCategories = categories.filter((c) => c.stories.length > 0);

  return (
    <div className="space-y-10">
      {/* Lead Section: The 5-Minute Brief */}
      {topBriefStories.length > 0 && (
        <section id="top-brief" className="border-b-2 border-border-strong pb-8">
          <div className="flex items-center space-x-2 border-b-2 border-border-strong pb-1 mb-6">
            <span className="w-3 h-3 bg-text-primary inline-block" />
            <h2 className="font-serif font-black text-xl sm:text-2xl uppercase tracking-tight text-text-primary">
              The 5-Minute Brief — Highest Impact Developments
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topBriefStories.map((story, idx) => (
              <StoryCard key={story.id} article={story} featured={idx === 0} />
            ))}
          </div>
        </section>
      )}

      {/* Main Newspaper Categorized Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Primary Stories */}
        <div className="lg:col-span-2 space-y-10">
          {populatedCategories.slice(0, 3).map((cat) => (
            <section key={cat.key} id={cat.key} className="border-b border-border pb-6">
              <div className="border-b border-border-strong pb-1 mb-4 flex items-center justify-between">
                <h3 className="font-serif font-bold text-lg uppercase tracking-wider text-text-primary">
                  {cat.title}
                </h3>
                <span className="text-xs font-mono text-text-muted">
                  {cat.stories.length} {cat.stories.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cat.stories.map((story) => (
                  <StoryCard key={story.id} article={story} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Right Rail: Secondary Sections & Dispatches */}
        <aside className="border-t lg:border-t-0 lg:border-l border-border lg:pl-6 space-y-8">
          {populatedCategories.slice(3).map((cat) => (
            <section key={cat.key} id={cat.key} className="border-b border-border pb-6">
              <div className="border-b border-border-strong pb-1 mb-4">
                <h3 className="font-serif font-bold text-base uppercase tracking-wider text-text-primary">
                  {cat.title}
                </h3>
              </div>
              <div className="space-y-4">
                {cat.stories.map((story) => (
                  <StoryCard key={story.id} article={story} />
                ))}
              </div>
            </section>
          ))}
        </aside>
      </div>
    </div>
  );
}
