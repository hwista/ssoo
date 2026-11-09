import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { success } from '../../../common/index.js';
import { ApiSuccess } from '../../../common/swagger/api-response.dto.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Roles } from './decorators/roles.decorator.js';
import { RolesGuard } from './guards/roles.guard.js';
import { TokenPayload } from './interfaces/auth.interface.js';
import { AuthPolicyService } from './auth-policy.service.js';
import { AuthRegistrationService } from './auth-registration.service.js';
import { UpdateAuthProviderSettingsDto } from './dto/auth-policy.dto.js';
import { RevokeUserSessionsDto } from './dto/auth-admin-operations.dto.js';
import { DecideRegistrationRequestDto, ListRegistrationRequestsQueryDto } from './dto/registration-request.dto.js';
import { AuthAdminOperationsService } from './auth-admin-operations.service.js';
import { EmailDeliveryListQuery, RetryEmailDeliveryDto } from './dto/email-delivery-operations.dto.js';
import { AuthEmailOutboxWorkerService } from './auth-email-outbox-worker.service.js';

@ApiTags('auth-admin')
@ApiBearerAuth()
@Controller('auth/admin')
@UseGuards(RolesGuard)
export class AuthAdminController {
  constructor(
    private readonly authPolicyService: AuthPolicyService,
    private readonly authRegistrationService: AuthRegistrationService,
    private readonly authAdminOperationsService: AuthAdminOperationsService,
    private readonly authEmailOutboxWorkerService: AuthEmailOutboxWorkerService,
  ) {}

  @Get('users/:id/account')
  @Roles('admin')
  @ApiOperation({ summary: '사용자 인증 계정/세션 운영 상태 조회' })
  @ApiParam({ name: 'id', description: '사용자 ID' })
  async getUserAccount(@Param('id') id: string) {
    return success(await this.authAdminOperationsService.getAccountSnapshot(BigInt(id)));
  }

  @Post('users/:id/sessions/revoke')
  @Roles('admin')
  @ApiOperation({ summary: '사용자 활성 세션 전체 회수' })
  @ApiParam({ name: 'id', description: '사용자 ID' })
  async revokeUserSessions(
    @Param('id') id: string,
    @Body() dto: RevokeUserSessionsDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.authAdminOperationsService.revokeSessions(
      BigInt(id),
      BigInt(currentUser.userId),
      dto.reason,
    ));
  }

  @Post('users/:id/unlock')
  @Roles('admin')
  @ApiOperation({ summary: '사용자 로그인 잠금 해제' })
  @ApiParam({ name: 'id', description: '사용자 ID' })
  async unlockUser(
    @Param('id') id: string,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.authAdminOperationsService.unlockAccount(
      BigInt(id),
      BigInt(currentUser.userId),
    ));
  }

  @Post('users/:id/password-reset')
  @Roles('admin')
  @ApiOperation({ summary: '사용자 비밀번호 재설정 메일 요청' })
  @ApiParam({ name: 'id', description: '사용자 ID' })
  async requestUserPasswordReset(@Param('id') id: string) {
    return success(await this.authAdminOperationsService.requestPasswordReset(BigInt(id)));
  }

  @Get('settings')
  @Roles('admin')
  @ApiOperation({ summary: '인증 provider 설정 조회' })
  @ApiOkResponse({ type: ApiSuccess })
  async getSettings() {
    const settings = await this.authPolicyService.getOrCreateSettings();
    return success(this.authPolicyService.toAdminSettings(settings), '인증 설정 조회 성공');
  }

  @Put('settings')
  @Roles('admin')
  @ApiOperation({ summary: '인증 provider 설정 수정' })
  @ApiBody({ type: UpdateAuthProviderSettingsDto })
  @ApiOkResponse({ type: ApiSuccess })
  async updateSettings(
    @Body() dto: UpdateAuthProviderSettingsDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const settings = await this.authPolicyService.updateSettings(dto, BigInt(currentUser.userId));
    return success(settings, '인증 설정 저장 성공');
  }

  @Get('email-delivery/status')
  @Roles('admin')
  @ApiOperation({ summary: '인증 메일 outbox worker와 SMTP 전달 상태 조회' })
  async getEmailDeliveryStatus() {
    return success(await this.authEmailOutboxWorkerService.getStatus(), '인증 메일 전달 상태 조회 성공');
  }

  @Post('email-delivery/run')
  @Roles('admin')
  @ApiOperation({ summary: '대기 중인 인증 메일 즉시 전달' })
  async runEmailDelivery() {
    return success(await this.authEmailOutboxWorkerService.runOnce('admin-manual'), '인증 메일 전달 실행 완료');
  }

  @Post('email-delivery/:messageId/retry')
  @Roles('admin')
  @ApiOperation({ summary: '실패한 인증 메일 재시도' })
  @ApiParam({ name: 'messageId', description: '인증 메일 outbox message ID' })
  async retryEmailDelivery(@Param('messageId', ParseUUIDPipe) messageId: string, @Body() dto: RetryEmailDeliveryDto, @CurrentUser() user: TokenPayload) {
    return success(await this.authEmailOutboxWorkerService.retry(messageId, dto, BigInt(user.userId)), '인증 메일 재시도 완료');
  }

  @Get('email-delivery/messages')
  @Roles('admin')
  @ApiOperation({ summary: '인증 메일 상태별 전체 이력 목록 (본문 제외)' })
  async emailMessages(@Query() query: EmailDeliveryListQuery) { return success(await this.authEmailOutboxWorkerService.listMessages(query)); }

  @Get('registration-requests')
  @Roles('admin')
  @ApiOperation({ summary: '가입 신청 목록 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'statusCode', required: false, enum: ['pending', 'approved', 'rejected', 'expired'] })
  @ApiOkResponse({ type: ApiSuccess })
  async listRegistrationRequests(@Query() query: ListRegistrationRequestsQueryDto) {
    const result = await this.authRegistrationService.listRequests({ page: query.page ?? 1, limit: query.limit ?? 20, statusCode: query.statusCode });
    return success(result, '가입 신청 목록 조회 성공');
  }

  @Get('roles')
  @Roles('admin')
  @ApiOperation({ summary: '가입 승인에 사용할 활성 역할 목록 조회' })
  @ApiOkResponse({ type: ApiSuccess })
  async listAssignableRoles() {
    const result = await this.authRegistrationService.listAssignableRoles();
    return success(result, '활성 역할 목록 조회 성공');
  }

  @Post('registration-requests/:id/approve')
  @Roles('admin')
  @ApiOperation({ summary: '가입 신청 승인' })
  @ApiParam({ name: 'id', description: '가입 신청 ID' })
  @ApiBody({ type: DecideRegistrationRequestDto })
  @ApiOkResponse({ type: ApiSuccess })
  async approveRegistrationRequest(
    @Param('id') id: string,
    @Body() dto: DecideRegistrationRequestDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const result = await this.authRegistrationService.approveRequest(id, dto, BigInt(currentUser.userId));
    return success(result, '가입 신청 승인 성공');
  }

  @Post('registration-requests/:id/reject')
  @Roles('admin')
  @ApiOperation({ summary: '가입 신청 반려' })
  @ApiParam({ name: 'id', description: '가입 신청 ID' })
  @ApiBody({ type: DecideRegistrationRequestDto })
  @ApiOkResponse({ type: ApiSuccess })
  async rejectRegistrationRequest(
    @Param('id') id: string,
    @Body() dto: DecideRegistrationRequestDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const result = await this.authRegistrationService.rejectRequest(id, dto, BigInt(currentUser.userId));
    return success(result, '가입 신청 반려 성공');
  }
}
