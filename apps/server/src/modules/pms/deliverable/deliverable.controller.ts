import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { DeliverableService } from './deliverable.service.js';
import { success, deleted } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import { ProjectDeliverableDto, UpsertDeliverableDto, UpdateSubmissionDto } from './dto/deliverable.dto.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';

@ApiTags('project-deliverables')
@ApiBearerAuth()
@Controller('projects/:projectId/deliverables')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliverableController {
  constructor(private readonly deliverableService: DeliverableService) {}

  @Get()
  @ApiOperation({ summary: '프로젝트 산출물 목록' })
  @ApiOkResponse({ type: [ProjectDeliverableDto] })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findByProject(
    @Param('projectId') projectId: string,
    @Query('statusCode') statusCode?: string,
  ) {
    const data = await this.deliverableService.findByProject(BigInt(projectId), statusCode);
    return success(data.map((d) => serializeBigInt(d)));
  }

  @Post()
  @ApiOperation({ summary: '프로젝트 산출물 등록/수정' })
  @ApiOkResponse({ type: ProjectDeliverableDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async upsert(
    @Param('projectId') projectId: string,
    @Body() dto: UpsertDeliverableDto,
  ) {
    const result = await this.deliverableService.upsert(BigInt(projectId), dto);
    return success(serializeBigInt(result));
  }

  @Patch(':statusCode/:deliverableCode/submission')
  @ApiOperation({ summary: '산출물 제출 상태 변경' })
  @ApiOkResponse({ type: ProjectDeliverableDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async updateSubmission(
    @Param('projectId') projectId: string,
    @Param('statusCode') statusCode: string,
    @Param('deliverableCode') deliverableCode: string,
    @Body() dto: UpdateSubmissionDto,
  ) {
    const result = await this.deliverableService.updateSubmission(
      BigInt(projectId),
      statusCode,
      deliverableCode,
      dto,
    );
    return success(serializeBigInt(result));
  }

  @Delete(':statusCode/:deliverableCode')
  @ApiOperation({ summary: '프로젝트 산출물 삭제' })
  @ApiOkResponse({ description: '산출물 삭제 완료' })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async remove(
    @Param('projectId') projectId: string,
    @Param('statusCode') statusCode: string,
    @Param('deliverableCode') deliverableCode: string,
  ) {
    await this.deliverableService.delete(BigInt(projectId), statusCode, deliverableCode);
    return deleted(true);
  }
}
