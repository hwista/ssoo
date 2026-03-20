import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { CreateCodeDto, UpdateCodeDto } from './dto/code.dto.js';

@Injectable()
export class CodeService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * 코드 그룹 목록 (DISTINCT codeGroup + 건수)
   */
  async findGroups() {
    const groups = await this.db.client.cmCode.groupBy({
      by: ['codeGroup'],
      _count: { codeGroup: true },
      where: { isActive: true },
      orderBy: { codeGroup: 'asc' },
    });

    return groups.map((g) => ({
      codeGroup: g.codeGroup,
      count: g._count.codeGroup,
    }));
  }

  /**
   * 특정 그룹의 코드 목록
   */
  async findByGroup(codeGroup: string) {
    return this.db.client.cmCode.findMany({
      where: { codeGroup },
      orderBy: [{ sortOrder: 'asc' }, { codeValue: 'asc' }],
    });
  }

  /**
   * 코드 생성
   */
  async create(dto: CreateCodeDto) {
    return this.db.client.cmCode.create({
      data: {
        codeGroup: dto.codeGroup,
        codeValue: dto.codeValue,
        parentCode: dto.parentCode ?? null,
        displayNameKo: dto.displayNameKo,
        displayNameEn: dto.displayNameEn ?? null,
        description: dto.description ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  /**
   * 코드 수정
   */
  async update(id: bigint, dto: UpdateCodeDto) {
    const existing = await this.db.client.cmCode.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Code ${id} not found`);

    return this.db.client.cmCode.update({
      where: { id },
      data: {
        ...(dto.displayNameKo !== undefined && { displayNameKo: dto.displayNameKo }),
        ...(dto.displayNameEn !== undefined && { displayNameEn: dto.displayNameEn }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.parentCode !== undefined && { parentCode: dto.parentCode }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  /**
   * 코드 비활성화 (soft delete)
   */
  async deactivate(id: bigint) {
    const existing = await this.db.client.cmCode.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Code ${id} not found`);

    return this.db.client.cmCode.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
