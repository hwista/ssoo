import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';

export interface DmsSearchHistoryItem {
  id: string;
  query: string;
  count: number;
  lastResultCount: number;
  updatedAt: string;
}

export interface DmsPopularSearchKeyword {
  id: string;
  query: string;
  count: number;
  userCount: number;
  updatedAt: string;
}

export interface DmsSearchInsights {
  history: DmsSearchHistoryItem[];
  popular: DmsPopularSearchKeyword[];
}

interface SearchHistoryRow {
  query: string;
  search_count: number | bigint;
  last_result_count: number | bigint;
  last_searched_at: Date | string;
}

interface PopularSearchRow {
  query: string;
  total_count: number | bigint;
  user_count: number | bigint;
  last_searched_at: Date | string;
}

const DEFAULT_HISTORY_LIMIT = 50;
const DEFAULT_POPULAR_LIMIT = 5;
const MAX_LIMIT = 100;

@Injectable()
export class SearchHistoryService {
  private readonly logger = new Logger(SearchHistoryService.name);
  private tableInitialized = false;

  constructor(private readonly db: DatabaseService) {}

  async recordSearch(currentUser: TokenPayload, query: string, resultCount: number): Promise<void> {
    const normalized = this.normalizeQuery(query);
    if (!normalized || this.isLaunchVerificationQuery(normalized)) {
      return;
    }

    try {
      await this.ensureTable();
      await this.db.client.$executeRawUnsafe(
        `INSERT INTO dms.dm_search_query_m (
           user_id,
           query,
           normalized_query,
           search_count,
           last_result_count,
           first_searched_at,
           last_searched_at,
           created_at,
           updated_at
         )
         VALUES ($1, $2, $3, 1, $4, NOW(), NOW(), NOW(), NOW())
         ON CONFLICT (user_id, normalized_query)
         DO UPDATE SET
           query = EXCLUDED.query,
           search_count = dms.dm_search_query_m.search_count + 1,
           last_result_count = EXCLUDED.last_result_count,
           last_searched_at = NOW(),
           updated_at = NOW()`,
        BigInt(currentUser.userId),
        normalized,
        normalized.toLowerCase(),
        Math.max(0, Math.trunc(resultCount)),
      );
    } catch (error) {
      this.logger.warn('DMS 검색 기록 저장 실패 (검색 흐름 미차단)', {
        userId: currentUser.userId,
        query: normalized,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getSearchInsights(
    currentUser: TokenPayload,
    options?: { historyLimit?: number; popularLimit?: number },
  ): Promise<DmsSearchInsights> {
    await this.ensureTable();
    const historyLimit = this.normalizeLimit(options?.historyLimit, DEFAULT_HISTORY_LIMIT);
    const popularLimit = this.normalizeLimit(options?.popularLimit, DEFAULT_POPULAR_LIMIT);

    const historyRows = await this.db.client.$queryRawUnsafe<SearchHistoryRow[]>(
      `SELECT query, search_count, last_result_count, last_searched_at
       FROM dms.dm_search_query_m
       WHERE user_id = $1
       ORDER BY last_searched_at DESC
       LIMIT $2`,
      BigInt(currentUser.userId),
      historyLimit,
    );

    const popularRows = await this.db.client.$queryRawUnsafe<PopularSearchRow[]>(
      `SELECT
         query,
         SUM(search_count)::bigint AS total_count,
         COUNT(DISTINCT user_id)::bigint AS user_count,
         MAX(last_searched_at) AS last_searched_at
       FROM dms.dm_search_query_m
       WHERE query NOT ILIKE '%DMS Access Verify%'
         AND query NOT ILIKE '%런타임 검색기록 검증%'
         AND query NOT ILIKE '%다른 세션 유지 검증%'
       GROUP BY normalized_query, query
       HAVING SUM(search_count) >= 2
          AND COUNT(DISTINCT user_id) >= 2
       ORDER BY SUM(search_count) DESC, MAX(last_searched_at) DESC
       LIMIT $1`,
      popularLimit,
    );

    return {
      history: historyRows.map((row) => ({
        id: `history-${row.query}`,
        query: row.query,
        count: Number(row.search_count),
        lastResultCount: Number(row.last_result_count),
        updatedAt: new Date(row.last_searched_at).toISOString(),
      })),
      popular: popularRows.map((row) => ({
        id: `popular-${row.query}`,
        query: row.query,
        count: Number(row.total_count),
        userCount: Number(row.user_count),
        updatedAt: new Date(row.last_searched_at).toISOString(),
      })),
    };
  }

  private normalizeQuery(query: string): string {
    return query.trim().replace(/\s+/g, ' ');
  }

  private isLaunchVerificationQuery(query: string): boolean {
    return [
      'DMS Access Verify',
      '런타임 검색기록 검증',
      '다른 세션 유지 검증',
    ].some((pattern) => query.includes(pattern));
  }

  private normalizeLimit(value: number | undefined, fallback: number): number {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(1, Math.min(Math.trunc(value ?? fallback), MAX_LIMIT));
  }

  private async ensureTable(): Promise<void> {
    if (this.tableInitialized) {
      return;
    }

    await this.db.client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS dms.dm_search_query_m (
        search_query_id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        query TEXT NOT NULL,
        normalized_query TEXT NOT NULL,
        search_count INTEGER NOT NULL DEFAULT 1,
        last_result_count INTEGER NOT NULL DEFAULT 0,
        first_searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT ux_dm_search_query_m_user_normalized UNIQUE (user_id, normalized_query)
      )
    `);

    await this.db.client.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS ix_dm_search_query_m_user_last
      ON dms.dm_search_query_m (user_id, last_searched_at DESC)
    `);

    await this.db.client.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS ix_dm_search_query_m_popular
      ON dms.dm_search_query_m (normalized_query, search_count DESC, last_searched_at DESC)
    `);

    this.tableInitialized = true;
  }
}
