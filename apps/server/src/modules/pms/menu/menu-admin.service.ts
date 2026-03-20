import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import type { CreateMenuDto, UpdateMenuDto } from './dto/menu-admin.dto.js';

@Injectable()
export class MenuAdminService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * 전체 메뉴 목록 (플랫 리스트, 트리 정보 포함)
   */
  async findAll() {
    const menus = await this.db.menu.findMany({
      where: { isActive: true },
      orderBy: [{ menuLevel: 'asc' }, { sortOrder: 'asc' }],
      include: {
        parentMenu: { select: { menuName: true } },
      },
    });

    return menus.map((m) => {
      const serialized = serializeBigInt(m);
      const obj = serialized as Record<string, unknown>;
      return {
        ...obj,
        parentMenuName: m.parentMenu?.menuName ?? null,
        parentMenu: undefined,
      };
    });
  }

  /**
   * 단일 메뉴 조회
   */
  async findOne(id: bigint) {
    const menu = await this.db.menu.findUnique({
      where: { id },
      include: {
        parentMenu: { select: { menuName: true } },
      },
    });

    if (!menu) throw new NotFoundException(`Menu ${id} not found`);

    const serialized = serializeBigInt(menu);
    const obj = serialized as Record<string, unknown>;
    return {
      ...obj,
      parentMenuName: menu.parentMenu?.menuName ?? null,
      parentMenu: undefined,
    };
  }

  /**
   * 메뉴 생성
   */
  async create(dto: CreateMenuDto) {
    // menuCode 중복 검증
    const existing = await this.db.menu.findFirst({
      where: { menuCode: dto.menuCode },
    });
    if (existing) {
      throw new ConflictException(`menuCode "${dto.menuCode}" already exists`);
    }

    // 부모 메뉴가 있으면 menuLevel 자동 계산
    let menuLevel = 1;
    if (dto.parentMenuId) {
      const parent = await this.db.menu.findUnique({
        where: { id: BigInt(dto.parentMenuId) },
      });
      if (!parent) {
        throw new NotFoundException(`Parent menu ${dto.parentMenuId} not found`);
      }
      menuLevel = parent.menuLevel + 1;
    }

    const result = await this.db.menu.create({
      data: {
        menuCode: dto.menuCode,
        menuName: dto.menuName,
        menuNameEn: dto.menuNameEn ?? null,
        menuType: dto.menuType ?? 'menu',
        parentMenuId: dto.parentMenuId ? BigInt(dto.parentMenuId) : null,
        menuPath: dto.menuPath ?? null,
        icon: dto.icon ?? null,
        sortOrder: dto.sortOrder ?? 0,
        menuLevel,
        isVisible: dto.isVisible ?? true,
        isAdminMenu: dto.isAdminMenu ?? false,
        openType: dto.openType ?? 'tab',
        description: dto.description ?? null,
      },
    });

    return serializeBigInt(result);
  }

  /**
   * 메뉴 수정
   */
  async update(id: bigint, dto: UpdateMenuDto) {
    const existing = await this.db.menu.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Menu ${id} not found`);

    // 부모가 변경되면 menuLevel 재계산
    let menuLevel: number | undefined;
    if (dto.parentMenuId !== undefined) {
      if (dto.parentMenuId) {
        const parent = await this.db.menu.findUnique({
          where: { id: BigInt(dto.parentMenuId) },
        });
        if (!parent) {
          throw new NotFoundException(`Parent menu ${dto.parentMenuId} not found`);
        }
        menuLevel = parent.menuLevel + 1;
      } else {
        menuLevel = 1;
      }
    }

    const result = await this.db.menu.update({
      where: { id },
      data: {
        ...(dto.menuName !== undefined && { menuName: dto.menuName }),
        ...(dto.menuNameEn !== undefined && { menuNameEn: dto.menuNameEn }),
        ...(dto.menuType !== undefined && { menuType: dto.menuType }),
        ...(dto.parentMenuId !== undefined && {
          parentMenuId: dto.parentMenuId ? BigInt(dto.parentMenuId) : null,
        }),
        ...(dto.menuPath !== undefined && { menuPath: dto.menuPath }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(menuLevel !== undefined && { menuLevel }),
        ...(dto.isVisible !== undefined && { isVisible: dto.isVisible }),
        ...(dto.isEnabled !== undefined && { isEnabled: dto.isEnabled }),
        ...(dto.isAdminMenu !== undefined && { isAdminMenu: dto.isAdminMenu }),
        ...(dto.openType !== undefined && { openType: dto.openType }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    return serializeBigInt(result);
  }

  /**
   * 메뉴 비활성화 (soft delete, 하위 메뉴도 포함)
   */
  async deactivate(id: bigint) {
    const existing = await this.db.menu.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Menu ${id} not found`);

    // 자식 메뉴도 비활성화
    await this.db.menu.updateMany({
      where: { parentMenuId: id, isActive: true },
      data: { isActive: false },
    });

    const result = await this.db.menu.update({
      where: { id },
      data: { isActive: false },
    });

    return serializeBigInt(result);
  }
}
