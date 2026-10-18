import React from 'react';
import type { Article } from '../../types/article';
import { StoryCard } from './StoryCard';

interface SectionGridProps {
  articles: Article[];
}

export function SectionGrid({ articles }: SectionGridProps) {
  if (articles.length === 0) return null;

  // The 5-Minute Brief: Top 3 highest-priority stories
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
    <div className="space-y-12">
      {/* Lead Section: The 5-Minute Brief (Top 3 Highest-Priority Stories) */}
      {topBriefStories.length > 0 && (
        <section id="top-brief" className="border-b-2 border-border-strong pb-8">
          <div className="flex items-center justify-between border-b-2 border-border-strong pb-2 mb-6">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-text-primary inline-block" />
              <h2 className="font-serif font-black text-xl sm:text-2xl uppercase tracking-tight text-text-primary">
                The 5-Minute Brief — Highest Impact Developments
              </h2>
            </div>
            <span className="text-xs font-mono text-text-muted">
              3 LEAD STORIES
            </span>
          </div>

          {/* Consistent 3-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topBriefStories.map((story) => (
              <StoryCard key={story.id} article={story} />
            ))}
          </div>
        </section>
      )}

      {/* Categorized Editorial Sections — Consistent 3-Column Grid throughout scrolling */}
      <div className="space-y-12">
        {populatedCategories.map((cat) => (
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

            {/* Consistent 3-column grid: maintains 3 columns across desktop as user scrolls */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cat.stories.map((story) => (
                <StoryCard key={story.id} article={story} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
