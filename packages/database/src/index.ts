import { PrismaClient } from '@prisma/client';
import { commonColumnsExtension } from './extensions/common-columns.extension.js';

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

/**
 * Prisma Client with Extensions
 * 
 * 하이브리드 히스토리 관리:
 * - DB 트리거: 히스토리 row 생성 담당
 * - Prisma Extension: 공통 컬럼 자동 세팅 담당
 */
export const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  // Prisma 6.x: $use 대신 $extends 사용
  return client.$extends(commonColumnsExtension);
};

/** Extended Prisma Client 타입 */
export type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Extension exports
export {
  commonColumnsExtension,
  softDeleteExtension,
  activeFilterExtension,
} from './extensions/common-columns.extension.js';

export {
  RequestContext,
  requestContextStorage,
  getRequestContext,
  runWithContext,
} from './extensions/common-columns.extension.js';

export { PrismaClient } from '@prisma/client';
export type { Prisma } from '@prisma/client';
export default prisma;
