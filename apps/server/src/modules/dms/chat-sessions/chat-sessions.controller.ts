import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiBearerAuth,
  ApiTags } from '@nestjs/swagger';
import { success } from '../../../common/responses.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { DmsFeatureGuard } from '../access/dms-feature.guard.js';
import { RequireDmsFeature } from '../access/require-dms-feature.decorator.js';
import { ChatSessionsService } from './chat-sessions.service.js';

@ApiTags('dms')
@ApiBearerAuth()
@Controller('dms/chat-sessions')
@UseGuards(DmsFeatureGuard)
@RequireDmsFeature('canUseAssistant')
export class ChatSessionsController {
  constructor(private readonly chatSessionsService: ChatSessionsService) {}

  @Get()
  @ApiOperation({ summary: 'DMS 채팅 세션 목록 조회' })
  @ApiOkResponse({ description: '채팅 세션 목록 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async list(
    @Query('clientId') clientId = '',
    @Query('limit') limit = '50',
  ) {
    const parsedLimit = Number(limit);
    const data = await this.chatSessionsService.list(
      clientId,
      Number.isFinite(parsedLimit) ? parsedLimit : 50,
    );
    return success(data);
  }

  @Post()
  @ApiOperation({ summary: 'DMS 채팅 세션 저장' })
  @ApiOkResponse({ description: '채팅 세션 저장 결과 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async save(@Body() body: Record<string, unknown>) {
    const clientId = typeof body.clientId === 'string' ? body.clientId : '';
    const session = this.parseSessionPayload(body.session);
    const data = await this.chatSessionsService.save(clientId, session);
    return success(data);
  }

  @Delete()
  @ApiOperation({ summary: 'DMS 채팅 세션 삭제' })
  @ApiOkResponse({ description: '채팅 세션 삭제 결과 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async remove(@Body() body: Record<string, unknown>) {
    const clientId = typeof body.clientId === 'string' ? body.clientId : '';
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
    const data = await this.chatSessionsService.remove(clientId, sessionId);
    return success(data);
  }

  private parseSessionPayload(value: unknown) {
    if (!value || typeof value !== 'object') {
      throw new BadRequestException('유효한 session payload가 필요합니다.');
    }

    const candidate = value as Record<string, unknown>;
    if (
      typeof candidate.id !== 'string'
      || typeof candidate.title !== 'string'
      || typeof candidate.createdAt !== 'string'
      || typeof candidate.updatedAt !== 'string'
      || !Array.isArray(candidate.messages)
    ) {
      throw new BadRequestException('유효한 session payload가 필요합니다.');
    }

    return {
      id: candidate.id,
      title: candidate.title,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
      messages: candidate.messages };
  }
}
