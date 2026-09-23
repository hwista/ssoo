import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { TaskService } from './task.service.js';
import { ProjectFeatureGuard } from '../project/project-feature.guard.js';
import { RequireProjectFeature } from '../project/require-project-feature.decorator.js';
import { success, deleted } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import type {
  CreateTaskDto,
  CreateTaskEffortLogDto,
  TaskAiIndexBackfillRequest,
  UpdateTaskDto,
  UpdateTaskEffortLogDto,
} from '@ssoo/types';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('projects/:projectId/tasks')
@UseGuards(RolesGuard, ProjectFeatureGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '프로젝트 태스크 목록' })
  async findByProject(@Param('projectId') projectId: string) {
    const data = await this.taskService.findByProject(BigInt(projectId));
    return success(data.map((t) => serializeBigInt(t)));
  }

  @Post('ai-index/backfill')
  @RequireProjectFeature('canManageTasks')
  @ApiOperation({ summary: 'PMS 태스크 AI 인덱스 backfill job 등록' })
  async queueAiIndexBackfill(
    @Param('projectId') projectId: string,
    @Body() body: TaskAiIndexBackfillRequest | undefined,
  ) {
    const result = await this.taskService.queueAiIndexBackfill(BigInt(projectId), body ?? {});
    return success(result);
  }

  @Get('effort-logs')
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '프로젝트 태스크 일일 공수 기록 목록' })
  async findEffortLogs(@Param('projectId') projectId: string) {
    const data = await this.taskService.findEffortLogsByProject(BigInt(projectId));
    return success(data.map((row) => serializeBigInt(row)));
  }

  @Post('effort-logs')
  @RequireProjectFeature('canManageTasks')
  @ApiOperation({ summary: '프로젝트 태스크 일일 공수 기록 생성' })
  async createEffortLog(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskEffortLogDto,
  ) {
    const result = await this.taskService.createEffortLog(BigInt(projectId), dto);
    return success(serializeBigInt(result));
  }

  @Put('effort-logs/:effortLogId')
  @RequireProjectFeature('canManageTasks')
  @ApiOperation({ summary: '프로젝트 태스크 일일 공수 기록 수정' })
  async updateEffortLog(
    @Param('projectId') projectId: string,
    @Param('effortLogId') effortLogId: string,
    @Body() dto: UpdateTaskEffortLogDto,
  ) {
    const result = await this.taskService.updateEffortLog(
      BigInt(projectId),
      BigInt(effortLogId),
      dto,
    );
    return success(serializeBigInt(result));
  }

  @Delete('effort-logs/:effortLogId')
  @RequireProjectFeature('canManageTasks')
  @ApiOperation({ summary: '프로젝트 태스크 일일 공수 기록 비활성화' })
  async removeEffortLog(
    @Param('projectId') projectId: string,
    @Param('effortLogId') effortLogId: string,
  ) {
    await this.taskService.removeEffortLog(BigInt(projectId), BigInt(effortLogId));
    return deleted(true);
  }

  @Get('assignees')
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '지정 가능한 작업 담당자 목록' })
  async assignees(@Param('projectId') projectId: string) {
    return success(await this.taskService.assignees(BigInt(projectId)));
  }

  @Get(':id')
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '태스크 상세' })
  async findOne(@Param('id') id: string, @Param('projectId') projectId: string) {
    const result = await this.taskService.findOne(BigInt(id), BigInt(projectId));
    return success(serializeBigInt(result));
  }

  @Post()
  @RequireProjectFeature('canManageTasks')
  @ApiOperation({ summary: '태스크 생성' })
  async create(@Param('projectId') projectId: string, @Body() dto: CreateTaskDto, @CurrentUser('userId') userId: string) {
    const result = await this.taskService.create(BigInt(projectId), dto, BigInt(userId));
    return success(serializeBigInt(result));
  }

  @Put(':id')
  @RequireProjectFeature('canManageTasks')
  @ApiOperation({ summary: '태스크 수정' })
  async update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser('userId') userId: string, @Param('projectId') projectId: string) {
    const result = await this.taskService.update(BigInt(id), dto, BigInt(userId), BigInt(projectId));
    return success(serializeBigInt(result));
  }

  @Delete(':id')
  @RequireProjectFeature('canManageTasks')
  @ApiOperation({ summary: '태스크 삭제' })
  async remove(@Param('id') id: string, @Param('projectId') projectId: string) {
    await this.taskService.remove(BigInt(id), BigInt(projectId));
    return deleted(true);
  }
}
