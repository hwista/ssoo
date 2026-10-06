import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { success } from '../../../common/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../auth/interfaces/auth.interface.js';
import { BadRequestException } from '@nestjs/common';
import { CreateOnboardingRequestDto, DecideOnboardingRequestDto, SetApprovalAuthorityDto } from './onboarding.dto.js';
import { OnboardingService } from './onboarding.service.js';
import { PlatformAdmissionService } from './platform-admission.service.js';

function parseId(value: string): bigint {
  if (!/^[1-9]\d{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) throw new BadRequestException('ID 형식이 올바르지 않습니다.');
  return BigInt(value);
}

@ApiTags('onboarding')
@ApiBearerAuth()
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService, private readonly admission: PlatformAdmissionService) {}

  @Get() @ApiOperation({ summary: '내 소속·서비스 신청 및 이용 상태' })
  async snapshot(@CurrentUser() user: TokenPayload) { return success(await this.onboarding.snapshot(BigInt(user.userId))); }

  @Get('business-organizations') @ApiOperation({ summary: '업무 서비스에서 사용 가능한 승인 조직' })
  async businessOrganizations(@CurrentUser() user: TokenPayload, @Query('service') service: string) {
    if (service !== 'pms' && service !== 'crm' && service !== 'dms' && service !== 'sns') throw new BadRequestException('서비스를 지정해 주세요.');
    const organizations = await this.admission.businessOrganizations(BigInt(user.userId), service);
    return success(organizations.map((organization) => ({ id: organization.orgId.toString(), name: organization.orgName })));
  }

  @Post('requests') @ApiOperation({ summary: '조직 소속·신규 조직·서비스 이용 신청' })
  async create(@CurrentUser() user: TokenPayload, @Body() dto: CreateOnboardingRequestDto) { return success(await this.onboarding.create(BigInt(user.userId), dto)); }

  @Delete('requests/:id') @ApiOperation({ summary: '내 대기 신청 취소' })
  async cancel(@CurrentUser() user: TokenPayload, @Param('id') id: string) { return success(await this.onboarding.cancel(parseId(id), BigInt(user.userId))); }

  @Get('reviews') @ApiOperation({ summary: '담당 범위의 승인 대기 신청' })
  async reviews(@CurrentUser() user: TokenPayload) { return success(await this.onboarding.reviewQueue(BigInt(user.userId))); }

  @Post('requests/:id/decision') @ApiOperation({ summary: '담당 범위의 신청 승인·반려' })
  async decide(@CurrentUser() user: TokenPayload, @Param('id') id: string, @Body() dto: DecideOnboardingRequestDto) { return success(await this.onboarding.decide(parseId(id), BigInt(user.userId), dto)); }

  @Get('authorities') @ApiOperation({ summary: '플랫폼 관리자의 승인 위임 조회' })
  async authorities(@CurrentUser() user: TokenPayload) { return success(await this.onboarding.listAuthorities(BigInt(user.userId))); }

  @Post('authorities') @ApiOperation({ summary: '플랫폼 관리자의 조직·서비스 승인 위임' })
  async delegate(@CurrentUser() user: TokenPayload, @Body() dto: SetApprovalAuthorityDto) { return success(await this.onboarding.setAuthority(BigInt(user.userId), dto)); }

  @Delete('authorities/:id') @ApiOperation({ summary: '플랫폼 관리자의 승인 위임 회수' })
  async revokeAuthority(@CurrentUser() user: TokenPayload, @Param('id') id: string) { return success(await this.onboarding.revokeAuthority(parseId(id), BigInt(user.userId))); }

  @Delete('grants/:id') @ApiOperation({ summary: '담당 서비스 이용권 회수' })
  async revokeGrant(@CurrentUser() user: TokenPayload, @Param('id') id: string) { return success(await this.onboarding.revokeGrant(parseId(id), BigInt(user.userId))); }
}
