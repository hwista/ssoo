import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
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

  @Get('documents')
  @ApiOperation({
    summary: 'DMS 문서 목록 (관리자)',
    description: '관리자용 문서 목록. 경로 검색, 가시성/sync 상태/활성 여부 필터, 페이징을 지원합니다.',
  })
  @ApiQuery({ name: 'q', required: false, description: 'relativePath 부분 일치(대소문자 무시)' })
  @ApiQuery({ name: 'visibilityScope', required: false, enum: ['self', 'organization', 'public'] })
  @ApiQuery({ name: 'syncStatusCode', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'DMS 문서 목록 조회 성공' })
  @ApiUnauthorizedResponse({ description: '인증되지 않은 요청' })
  @ApiForbiddenResponse({ description: '관리자만 접근 가능' })
  async listDocuments(
    @Query('q') q?: string,
    @Query('visibilityScope') visibilityScope?: string,
    @Query('syncStatusCode') syncStatusCode?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.dmsAdminService.listDocuments({
      q,
      visibilityScope,
      syncStatusCode,
      isActive: typeof isActive === 'string' ? isActive === 'true' : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return success(result, 'DMS 문서 목록 조회 성공');
  }
}
