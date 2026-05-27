import { jest } from '@jest/globals';
import { SearchHistoryService } from '../../src/modules/dms/search/search-history.service.js';

const user = { userId: '7', loginId: 'kim.user', userName: 'Kim User' };

function createDbMock() {
  const db = {
    client: {
      $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
      $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    },
  };
  return db;
}

describe('SearchHistoryService', () => {
  it('records normalized user-scoped search queries in the DB', async () => {
    const db = createDbMock();
    const service = new SearchHistoryService(db as never);

    await service.recordSearch(user, '  검증   강화  ', 12);

    expect(db.client.$executeRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS dms.dm_search_query_m'));
    expect(db.client.$executeRawUnsafe).toHaveBeenLastCalledWith(
      expect.stringContaining('INSERT INTO dms.dm_search_query_m'),
      BigInt(7),
      '검증 강화',
      '검증 강화',
      12,
    );
  });

  it('returns account history and global popular keywords from DB rows', async () => {
    const db = createDbMock();
    db.client.$queryRawUnsafe
      .mockResolvedValueOnce([
        {
          query: '검증',
          search_count: 3,
          last_result_count: 16,
          last_searched_at: new Date('2026-05-18T08:33:14.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          query: '검증',
          total_count: 7,
          user_count: 2,
          last_searched_at: new Date('2026-05-18T08:33:14.000Z'),
        },
      ]);
    const service = new SearchHistoryService(db as never);

    const result = await service.getSearchInsights(user, { historyLimit: 10, popularLimit: 5 });

    expect(result.history).toEqual([
      {
        id: 'history-검증',
        query: '검증',
        count: 3,
        lastResultCount: 16,
        updatedAt: '2026-05-18T08:33:14.000Z',
      },
    ]);
    expect(result.popular).toEqual([
      {
        id: 'popular-검증',
        query: '검증',
        count: 7,
        userCount: 2,
        updatedAt: '2026-05-18T08:33:14.000Z',
      },
    ]);
  });

  it('does not record launch verification queries as user search history', async () => {
    const db = createDbMock();
    const service = new SearchHistoryService(db as never);

    await service.recordSearch(user, 'DMS Access Verify mpdjh3qf-jaca0k', 1);

    expect(db.client.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('keeps launch verification and one-off searches out of global popular keywords', async () => {
    const db = createDbMock();
    const service = new SearchHistoryService(db as never);

    await service.getSearchInsights(user, { historyLimit: 10, popularLimit: 5 });

    const popularQuerySql = db.client.$queryRawUnsafe.mock.calls[1]?.[0] as string;
    expect(popularQuerySql).toContain('HAVING SUM(search_count) >= 2');
    expect(popularQuerySql).toContain('COUNT(DISTINCT user_id) >= 2');
    expect(popularQuerySql).toContain('DMS Access Verify');
    expect(popularQuerySql).toContain('런타임 검색기록 검증');
    expect(popularQuerySql).toContain('다른 세션 유지 검증');
  });
});
