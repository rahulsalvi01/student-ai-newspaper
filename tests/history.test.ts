/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { editionsRepo } from '../src/lib/db/repository';

describe('Edition History & Real-Persistence Invariants', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    };
  });

  it('Empty history invariant: returns empty array without fabricating demo editions', async () => {
    const orderMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const inMock = vi.fn().mockReturnValue({ order: orderMock });
    const eqMock = vi.fn().mockReturnValue({ in: inMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    mockSupabase.from.mockReturnValue({ select: selectMock });

    const editions = await editionsRepo.getAllEditions('Asia/Kolkata', mockSupabase);

    expect(editions).toEqual([]);
    expect(editions).toHaveLength(0);
  });

  it('Retrieves real persisted editions sorted by date descending', async () => {
    const realEditions = [
      {
        id: 'ed-2',
        issue_date: '2026-10-18',
        timezone: 'Asia/Kolkata',
        status: 'ready',
        headline: 'The Daily AI Brief',
        article_count: 100,
      },
      {
        id: 'ed-1',
        issue_date: '2026-10-17',
        timezone: 'Asia/Kolkata',
        status: 'ready',
        headline: 'The Daily AI Brief',
        article_count: 95,
      },
    ];

    const orderMock = vi.fn().mockResolvedValue({ data: realEditions, error: null });
    const inMock = vi.fn().mockReturnValue({ order: orderMock });
    const eqMock = vi.fn().mockReturnValue({ in: inMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    mockSupabase.from.mockReturnValue({ select: selectMock });

    const editions = await editionsRepo.getAllEditions('Asia/Kolkata', mockSupabase);

    expect(editions).toHaveLength(2);
    expect(editions[0].issue_date).toBe('2026-10-18');
    expect(editions[1].issue_date).toBe('2026-10-17');
  });

  it('getEditionByDate returns null for dates without a real archived edition', async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const eqTzMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const eqDateMock = vi.fn().mockReturnValue({ eq: eqTzMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqDateMock });
    mockSupabase.from.mockReturnValue({ select: selectMock });

    const edition = await editionsRepo.getEditionByDate('2026-10-01', 'Asia/Kolkata', mockSupabase);
    expect(edition).toBeNull();
  });
});
