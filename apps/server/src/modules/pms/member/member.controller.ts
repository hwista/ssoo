import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { MemberService } from './member.service.js';
import { ProjectFeatureGuard } from '../project/project-feature.guard.js';
import { RequireProjectFeature } from '../project/require-project-feature.decorator.js';
import { success, deleted } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import type { CreateProjectMemberDto, UpdateProjectMemberDto } from '@ssoo/types';
import { ProjectMemberDto } from './dto/member.dto.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';

@ApiTags('project-members')
@ApiBearerAuth()
@Controller('projects/:projectId/members')
@UseGuards(JwtAuthGuard, RolesGuard, ProjectFeatureGuard)
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get()
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '프로젝트 멤버 목록' })
  @ApiOkResponse({ type: [ProjectMemberDto] })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findByProject(@Param('projectId') projectId: string) {
    const data = await this.memberService.findByProject(BigInt(projectId));
    return success(data.map((m) => serializeBigInt(m)));
  }

  @Post()
  @RequireProjectFeature('canManageMembers')
  @ApiOperation({ summary: '프로젝트 멤버 추가' })
  @ApiOkResponse({ type: ProjectMemberDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async create(@Param('projectId') projectId: string, @Body() dto: CreateProjectMemberDto) {
    const result = await this.memberService.create(BigInt(projectId), dto);
    return success(serializeBigInt(result));
  }

  @Put(':userId/:roleCode')
  @RequireProjectFeature('canManageMembers')
  @ApiOperation({ summary: '프로젝트 멤버 수정' })
  @ApiOkResponse({ type: ProjectMemberDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async update(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @Param('roleCode') roleCode: string,
    @Body() dto: UpdateProjectMemberDto,
  ) {
    const result = await this.memberService.update(BigInt(projectId), BigInt(userId), roleCode, dto);
    return success(serializeBigInt(result));
  }

  @Delete(':userId/:roleCode')
  @RequireProjectFeature('canManageMembers')
  @ApiOperation({ summary: '프로젝트 멤버 삭제' })
  @ApiOkResponse({ description: '프로젝트 멤버 삭제' })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async remove(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @Param('roleCode') roleCode: string,
  ) {
    const result = await this.memberService.remove(BigInt(projectId), BigInt(userId), roleCode);
    return deleted(result);
  }
}
