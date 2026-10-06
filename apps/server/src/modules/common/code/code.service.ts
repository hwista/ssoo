import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
    const codeGroup = this.requireText(dto.codeGroup, '코드 유형');
    this.assertSharedGroup(codeGroup);
    const codeValue = this.requireText(dto.codeValue, '코드값');
    const displayNameKo = this.requireText(dto.displayNameKo, '코드명');

    await this.assertUniqueCode(codeGroup, codeValue);

    return this.db.client.cmCode.create({
      data: {
        codeGroup,
        codeValue,
        parentCode: dto.parentCode ?? null,
        displayNameKo,
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

    const codeGroup = dto.codeGroup === undefined
      ? existing.codeGroup
      : this.requireText(dto.codeGroup, '코드 유형');
    this.assertSharedGroup(codeGroup);
    const codeValue = dto.codeValue === undefined
      ? existing.codeValue
      : this.requireText(dto.codeValue, '코드값');

    if (codeGroup !== existing.codeGroup || codeValue !== existing.codeValue) {
      await this.assertUniqueCode(codeGroup, codeValue, id);
    }

    return this.db.client.cmCode.update({
      where: { id },
      data: {
        ...(dto.codeGroup !== undefined && { codeGroup }),
        ...(dto.codeValue !== undefined && { codeValue }),
        ...(dto.displayNameKo !== undefined && { displayNameKo: this.requireText(dto.displayNameKo, '코드명') }),
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

  /**
   * 원본 CRM의 명시적 삭제 동작. 기존 DELETE /codes/:id 비활성화 계약은
   * 호환성을 위해 유지하고, 비활성 코드만 별도 경로에서 영구 삭제한다.
   */
  async removePermanently(id: bigint) {
    const existing = await this.db.client.cmCode.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Code ${id} not found`);
    if (existing.isActive) {
      throw new BadRequestException('활성 코드는 먼저 비활성화한 뒤 삭제해야 합니다.');
    }

    await this.db.client.cmCode.delete({ where: { id } });
    return { id: id.toString() };
  }

  private assertSharedGroup(group: string): void {
    if (group === 'biz_year') throw new BadRequestException('사업연도는 CRM 사업연도 관리에서 변경하세요.');
  }

  private requireText(value: string, label: string): string {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!normalized) {
      throw new BadRequestException(`${label}은 필수입니다.`);
    }
    return normalized;
  }

  private async assertUniqueCode(codeGroup: string, codeValue: string, excludingId?: bigint) {
    const duplicate = await this.db.client.cmCode.findFirst({
      where: {
        codeGroup,
        codeValue,
        ...(excludingId ? { id: { not: excludingId } } : {}),
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException('동일한 코드 유형과 코드값이 이미 존재합니다.');
    }
  }
}
