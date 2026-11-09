import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { success } from '../../../common/responses.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { TokenPayload } from '../auth/interfaces/auth.interface.js';
import { IntegrationSettingsService } from '../integrations/integration-settings.service.js';
import { UpdateIntegrationSettingsDto } from '../integrations/integration-settings.dto.js';
import { AiEmbeddingProviderService } from './ai-embedding-provider.service.js';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { AiIndexSourceApp } from '@ssoo/types/common';
import { EmbeddingReindexService } from './embedding-reindex.service.js';

class ReindexEmbeddingDto {
  @ApiProperty({ enum: ['admin', 'crm', 'pms', 'dms', 'sns'] })
  @IsIn(['admin', 'crm', 'pms', 'dms', 'sns']) sourceApp!: AiIndexSourceApp;
  @ApiProperty({ description: '재색인 사유' }) @IsString() @MinLength(1) @MaxLength(500) reason!: string;
}

@ApiTags('ai-index') @ApiBearerAuth()
@Controller('ai-index/embedding') @UseGuards(RolesGuard) @Roles('admin')
export class EmbeddingSettingsController {
  constructor(private readonly settings: IntegrationSettingsService, private readonly embedding: AiEmbeddingProviderService, private readonly reindex: EmbeddingReindexService) {}
  @Get('settings') @ApiOperation({ summary: '임베딩 연결 설정 조회 (비밀값 제외)' })
  async get() { return success(await this.settings.admin('embedding')); }
  @Put('settings') @ApiOperation({ summary: '임베딩 연결 저장 및 즉시 적용' })
  async save(@Body() dto: UpdateIntegrationSettingsDto, @CurrentUser() user: TokenPayload) { return success(await this.embedding.save(dto, BigInt(user.userId))); }
  @Post('probe') @ApiOperation({ summary: '시험 문장의 실제 임베딩 생성으로 연결 확인' })
  async probe(@Body() dto: UpdateIntegrationSettingsDto) { return success(await this.embedding.probe(dto)); }
  @Post('reindex') @ApiOperation({ summary: '현재 임베딩과 불일치하는 등록 문서 최대 20건 재색인 등록' })
  async enqueue(@Body() dto: ReindexEmbeddingDto, @CurrentUser() user: TokenPayload) { return success(await this.reindex.enqueue(dto.sourceApp, dto.reason, BigInt(user.userId))); }
}
