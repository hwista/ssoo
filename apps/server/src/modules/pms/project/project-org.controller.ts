import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { CreateProjectOrgDto, UpdateProjectOrgDto } from '@ssoo/types';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { success, deleted } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { ProjectFeatureGuard } from './project-feature.guard.js';
import { ProjectOrgService } from './project-org.service.js';
import { RequireProjectFeature } from './require-project-feature.decorator.js';

@ApiTags('project-orgs')
@ApiBearerAuth()
@Controller('projects/:projectId/organizations')
@UseGuards(JwtAuthGuard, RolesGuard, ProjectFeatureGuard)
export class ProjectOrgController {
  constructor(private readonly projectOrgService: ProjectOrgService) {}

  @Get()
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '프로젝트 조직 목록' })
  @ApiOkResponse({ description: '프로젝트 조직 목록' })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findByProject(@Param('projectId') projectId: string) {
    const data = await this.projectOrgService.findByProject(BigInt(projectId));
    return success(data.map((projectOrg) => serializeBigInt(projectOrg)));
  }

  @Post()
  @RequireProjectFeature('canEditProject')
  @ApiOperation({ summary: '프로젝트 조직 추가' })
  @ApiOkResponse({ description: '프로젝트 조직' })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async create(@Param('projectId') projectId: string, @Body() dto: CreateProjectOrgDto) {
    const result = await this.projectOrgService.create(BigInt(projectId), dto);
    return success(serializeBigInt(result));
  }

  @Put(':organizationId/:roleCode')
  @RequireProjectFeature('canEditProject')
  @ApiOperation({ summary: '프로젝트 조직 수정' })
  @ApiOkResponse({ description: '프로젝트 조직' })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async update(
    @Param('projectId') projectId: string,
    @Param('organizationId') organizationId: string,
    @Param('roleCode') roleCode: string,
    @Body() dto: UpdateProjectOrgDto,
  ) {
    const result = await this.projectOrgService.update(
      BigInt(projectId),
      BigInt(organizationId),
      roleCode,
      dto,
    );
    return success(serializeBigInt(result));
  }

  @Delete(':organizationId/:roleCode')
  @RequireProjectFeature('canEditProject')
  @ApiOperation({ summary: '프로젝트 조직 삭제' })
  @ApiOkResponse({ description: '프로젝트 조직 삭제' })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async remove(
    @Param('projectId') projectId: string,
    @Param('organizationId') organizationId: string,
    @Param('roleCode') roleCode: string,
  ) {
    const result = await this.projectOrgService.remove(
      BigInt(projectId),
      BigInt(organizationId),
      roleCode,
    );
    return deleted(result);
  }
}
