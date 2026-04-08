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
import { success } from '../../../common/responses.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { AskDocumentsDto } from './dto/ask.dto.js';
import { AskService } from './ask.service.js';

@ApiTags('dms')
@ApiBearerAuth()
@Controller('dms/ask')
@UseGuards(JwtAuthGuard)
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Post()
  @ApiOperation({ summary: 'DMS 질문 답변' })
  @ApiProduces('application/json', 'text/event-stream')
  @ApiOkResponse({ description: '질문 응답 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async ask(
    @Body() dto: AskDocumentsDto,
    @Req() request: ExpressRequest,
    @Res() response: ExpressResponse,
  ) {
    if (dto.stream === false) {
      const data = await this.askService.ask(dto);
      response.status(200).json(success(data));
      return;
    }

    const abortController = new AbortController();
    request.once('close', () => abortController.abort());

    const result = await this.askService.stream(dto, abortController.signal);
    result.pipeUIMessageStreamToResponse(response);
  }
}
