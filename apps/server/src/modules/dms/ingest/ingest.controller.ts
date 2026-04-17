import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';
import { success } from '../../../common/responses.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { DmsFeatureGuard } from '../access/dms-feature.guard.js';
import { RequireDmsFeature } from '../access/require-dms-feature.decorator.js';
import { ingestQueueService } from './ingest-queue.service.js';

interface SubmitBody {
  title?: string;
  content?: string;
  requestedBy?: string;
  provider?: 'local' | 'sharepoint' | 'nas';
  relativePath?: string;
  origin?: 'manual' | 'ingest' | 'teams' | 'network_drive';
}

@ApiTags('dms')
@ApiBearerAuth()
@Controller('dms/ingest')
@UseGuards(JwtAuthGuard, DmsFeatureGuard)
@RequireDmsFeature('canManageStorage')
export class IngestController {
  @Post('submit')
  @ApiOperation({ summary: 'DMS 수집 작업 생성' })
  @ApiOkResponse({ description: '수집 작업 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  submit(@Body() body: SubmitBody) {
    if (!body.title?.trim()) {
      throw new BadRequestException('title이 필요합니다.');
    }
    if (!body.content?.trim()) {
      throw new BadRequestException('content가 필요합니다.');
    }

    return success(ingestQueueService.submit({
      title: body.title,
      content: body.content,
      requestedBy: body.requestedBy,
      provider: body.provider,
      relativePath: body.relativePath,
      origin: body.origin,
    }));
  }

  @Get('jobs')
  @ApiOperation({ summary: 'DMS 수집 작업 목록 조회' })
  @ApiOkResponse({ description: '수집 작업 목록 반환' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  list() {
    return success({ jobs: ingestQueueService.list() });
  }

  @Post('jobs/:id/confirm')
  @ApiOperation({ summary: 'DMS 수집 작업 승인' })
  @ApiOkResponse({ description: '승인된 수집 작업 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  confirm(@Param('id') id: string) {
    if (!id.trim()) {
      throw new BadRequestException('job id가 필요합니다.');
    }

    return success(ingestQueueService.confirm(id));
  }
}
