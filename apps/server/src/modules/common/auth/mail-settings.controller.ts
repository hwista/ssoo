import { Body, Controller, Get, Header, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsString, Matches } from 'class-validator';
import { success } from '../../../common/responses.js';
import { Roles } from './decorators/roles.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { RolesGuard } from './guards/roles.guard.js';
import type { TokenPayload } from './interfaces/auth.interface.js';
import { IntegrationSettingsService } from '../integrations/integration-settings.service.js';
import { UpdateIntegrationSettingsDto } from '../integrations/integration-settings.dto.js';
import { AuthEmailOutboxWorkerService } from './auth-email-outbox-worker.service.js';
import { MailDeliveryService } from './mail-delivery.service.js';

class TestMailDto {
  @ApiProperty({ description: '시험 메일 수신 주소' }) @IsEmail() to!: string;
}

// Mailpit uses compact alphanumeric IDs, not the outbox UUID contract.
class LocalMailIdDto {
  @ApiProperty({ description: '로컬 수신함 메시지 ID' })
  @IsString() @Matches(/^[A-Za-z0-9_-]{10,80}$/)
  id!: string;
}

@ApiTags('auth-admin') @ApiBearerAuth()
@Controller('auth/admin/mail') @UseGuards(RolesGuard) @Roles('admin')
export class MailSettingsController {
  constructor(private readonly settings: IntegrationSettingsService, private readonly mail: MailDeliveryService, private readonly worker: AuthEmailOutboxWorkerService) {}

  @Get('settings') @ApiOperation({ summary: '메일 연결 설정 조회 (비밀값 제외)' })
  async get() { return success(await this.settings.admin('mail')); }

  @Put('settings') @ApiOperation({ summary: '메일 연결 저장 및 즉시 적용' })
  async save(@Body() dto: UpdateIntegrationSettingsDto, @CurrentUser() user: TokenPayload) { const saved = await this.mail.save(dto, BigInt(user.userId)); await this.worker.refreshTransport(); return success(saved); }

  @Post('probe') @ApiOperation({ summary: '메일 연결 확인 (메일을 보내지 않음)' })
  async probe(@Body() dto: UpdateIntegrationSettingsDto) { return success(await this.mail.probe(dto)); }

  @Post('test') @ApiOperation({ summary: '저장된 설정으로 시험 메일 보내기' })
  async test(@Body() dto: TestMailDto) { return success(await this.mail.testMail(dto.to)); }

  @Get('inbox') @Header('Cache-Control', 'no-store') @ApiOperation({ summary: '관리자 전용 로컬 수신함 (최근 50건)' })
  async messages() { return success(await this.mail.messages()); }

  @Get('inbox/:id') @Header('Cache-Control', 'no-store') @ApiOperation({ summary: '관리자 전용 로컬 메일 본문' })
  async message(@Param() params: LocalMailIdDto) { return success(await this.mail.message(params.id)); }
}
