import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { success, deleted } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import { ProjectFeatureGuard } from '../project/project-feature.guard.js';
import { RequireProjectFeature } from '../project/require-project-feature.decorator.js';
import { ControlService } from './control.service.js';
import type {
  CreateProjectIssueDto,
  UpdateProjectIssueDto,
  CreateProjectRequirementDto,
  UpdateProjectRequirementDto,
  CreateProjectRiskDto,
  UpdateProjectRiskDto,
  CreateProjectChangeRequestDto,
  UpdateProjectChangeRequestDto,
  CreateProjectEventDto,
  UpdateProjectEventDto,
} from '@ssoo/types';

@ApiTags('project-control')
@ApiBearerAuth()
@Controller('projects/:projectId/control')
@UseGuards(JwtAuthGuard, RolesGuard, ProjectFeatureGuard)
export class ControlController {
  constructor(private readonly controlService: ControlService) {}

  @Get('issues')
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '프로젝트 canonical 이슈 목록' })
  async findProjectIssues(@Param('projectId') projectId: string) {
    const data = await this.controlService.findProjectIssues(BigInt(projectId));
    return success(data.map((item) => serializeBigInt(item)));
  }

  @Post('issues')
  @RequireProjectFeature('canManageIssues')
  @ApiOperation({ summary: '프로젝트 canonical 이슈 생성' })
  async createProjectIssue(
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectIssueDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const result = await this.controlService.createProjectIssue(
      BigInt(projectId),
      dto,
      BigInt(currentUser.userId),
    );
    return success(serializeBigInt(result));
  }

  @Put('issues/:projectIssueId')
  @RequireProjectFeature('canManageIssues')
  @ApiOperation({ summary: '프로젝트 canonical 이슈 수정' })
  async updateProjectIssue(
    @Param('projectId') projectId: string,
    @Param('projectIssueId') projectIssueId: string,
    @Body() dto: UpdateProjectIssueDto,
  ) {
    const result = await this.controlService.updateProjectIssue(
      BigInt(projectId),
      BigInt(projectIssueId),
      dto,
    );
    return success(serializeBigInt(result));
  }

  @Delete('issues/:projectIssueId')
  @RequireProjectFeature('canManageIssues')
  @ApiOperation({ summary: '프로젝트 canonical 이슈 삭제' })
  async removeProjectIssue(
    @Param('projectId') projectId: string,
    @Param('projectIssueId') projectIssueId: string,
  ) {
    const result = await this.controlService.removeProjectIssue(
      BigInt(projectId),
      BigInt(projectIssueId),
    );
    return deleted(!!result);
  }

  @Get('requirements')
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '프로젝트 요구사항 목록' })
  async findRequirements(@Param('projectId') projectId: string) {
    const data = await this.controlService.findRequirements(BigInt(projectId));
    return success(data.map((item) => serializeBigInt(item)));
  }

  @Post('requirements')
  @RequireProjectFeature('canManageIssues')
  @ApiOperation({ summary: '프로젝트 요구사항 생성' })
  async createRequirement(
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectRequirementDto,
  ) {
    const result = await this.controlService.createRequirement(BigInt(projectId), dto);
    return success(serializeBigInt(result));
  }

  @Put('requirements/:requirementId')
  @RequireProjectFeature('canManageIssues')
  @ApiOperation({ summary: '프로젝트 요구사항 수정' })
  async updateRequirement(
    @Param('projectId') projectId: string,
    @Param('requirementId') requirementId: string,
    @Body() dto: UpdateProjectRequirementDto,
  ) {
    const result = await this.controlService.updateRequirement(
      BigInt(projectId),
      BigInt(requirementId),
      dto,
    );
    return success(serializeBigInt(result));
  }

  @Delete('requirements/:requirementId')
  @RequireProjectFeature('canManageIssues')
  @ApiOperation({ summary: '프로젝트 요구사항 삭제' })
  async removeRequirement(
    @Param('projectId') projectId: string,
    @Param('requirementId') requirementId: string,
  ) {
    const result = await this.controlService.removeRequirement(
      BigInt(projectId),
      BigInt(requirementId),
    );
    return deleted(!!result);
  }

  @Get('risks')
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '프로젝트 리스크 목록' })
  async findRisks(@Param('projectId') projectId: string) {
    const data = await this.controlService.findRisks(BigInt(projectId));
    return success(data.map((item) => serializeBigInt(item)));
  }

  @Post('risks')
  @RequireProjectFeature('canManageIssues')
  @ApiOperation({ summary: '프로젝트 리스크 생성' })
  async createRisk(@Param('projectId') projectId: string, @Body() dto: CreateProjectRiskDto) {
    const result = await this.controlService.createRisk(BigInt(projectId), dto);
    return success(serializeBigInt(result));
  }

  @Put('risks/:riskId')
  @RequireProjectFeature('canManageIssues')
  @ApiOperation({ summary: '프로젝트 리스크 수정' })
  async updateRisk(
    @Param('projectId') projectId: string,
    @Param('riskId') riskId: string,
    @Body() dto: UpdateProjectRiskDto,
  ) {
    const result = await this.controlService.updateRisk(BigInt(projectId), BigInt(riskId), dto);
    return success(serializeBigInt(result));
  }

  @Delete('risks/:riskId')
  @RequireProjectFeature('canManageIssues')
  @ApiOperation({ summary: '프로젝트 리스크 삭제' })
  async removeRisk(@Param('projectId') projectId: string, @Param('riskId') riskId: string) {
    const result = await this.controlService.removeRisk(BigInt(projectId), BigInt(riskId));
    return deleted(!!result);
  }

  @Get('changes')
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '프로젝트 변경요청 목록' })
  async findChangeRequests(@Param('projectId') projectId: string) {
    const data = await this.controlService.findChangeRequests(BigInt(projectId));
    return success(data.map((item) => serializeBigInt(item)));
  }

  @Post('changes')
  @RequireProjectFeature('canManageIssues')
  @ApiOperation({ summary: '프로젝트 변경요청 생성' })
  async createChangeRequest(
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectChangeRequestDto,
  ) {
    const result = await this.controlService.createChangeRequest(BigInt(projectId), dto);
    return success(serializeBigInt(result));
  }

  @Put('changes/:changeRequestId')
  @RequireProjectFeature('canManageIssues')
  @ApiOperation({ summary: '프로젝트 변경요청 수정' })
  async updateChangeRequest(
    @Param('projectId') projectId: string,
    @Param('changeRequestId') changeRequestId: string,
    @Body() dto: UpdateProjectChangeRequestDto,
  ) {
    const result = await this.controlService.updateChangeRequest(
      BigInt(projectId),
      BigInt(changeRequestId),
      dto,
    );
    return success(serializeBigInt(result));
  }

  @Delete('changes/:changeRequestId')
  @RequireProjectFeature('canManageIssues')
  @ApiOperation({ summary: '프로젝트 변경요청 삭제' })
  async removeChangeRequest(
    @Param('projectId') projectId: string,
    @Param('changeRequestId') changeRequestId: string,
  ) {
    const result = await this.controlService.removeChangeRequest(
      BigInt(projectId),
      BigInt(changeRequestId),
    );
    return deleted(!!result);
  }

  @Get('events')
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '프로젝트 이벤트 목록' })
  async findEvents(@Param('projectId') projectId: string) {
    const data = await this.controlService.findEvents(BigInt(projectId));
    return success(data.map((item) => serializeBigInt(item)));
  }

  @Post('events')
  @RequireProjectFeature('canManageIssues')
  @ApiOperation({ summary: '프로젝트 이벤트 생성' })
  async createEvent(@Param('projectId') projectId: string, @Body() dto: CreateProjectEventDto) {
    const result = await this.controlService.createEvent(BigInt(projectId), dto);
    return success(serializeBigInt(result));
  }

  @Put('events/:eventId')
  @RequireProjectFeature('canManageIssues')
  @ApiOperation({ summary: '프로젝트 이벤트 수정' })
  async updateEvent(
    @Param('projectId') projectId: string,
    @Param('eventId') eventId: string,
    @Body() dto: UpdateProjectEventDto,
  ) {
    const result = await this.controlService.updateEvent(BigInt(projectId), BigInt(eventId), dto);
    return success(serializeBigInt(result));
  }

  @Delete('events/:eventId')
  @RequireProjectFeature('canManageIssues')
  @ApiOperation({ summary: '프로젝트 이벤트 삭제' })
  async removeEvent(@Param('projectId') projectId: string, @Param('eventId') eventId: string) {
    const result = await this.controlService.removeEvent(BigInt(projectId), BigInt(eventId));
    return deleted(!!result);
  }
}
