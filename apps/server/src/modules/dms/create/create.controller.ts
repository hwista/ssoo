import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { DmsFeatureGuard } from '../access/dms-feature.guard.js';
import { RequireDmsFeature } from '../access/require-dms-feature.decorator.js';
import { CreateSummaryDto } from './dto/create.dto.js';
import { CreateService } from './create.service.js';

@ApiTags('dms')
@ApiBearerAuth()
@Controller('dms/create')
@UseGuards(JwtAuthGuard, DmsFeatureGuard)
@RequireDmsFeature('canUseAssistant')
export class CreateController {
  constructor(private readonly createService: CreateService) {}

  @Post()
  @ApiOperation({ summary: 'DMS 문서 요약' })
  @ApiProduces('text/plain')
  @ApiOkResponse({ description: '요약 스트림 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async create(
    @Body() dto: CreateSummaryDto,
    @Req() request: ExpressRequest,
    @Res() response: ExpressResponse,
  ) {
    const abortController = new AbortController();
    request.once('close', () => abortController.abort());

    const result = await this.createService.summarize(dto, abortController.signal);
    result.pipeTextStreamToResponse(response);
  }
}
