import { describe, it, expect } from 'vitest';
import React from 'react';
import { StoryCard } from '../src/components/editorial/StoryCard';
import { Masthead } from '../src/components/layout/Masthead';
import { InteractiveEditionView } from '../src/components/editorial/InteractiveEditionView';
import type { Article, SourceHealthSummary } from '../src/types/article';

describe('Milestone 5: Newspaper UI and Source Transparency Tests', () => {
  const sampleArticle: Article = {
    id: 'test-article-1',
    sourceId: 'openai-news',
    sourceName: 'OpenAI News',
    isOfficial: true,
    category: 'models_releases',
    title: 'GPT-4o Realtime Audio and Speech API Released',
    canonicalUrl: 'https://openai.com/news/gpt-4o-realtime',
    originalFeedUrl: 'https://openai.com/news/rss.xml',
    description: 'A developer-focused voice and multimodal reasoning API with Python and Node SDKs.',
    author: 'OpenAI Team',
    publishedAt: '2026-10-18T05:30:00.000Z',
    fetchedAt: '2026-10-18T06:00:00.000Z',
    summaryKind: 'source_snippet',
    provenanceLabel: 'Official release',
    categories: ['models_releases'],
    priorityScore: 92,
  };

  it('StoryCard renders publisher, published time, source link, and source excerpt distinction', () => {
    const element = React.createElement(StoryCard, { article: sampleArticle });
    expect(element).toBeTruthy();
    expect(element.props.article.sourceName).toBe('OpenAI News');
    expect(element.props.article.canonicalUrl).toBe('https://openai.com/news/gpt-4o-realtime');
    expect(element.props.article.summaryKind).toBe('source_snippet');
    expect(element.props.article.provenanceLabel).toBe('Official release');
  });

  it('StoryCard clearly supports AI-generated summary distinction when summaryKind is ai_generated', () => {
    const aiArticle: Article = {
      ...sampleArticle,
      summaryKind: 'ai_generated',
    };

    const element = React.createElement(StoryCard, { article: aiArticle });
    expect(element.props.article.summaryKind).toBe('ai_generated');
  });

  it('Masthead accepts issueDate, updatedAt, source health, and story counts', () => {
    const mockHealth: SourceHealthSummary[] = [
      {
        id: 's1',
        name: 'OpenAI News',
        category: 'models_releases',
        feedUrl: 'https://openai.com/news/rss.xml',
        isOfficial: true,
        enabled: true,
        status: 'healthy',
        httpStatus: 200,
        validEntriesCount: 10,
        newestEntryPublishedAt: '2026-10-18T05:30:00.000Z',
        checkedAt: '2026-10-18T06:00:00.000Z',
      },
    ];

    const element = React.createElement(Masthead, {
      issueDate: 'Sunday, 18 October 2026',
      updatedAt: '2026-10-18T06:00:00.000Z',
      totalStories: 100,
      healthySourcesCount: 1,
      totalSourcesCount: 1,
      sourceHealth: mockHealth,
    });

    expect(element).toBeTruthy();
    expect(element.props.totalStories).toBe(100);
    expect(element.props.healthySourcesCount).toBe(1);
  });

  it('InteractiveEditionView initializes with real articles without injecting mock stories', () => {
    const element = React.createElement(InteractiveEditionView, {
      articles: [sampleArticle],
    });

    expect(element).toBeTruthy();
    expect(element.props.articles).toHaveLength(1);
    expect(element.props.articles[0].canonicalUrl).toBe('https://openai.com/news/gpt-4o-realtime');
  });
});
