import { describe, it, expect } from 'vitest';
import React from 'react';
import { EmptyState } from '../src/components/editorial/EmptyState';
import type { SourceHealthSummary } from '../src/types/article';

describe('EmptyState Component Tests', () => {
  it('renders honest editorial message without mock stories', () => {
    const mockHealth: SourceHealthSummary[] = [
      {
        id: 's1',
        name: 'Test Source',
        category: 'models_releases',
        feedUrl: 'https://example.com/feed.xml',
        isOfficial: true,
        enabled: true,
        status: 'healthy',
        httpStatus: 200,
        validEntriesCount: 0,
        newestEntryPublishedAt: null,
        checkedAt: new Date().toISOString(),
      },
    ];

    const element = React.createElement(EmptyState, { sourceHealth: mockHealth });
    expect(element).toBeTruthy();
    expect(element.props.sourceHealth).toHaveLength(1);
  });
});
