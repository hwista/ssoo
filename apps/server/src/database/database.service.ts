import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createPrismaClient, ExtendedPrismaClient } from '@ssoo/database';

/**
 * Database Service
 *
 * Prisma Client with commonColumnsExtension 적용
 * - 공통 컬럼(createdAt, updatedAt, deletedAt) 자동 관리
 * - softDelete 지원
 *
 * @ssoo/database의 createPrismaClient()를 사용하여
 * Extension이 적용된 클라이언트를 생성합니다.
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private _client!: ExtendedPrismaClient;

  constructor() {
    this._client = createPrismaClient();
  }

  async onModuleInit() {
    await this._client.$connect();
  }

  async onModuleDestroy() {
    await this._client.$disconnect();
  }

  // ===== Prisma 모델 Getter (기존 this.db.xxx 패턴 유지) =====

  get user() {
    return this._client!.user;
  }

  get project() {
    return this._client!.project;
  }

  get menu() {
    return this._client!.menu;
  }

  get userFavorite() {
    return this._client!.userFavorite;
  }

  // ===== Raw Query (기존 this.db.$queryRaw 패턴 유지) =====

  get $queryRaw() {
    return this._client!.$queryRaw.bind(this._client!);
  }

  get $executeRaw() {
    return this._client!.$executeRaw.bind(this._client!);
  }

  get $transaction() {
    return this._client!.$transaction.bind(this._client!);
  }

  /**
   * Generic accessor for new models without adding explicit getters.
   * Prefer `db.client.<model>` in new code to avoid touching this service.
   */
  get client(): ExtendedPrismaClient {
    return this._client!;
  }
}
