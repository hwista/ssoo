import {
  Body,
  Controller,
  Get,
  Param,
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
import { DecideRegistrationRequestDto } from './dto/registration-request.dto.js';

@ApiTags('auth-admin')
@ApiBearerAuth()
@Controller('auth/admin')
@UseGuards(RolesGuard)
export class AuthAdminController {
  constructor(
    private readonly authPolicyService: AuthPolicyService,
    private readonly authRegistrationService: AuthRegistrationService,
  ) {}

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

  @Get('registration-requests')
  @Roles('admin')
  @ApiOperation({ summary: '가입 신청 목록 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'statusCode', required: false, enum: ['pending', 'approved', 'rejected', 'expired'] })
  @ApiOkResponse({ type: ApiSuccess })
  async listRegistrationRequests(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('statusCode') statusCode?: string,
  ) {
    const result = await this.authRegistrationService.listRequests({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      statusCode: statusCode || undefined,
    });
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
