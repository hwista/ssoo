import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CrmBusinessYear } from '@ssoo/types/crm';
import { DatabaseService } from '../../../database/database.service.js';

@Injectable()
export class BusinessYearService {
  constructor(private readonly db: DatabaseService) {}

  async list(): Promise<CrmBusinessYear[]> {
    const rows = await this.db.client.crmBusinessYear.findMany({ orderBy: [{ year: 'desc' }] });
    return rows.map((row) => this.toResponse(row));
  }

  async create(year: number, actorId: bigint): Promise<CrmBusinessYear> {
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new BadRequestException('2000년부터 2100년 사이의 4자리 연도를 입력하세요.');
    }
    try {
      const row = await this.db.client.crmBusinessYear.create({
        data: { year, displayName: `${year}년`, sortOrder: year, createdBy: actorId, updatedBy: actorId },
      });
      return this.toResponse(row);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('이미 등록된 사업연도입니다.');
      }
      throw error;
    }
  }

  async setActive(id: string, isActive: boolean, actorId: bigint): Promise<CrmBusinessYear> {
    try {
      const row = await this.db.client.crmBusinessYear.update({
        where: { id: this.parseId(id) }, data: { isActive, updatedBy: actorId },
      });
      return this.toResponse(row);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new NotFoundException('사업연도를 찾을 수 없습니다.');
      }
      throw error;
    }
  }

  async remove(id: string, actorId: bigint): Promise<{ id: string }> {
    const key = this.parseId(id);
    await this.db.client.$transaction(async (tx) => {
      // Atomic inactive predicate also locks the row against concurrent reactivation.
      const locked = await tx.crmBusinessYear.updateMany({ where: { id: key, isActive: false }, data: { updatedBy: actorId } });
      if (locked.count !== 1) {
        const row = await tx.crmBusinessYear.findUnique({ where: { id: key } });
        if (!row) throw new NotFoundException('사업연도를 찾을 수 없습니다.');
        throw new BadRequestException('활성 사업연도는 먼저 비활성화해야 삭제할 수 있습니다.');
      }
      await tx.crmBusinessYear.delete({ where: { id: key } });
    });
    return { id };
  }

  private parseId(id: string): bigint {
    if (!/^[1-9]\d*$/.test(id) || BigInt(id) > 9223372036854775807n) {
      throw new BadRequestException('유효하지 않은 사업연도 ID입니다.');
    }
    return BigInt(id);
  }

  private toResponse(row: { id: bigint; year: number; displayName: string; sortOrder: number; isActive: boolean }): CrmBusinessYear {
    return { id: row.id.toString(), year: row.year, displayName: row.displayName, sortOrder: row.sortOrder, isActive: row.isActive };
  }
}
