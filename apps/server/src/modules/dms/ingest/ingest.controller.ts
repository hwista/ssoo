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
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { success } from '../../../common/responses.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { DmsFeatureGuard } from '../access/dms-feature.guard.js';
import { RequireDmsFeature } from '../access/require-dms-feature.decorator.js';
import { IngestQueueService } from './ingest-queue.service.js';

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
  constructor(
    private readonly ingestQueueService: IngestQueueService,
  ) {}

  @Post('submit')
  @ApiOperation({ summary: 'DMS 수집 작업 생성' })
  @ApiOkResponse({ description: '수집 작업 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async submit(
    @Body() body: SubmitBody,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    if (!body.title?.trim()) {
      throw new BadRequestException('title이 필요합니다.');
    }
    if (!body.content?.trim()) {
      throw new BadRequestException('content가 필요합니다.');
    }

    return success(await this.ingestQueueService.submit({
      title: body.title,
      content: body.content,
      requestedBy: body.requestedBy?.trim() || currentUser.loginId,
      submittedBy: currentUser.loginId,
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
    return success({ jobs: this.ingestQueueService.list() });
  }

  @Post('jobs/:id/confirm')
  @ApiOperation({ summary: 'DMS 수집 작업 승인' })
  @ApiOkResponse({ description: '승인된 수집 작업 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async confirm(@Param('id') id: string) {
    if (!id.trim()) {
      throw new BadRequestException('job id가 필요합니다.');
    }

    return success(await this.ingestQueueService.confirm(id));
  }
}
