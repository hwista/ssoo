import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { CloseConditionService } from './close-condition.service.js';
import { ProjectFeatureGuard } from '../project/project-feature.guard.js';
import { RequireProjectFeature } from '../project/require-project-feature.decorator.js';
import { success, deleted } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import { ProjectCloseConditionDto, UpsertCloseConditionDto, ToggleCheckDto } from './dto/deliverable.dto.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';

@ApiTags('project-close-conditions')
@ApiBearerAuth()
@Controller('projects/:projectId/close-conditions')
@UseGuards(JwtAuthGuard, RolesGuard, ProjectFeatureGuard)
export class CloseConditionController {
  constructor(private readonly closeConditionService: CloseConditionService) {}

  @Get()
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '프로젝트 종료 조건 목록' })
  @ApiOkResponse({ type: [ProjectCloseConditionDto] })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findByProject(
    @Param('projectId') projectId: string,
    @Query('statusCode') statusCode?: string,
  ) {
    const data = await this.closeConditionService.findByProject(BigInt(projectId), statusCode);
    return success(data.map((c) => serializeBigInt(c)));
  }

  @Post()
  @RequireProjectFeature('canManageCloseConditions')
  @ApiOperation({ summary: '프로젝트 종료 조건 등록/수정' })
  @ApiOkResponse({ type: ProjectCloseConditionDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async upsert(@Param('projectId') projectId: string, @Body() dto: UpsertCloseConditionDto) {
    const result = await this.closeConditionService.upsert(BigInt(projectId), dto);
    return success(serializeBigInt(result));
  }

  @Patch(':statusCode/:conditionCode/check')
  @RequireProjectFeature('canManageCloseConditions')
  @ApiOperation({ summary: '종료 조건 체크/해제' })
  @ApiOkResponse({ type: ProjectCloseConditionDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async toggleCheck(
    @Param('projectId') projectId: string,
    @Param('statusCode') statusCode: string,
    @Param('conditionCode') conditionCode: string,
    @Body() dto: ToggleCheckDto,
  ) {
    const result = await this.closeConditionService.toggleCheck(
      BigInt(projectId),
      statusCode,
      conditionCode,
      dto,
    );
    return success(serializeBigInt(result));
  }

  @Delete(':statusCode/:conditionCode')
  @RequireProjectFeature('canManageCloseConditions')
  @ApiOperation({ summary: '프로젝트 종료 조건 삭제' })
  @ApiOkResponse({ description: '종료 조건 삭제 완료' })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async remove(
    @Param('projectId') projectId: string,
    @Param('statusCode') statusCode: string,
    @Param('conditionCode') conditionCode: string,
  ) {
    await this.closeConditionService.delete(BigInt(projectId), statusCode, conditionCode);
    return deleted(true);
  }
}
