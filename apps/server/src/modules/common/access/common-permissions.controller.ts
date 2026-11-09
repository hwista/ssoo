import { BadRequestException, Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CommonPermissionTarget } from '@ssoo/types/common';
import { success } from '../../../common/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { TokenPayload } from '../auth/interfaces/auth.interface.js';
import { ParticipationRevisionDto } from '../onboarding/participation-operations.dto.js';
import { participationId } from '../onboarding/participation-write.service.js';
import { CommonPermissionsService } from './common-permissions.service.js';
import { CommonPermissionDto, CommonPermissionQuery, CommonPermissionUpdateDto } from './dto/common-permissions.dto.js';

function targetKind(value: string): CommonPermissionTarget {
  if (value !== 'organization' && value !== 'user') throw new BadRequestException('조직 또는 사용자 범위를 선택해 주세요.');
  return value;
}

@ApiTags('Common Permission Operations')
@ApiBearerAuth()
@Controller('access/ops/common-permissions')
@UseGuards(RolesGuard)
@Roles('admin')
export class CommonPermissionsController {
  constructor(private readonly service: CommonPermissionsService) {}

  @Get(':kind')
  @ApiOperation({ summary: '조직 공통 권한 또는 사용자 공통 action 예외 목록' })
  async list(@Param('kind') kind: string, @Query() query: CommonPermissionQuery, @CurrentUser() actor: TokenPayload) {
    return success(await this.service.list(targetKind(kind), BigInt(actor.userId), query));
  }

  @Post(':kind')
  @ApiOperation({ summary: '조직 공통 권한 또는 사용자 예외 부여' })
  async create(@Param('kind') kind: string, @Body() dto: CommonPermissionDto, @CurrentUser() actor: TokenPayload) {
    return success(await this.service.create(targetKind(kind), BigInt(actor.userId), dto));
  }

  @Put(':kind/:id')
  @ApiOperation({ summary: '공통 권한 기간·예외 효과 변경 또는 재부여' })
  async update(@Param('kind') kind: string, @Param('id') id: string, @Body() dto: CommonPermissionUpdateDto, @CurrentUser() actor: TokenPayload) {
    return success(await this.service.update(targetKind(kind), participationId(id), BigInt(actor.userId), dto));
  }

  @Post(':kind/:id/revoke')
  @ApiOperation({ summary: '조직 공통 권한 또는 사용자 예외 회수' })
  async revoke(@Param('kind') kind: string, @Param('id') id: string, @Body() dto: ParticipationRevisionDto, @CurrentUser() actor: TokenPayload) {
    return success(await this.service.revoke(targetKind(kind), participationId(id), BigInt(actor.userId), dto));
  }
}
