import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { Roles } from '../../common/auth/decorators/roles.decorator.js';
import { MenuAdminService } from './menu-admin.service.js';
import { success } from '../../../common/index.js';
import type { CreateMenuDto, UpdateMenuDto } from './dto/menu-admin.dto.js';

@ApiTags('Menu Administration')
@ApiBearerAuth()
@Controller('menus/admin')
@UseGuards(RolesGuard)
@Roles('admin')
export class MenuAdminController {
  constructor(private readonly menuAdminService: MenuAdminService) {}

  @Get()
  @ApiOperation({ summary: '전체 메뉴 목록 (관리자)' })
  async findAll() {
    const data = await this.menuAdminService.findAll();
    return success(data);
  }

  @Get(':id')
  @ApiOperation({ summary: '메뉴 상세 조회 (관리자)' })
  async findOne(@Param('id') id: string) {
    const data = await this.menuAdminService.findOne(BigInt(id));
    return success(data);
  }

  @Post()
  @ApiOperation({ summary: '메뉴 생성' })
  async create(@Body() dto: CreateMenuDto) {
    const result = await this.menuAdminService.create(dto);
    return success(result);
  }

  @Put(':id')
  @ApiOperation({ summary: '메뉴 수정' })
  async update(@Param('id') id: string, @Body() dto: UpdateMenuDto) {
    const result = await this.menuAdminService.update(BigInt(id), dto);
    return success(result);
  }

  @Delete(':id')
  @ApiOperation({ summary: '메뉴 비활성화' })
  async deactivate(@Param('id') id: string) {
    const result = await this.menuAdminService.deactivate(BigInt(id));
    return success(result);
  }
}
