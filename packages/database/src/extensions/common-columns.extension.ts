/**
 * Prisma Extension for Common Columns
 * 
 * 하이브리드 히스토리 관리 방식의 API 레이어 담당:
 * - transaction_id: 요청별 고유 UUID
 * - last_source: 데이터 변경 출처 (API, BATCH, IMPORT 등)
 * - last_activity: 마지막 활동 식별자 (Model.action)
 * - updatedBy: 수정자 ID
 * - updatedAt: 수정 시각
 * - createdBy: 생성자 ID (create 시)
 * 
 * 트리거가 히스토리 row 생성을 담당하고,
 * 이 Extension이 컨텍스트 정보(누가, 언제, 어디서)를 담당합니다.
 * 
 * Prisma 6.x에서는 $use 대신 Client Extensions 사용
 */

import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

/**
 * 요청 컨텍스트 인터페이스
 */
export interface RequestContext {
  userId?: bigint;
  source?: 'API' | 'BATCH' | 'IMPORT' | 'SYNC' | 'SYSTEM';
  transactionId?: string;
}

/**
 * 컨텍스트를 저장하는 AsyncLocalStorage (Node.js 16+)
 * 요청별로 격리된 컨텍스트 제공
 */
import { AsyncLocalStorage } from 'async_hooks';

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * 현재 요청 컨텍스트 가져오기
 */
export function getRequestContext(): RequestContext {
  return requestContextStorage.getStore() || {};
}

/**
 * 요청 컨텍스트 설정하기 (NestJS 미들웨어/인터셉터에서 호출)
 */
export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  // transactionId가 없으면 자동 생성
  const contextWithTx = {
    ...context,
    transactionId: context.transactionId || randomUUID(),
  };
  return requestContextStorage.run(contextWithTx, fn);
}

type ExtensionDataRecord = Record<string, unknown>;

function toDataRecord(data: unknown): ExtensionDataRecord {
  return data && typeof data === 'object' && !Array.isArray(data)
    ? (data as ExtensionDataRecord)
    : {};
}

/**
 * 공통 컬럼 데이터 준비 (create용)
 */
function prepareCreateData<T>(data: T, modelName: string): T {
  const ctx = getRequestContext();
  const now = new Date();
  const record = toDataRecord(data);

  return {
    ...record,
    createdBy: ctx.userId ?? record.createdBy,
    createdAt: record.createdAt ?? now,
    updatedBy: ctx.userId ?? record.updatedBy,
    updatedAt: now,
    lastSource: ctx.source ?? 'API',
    lastActivity: `${modelName}.create`,
    transactionId: ctx.transactionId,
  } as T;
}

/**
 * 공통 컬럼 데이터 준비 (update용)
 */
function prepareUpdateData<T>(
  data: T,
  modelName: string,
  action: string = 'update',
): T {
  const ctx = getRequestContext();
  const now = new Date();
  const record = toDataRecord(data);

  return {
    ...record,
    updatedBy: ctx.userId ?? record.updatedBy,
    updatedAt: now,
    lastSource: ctx.source ?? 'API',
    lastActivity: `${modelName}.${action}`,
    transactionId: ctx.transactionId,
  } as T;
}

/**
 * Prisma Client Extension - 공통 컬럼 자동 세팅
 * 
 * 사용법:
 * const prisma = new PrismaClient().$extends(commonColumnsExtension);
 */
/**
 * 공통 컬럼 Extension에서 제외할 모델 목록
 * - History 접미사 모델: 히스토리 테이블은 트리거에서 관리
 * - UserFavorite: 단순 관계 테이블로 공통 컬럼 없음
 */
const EXCLUDED_MODELS = ['UserFavorite'];

function shouldExcludeModel(model: string): boolean {
  return model.endsWith('History') || EXCLUDED_MODELS.includes(model);
}

function applyActiveWhereFilter(args: unknown) {
  const target = args as { where?: unknown };
  const where =
    target.where && typeof target.where === 'object' && !Array.isArray(target.where)
      ? (target.where as Record<string, unknown>)
      : {};

  if (where.isActive === undefined) {
    target.where = { ...where, isActive: true };
  }
}

