import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { success } from '../../../common/index.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { Roles } from '../../common/auth/decorators/roles.decorator.js';
import { DmsAdminService } from './dms-admin.service.js';

@ApiTags('DMS Admin')
@ApiBearerAuth()
@Controller('dms/admin')
@UseGuards(RolesGuard)
@Roles('admin')
export class DmsAdminController {
  constructor(private readonly dmsAdminService: DmsAdminService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'DMS 운영 개요 (관리자)',
    description: '문서/템플릿 총량, 가시성/sync 상태 분포, 권한 부여/요청, 상위 소유자 등을 집계해 반환합니다.',
  })
  @ApiOkResponse({ description: 'DMS 개요 조회 성공' })
  @ApiUnauthorizedResponse({ description: '인증되지 않은 요청' })
  @ApiForbiddenResponse({ description: '관리자만 접근 가능' })
  async getOverview() {
    const result = await this.dmsAdminService.getOverview();
    return success(result, 'DMS 개요 조회 성공');
  }
}
