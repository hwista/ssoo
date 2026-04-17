import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { CreateProjectRelationDto } from '@ssoo/types';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { deleted, success } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { ProjectFeatureGuard } from './project-feature.guard.js';
import { ProjectRelationService } from './project-relation.service.js';
import { RequireProjectFeature } from './require-project-feature.decorator.js';

@ApiTags('project-relations')
@ApiBearerAuth()
@Controller('projects/:projectId/relations')
@UseGuards(JwtAuthGuard, RolesGuard, ProjectFeatureGuard)
export class ProjectRelationController {
  constructor(private readonly projectRelationService: ProjectRelationService) {}

  @Get()
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '프로젝트 관계 목록' })
  @ApiOkResponse({ description: '프로젝트 관계 목록' })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findByProject(@Param('projectId') projectId: string) {
    const relations = await this.projectRelationService.findByProject(BigInt(projectId));
    return success(relations.map((relation) => serializeBigInt(relation)));
  }

  @Post()
  @RequireProjectFeature('canEditProject')
  @ApiOperation({ summary: '프로젝트 관계 추가' })
  @ApiOkResponse({ description: '프로젝트 관계' })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async create(@Param('projectId') projectId: string, @Body() dto: CreateProjectRelationDto) {
    const result = await this.projectRelationService.create(BigInt(projectId), dto);
    return success(serializeBigInt(result));
  }

  @Delete(':targetProjectId/:relationTypeCode')
  @RequireProjectFeature('canEditProject')
  @ApiOperation({ summary: '프로젝트 관계 삭제' })
  @ApiOkResponse({ description: '프로젝트 관계 삭제' })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async remove(
    @Param('projectId') projectId: string,
    @Param('targetProjectId') targetProjectId: string,
    @Param('relationTypeCode') relationTypeCode: string,
  ) {
    const result = await this.projectRelationService.remove(
      BigInt(projectId),
      targetProjectId,
      relationTypeCode,
    );
    return deleted(result);
  }
}
