import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse } from '@nestjs/swagger';
import { success } from '../../../common/index.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { AccessOperationsService } from './access-operations.service.js';
import { InspectAccessQueryDto } from './dto/inspect-access.query.dto.js';
import { ListPermissionExceptionsQueryDto } from './dto/list-permission-exceptions.query.dto.js';

@ApiTags('Access Ops')
@ApiBearerAuth()
@Controller('access/ops')
@UseGuards(RolesGuard)
@Roles('admin')
export class AccessOperationsController {
  constructor(private readonly accessOperationsService: AccessOperationsService) {}

  @Get('inspect')
  @ApiOperation({
    summary: '권한 해석 inspect (관리자)',
    description:
      '특정 사용자의 foundation action policy 와 optional object policy, active permission exception을 함께 조회합니다.' })
  @ApiOkResponse({ description: '권한 해석 조회 성공' })
  @ApiUnauthorizedResponse({ description: '인증되지 않은 요청' })
  @ApiForbiddenResponse({ description: '관리자만 접근 가능' })
  async inspectAccess(@Query() query: InspectAccessQueryDto) {
    const result = await this.accessOperationsService.inspectAccess(query);
    return success(result, '권한 해석 조회 성공');
  }

  @Get('exceptions')
  @ApiOperation({
    summary: 'permission exception 목록 조회 (관리자)',
    description:
      'user/loginId, axis, object target, permission code 로 필터링된 permission exception 목록을 반환합니다.' })
  @ApiOkResponse({ description: '권한 예외 목록 조회 성공' })
  @ApiUnauthorizedResponse({ description: '인증되지 않은 요청' })
  @ApiForbiddenResponse({ description: '관리자만 접근 가능' })
  async listPermissionExceptions(@Query() query: ListPermissionExceptionsQueryDto) {
    const result = await this.accessOperationsService.listPermissionExceptions(query);
    return success(result, '권한 예외 목록 조회 성공');
  }
}