export const commonColumnsExtension = Prisma.defineExtension({
  name: 'common-columns',
  query: {
    $allModels: {
      async create({ model, args, query }) {
        // 제외 대상 모델은 원본 쿼리 실행
        if (shouldExcludeModel(model)) {
          return query(args);
        }
        
        args.data = prepareCreateData(args.data, model);
        return query(args);
      },

      async createMany({ model, args, query }) {
        // 제외 대상 모델은 원본 쿼리 실행
        if (shouldExcludeModel(model)) {
          return query(args);
        }

        if (Array.isArray(args.data)) {
          args.data = args.data.map((item) => prepareCreateData(item, model)) as typeof args.data;
        } else {
          args.data = prepareCreateData(args.data, model) as typeof args.data;
        }
        return query(args);
      },

      async update({ model, args, query }) {
        // 제외 대상 모델은 원본 쿼리 실행
        if (shouldExcludeModel(model)) {
          return query(args);
        }

        args.data = prepareUpdateData(args.data, model, 'update') as typeof args.data;
        return query(args);
      },

      async updateMany({ model, args, query }) {
        // 제외 대상 모델은 원본 쿼리 실행
        if (shouldExcludeModel(model)) {
          return query(args);
        }

        args.data = prepareUpdateData(args.data, model, 'updateMany') as typeof args.data;
        return query(args);
      },

      async upsert({ model, args, query }) {
        // 제외 대상 모델은 원본 쿼리 실행
        if (shouldExcludeModel(model)) {
          return query(args);
        }

        args.create = prepareCreateData(args.create, model) as typeof args.create;
        args.update = prepareUpdateData(args.update, model, 'upsert') as typeof args.update;
        return query(args);
      },

      // delete/deleteMany는 트리거에서 OLD row 정보 사용
    },
  },
});

/**
 * Soft Delete Extension (선택적)
 * 
 * delete/deleteMany를 update로 변환하여 is_active=false 처리
 */
export const softDeleteExtension = Prisma.defineExtension({
  name: 'soft-delete',
  query: {
    $allModels: {
      async delete({ model, args, query }) {
        // 히스토리 모델은 제외
        if (model.endsWith('History')) {
          return query(args);
        }

        const ctx = getRequestContext();
        const now = new Date();

        // delete를 update로 변환
        return (query as any)({
          ...args,
          data: {
            isActive: false,
            updatedBy: ctx.userId,
            updatedAt: now,
            lastSource: ctx.source ?? 'API',
            lastActivity: `${model}.softDelete`,
            transactionId: ctx.transactionId,
          },
        });
      },

      async deleteMany({ model, args, query }) {
        // 히스토리 모델은 제외
        if (model.endsWith('History')) {
          return query(args);
        }

        const ctx = getRequestContext();
        const now = new Date();

        // deleteMany를 updateMany로 변환
        return (query as any)({
          ...args,
          data: {
            isActive: false,
            updatedBy: ctx.userId,
            updatedAt: now,
            lastSource: ctx.source ?? 'API',
            lastActivity: `${model}.softDeleteMany`,
            transactionId: ctx.transactionId,
          },
        });
      },
    },
  },
});

/**
 * Active Filter Extension (선택적)
 * 
 * 기본적으로 is_active=true인 데이터만 조회
 */
export const activeFilterExtension = Prisma.defineExtension({
  name: 'active-filter',
  query: {
    $allModels: {
      async findFirst({ model, args, query }) {
        if (model.endsWith('History')) return query(args);

        applyActiveWhereFilter(args);
        return query(args);
      },

      async findMany({ model, args, query }) {
        if (model.endsWith('History')) return query(args);

        applyActiveWhereFilter(args);
        return query(args);
      },

      async findUnique({ model, args, query }) {
        if (model.endsWith('History')) return query(args);
        
        // findUnique는 where 조건 변경이 제한적
        return query(args);
      },

      async count({ model, args, query }) {
        if (model.endsWith('History')) return query(args);

        applyActiveWhereFilter(args);
        return query(args);
      },
    },
  },
});
