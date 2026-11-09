import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { ExtendedPrismaClient } from '@ssoo/database';
import { DatabaseService } from '../../../database/database.service.js';
import type { CodeMutationDto, CreateCodeDto, UpdateCodeDto } from './dto/code.dto.js';

type CodeTransaction = Parameters<Parameters<ExtendedPrismaClient['$transaction']>[0]>[0];

@Injectable()
export class CodeService {
  constructor(private readonly db: DatabaseService) {}

  private async write<T>(operation: (tx: CodeTransaction) => Promise<T>): Promise<T> {
    try { return await this.db.client.$transaction(operation, { isolationLevel: 'Serializable' }); }
    catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2034') throw new ConflictException('코드 또는 참조가 변경됐습니다. 새로 조회한 뒤 처리해 주세요.');
      if (error instanceof Error && 'code' in error && error.code === 'P2002') throw new ConflictException('동일한 코드 유형과 코드값이 이미 존재합니다.');
      throw error;
    }
  }

  private assertRevision(existing: { updatedAt: Date }, dto: CodeMutationDto) {
    if (dto.expectedUpdatedAt && existing.updatedAt.getTime() !== new Date(dto.expectedUpdatedAt).getTime()) throw new ConflictException('다른 운영자가 코드를 변경했습니다. 새로 조회한 뒤 처리해 주세요.');
  }

  private audit(dto: CodeMutationDto, actor?: bigint) {
    return { ...(dto.reason !== undefined ? { memo: this.requireText(dto.reason, '변경 사유') } : {}), ...(actor !== undefined ? { updatedBy: actor, lastSource: 'admin-code-operations', lastActivity: 'code.admin.change' } : {}) };
  }

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
      ...this.ownership(g.codeGroup),
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

  private ownership(group: string) {
    const owner = group.startsWith('USER_') || group === 'UNIT' ? 'platform'
      : /^(PROJECT|TASK|ISSUE|MILESTONE)_/.test(group) ? 'pms'
        : ['biz_type', 'group_type', 'payment_term', 'biz_year'].includes(group) ? 'crm' : 'unclassified';
    return { owner };
  }

  async usage(id: bigint, client: CodeTransaction = this.db.client) {
    const code = await client.cmCode.findUnique({ where: { id } });
    if (!code) throw new NotFoundException(`Code ${id} not found`);
    const references: Array<{ name: string; count: number }> = [];
    if (code.codeGroup === 'USER_ROLE') {
      references.push({ name: '사용자 역할', count: await client.user.count({ where: { roleCode: code.codeValue } }) });
      references.push({ name: '역할 마스터', count: await client.role.count({ where: { roleCode: code.codeValue } }) });
    }
    if (code.codeGroup === 'USER_DEPARTMENT') references.push({ name: '사용자 부서', count: await client.user.count({ where: { departmentCode: code.codeValue } }) });
    if (code.codeGroup === 'USER_POSITION') {
      references.push({ name: '사용자 직위', count: await client.user.count({ where: { positionCode: code.codeValue } }) });
      references.push({ name: '조직 소속 직위', count: await client.userOrganizationRelation.count({ where: { positionCode: code.codeValue } }) });
    }
    references.push({ name: '동일 유형 하위 코드', count: await client.cmCode.count({ where: { codeGroup: code.codeGroup, parentCode: code.codeValue, id: { not: id } } }) });
    return { id: id.toString(), ...this.ownership(code.codeGroup), references, total: references.reduce((sum, entry) => sum + entry.count, 0), coverage: '공통 사용자·역할·소속 및 동일 유형 하위 코드의 직접 참조만 집계합니다. 각 앱의 업무 자료·설정·코드 상수 참조는 해당 앱에서 별도 확인해야 합니다.' };
  }

  private async assertUnused(id: bigint, client: CodeTransaction) {
    const usage = await this.usage(id, client);
    if (usage.total > 0) throw new ConflictException(`공통 데이터에서 ${usage.total}건 참조 중입니다. 참조를 먼저 정리해 주세요.`);
  }

  /**
   * 코드 생성
   */
  async create(dto: CreateCodeDto, actor?: bigint) {
    const codeGroup = this.requireText(dto.codeGroup, '코드 유형');
    this.assertSharedGroup(codeGroup);
    const codeValue = this.requireText(dto.codeValue, '코드값');
    const displayNameKo = this.requireText(dto.displayNameKo, '코드명');

    return this.write(async (tx) => {
      await this.assertUniqueCode(codeGroup, codeValue, undefined, tx);
      return tx.cmCode.create({
        data: {
          ...this.audit(dto, actor),
          ...(actor !== undefined ? { createdBy: actor } : {}),
          codeGroup,
          codeValue,
          parentCode: dto.parentCode ?? null,
          displayNameKo,
          displayNameEn: dto.displayNameEn ?? null,
          description: dto.description ?? null,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
    });
  }

  /**
   * 코드 수정
   */
  async update(id: bigint, dto: UpdateCodeDto, actor?: bigint) {
    return this.write(async (tx) => {
      const existing = await tx.cmCode.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException(`Code ${id} not found`);
      this.assertSharedGroup(existing.codeGroup);
      this.assertRevision(existing, dto);

      const codeGroup = dto.codeGroup === undefined
        ? existing.codeGroup
        : this.requireText(dto.codeGroup, '코드 유형');
      this.assertSharedGroup(codeGroup);
      const codeValue = dto.codeValue === undefined
        ? existing.codeValue
        : this.requireText(dto.codeValue, '코드값');

      if (codeGroup !== existing.codeGroup || codeValue !== existing.codeValue) {
        await this.assertUnused(id, tx);
        await this.assertUniqueCode(codeGroup, codeValue, id, tx);
      }

      if (dto.isActive === false) await this.assertUnused(id, tx);
      return tx.cmCode.update({
        where: { id },
        data: {
          ...this.audit(dto, actor),
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
    });
  }

  /**
   * 코드 비활성화 (soft delete)
   */
  async deactivate(id: bigint, dto: CodeMutationDto = {}, actor?: bigint) {
    return this.write(async (tx) => {
      const existing = await tx.cmCode.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException(`Code ${id} not found`);
      this.assertSharedGroup(existing.codeGroup);
      this.assertRevision(existing, dto);

      await this.assertUnused(id, tx);
      return tx.cmCode.update({
        where: { id },
        data: { isActive: false, ...this.audit(dto, actor) },
    });
    });
  }

  /**
   * 원본 CRM의 명시적 삭제 동작. 기존 DELETE /codes/:id 비활성화 계약은
   * 호환성을 위해 유지하고, 비활성 코드만 별도 경로에서 영구 삭제한다.
   */
  async removePermanently(id: bigint, dto: CodeMutationDto = {}, actor?: bigint) {
    return this.write(async (tx) => {
      const existing = await tx.cmCode.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException(`Code ${id} not found`);
      this.assertSharedGroup(existing.codeGroup);
      this.assertRevision(existing, dto);
      if (existing.isActive) {
        throw new BadRequestException('활성 코드는 먼저 비활성화한 뒤 삭제해야 합니다.');
      }

      await this.assertUnused(id, tx);
      if (actor !== undefined || dto.reason) await tx.cmCode.update({ where: { id }, data: this.audit(dto, actor) });
      await tx.cmCode.delete({ where: { id } });
      return { id: id.toString() };
    });
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

  private async assertUniqueCode(codeGroup: string, codeValue: string, excludingId?: bigint, client: CodeTransaction = this.db.client) {
    const duplicate = await client.cmCode.findFirst({
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
