import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import type { CrmContractApprovalDecision, CrmContractApprovalRequest } from '@ssoo/types/crm';
import { success } from '../../../common/index.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CrmDomainFeatureGuard } from '../access/crm-domain-feature.guard.js';
import { RequireCrmDomainFeature } from '../access/require-crm-domain-feature.decorator.js';
import { ContractApprovalService } from './contract-approval.service.js';

class ApprovalRequestDto implements CrmContractApprovalRequest {
  @ApiProperty() @IsString() @Matches(/^[1-9]\d{0,18}$/) approverId!: string;
  @ApiProperty() @IsString() @Matches(/^[a-f0-9]{64}$/) versionKey!: string;
  @ApiProperty() @IsUUID('4') requestKey!: string;
}
class ApprovalDecisionDto implements CrmContractApprovalDecision {
  @ApiProperty({ enum: ['approve', 'reject', 'withdraw'] }) @IsIn(['approve', 'reject', 'withdraw']) action!: CrmContractApprovalDecision['action'];
  @ApiPropertyOptional({ maxLength: 2000 }) @IsOptional() @IsString() @MaxLength(2000) reason?: string;
}

@ApiTags('crm-contract-approvals')
@ApiBearerAuth()
@Controller('crm/contract-approvals')
@UseGuards(CrmDomainFeatureGuard)
@RequireCrmDomainFeature('canReadContract')
export class ContractApprovalController {
  constructor(private readonly approvals: ContractApprovalService) {}

  @Get('inbox')
  @ApiOperation({ summary: '본인에게 요청된 계약 초안 승인 대기 목록' })
  async inbox(@CurrentUser() user: TokenPayload, @Query('cursor') cursor?: string) { return success(await this.approvals.inbox(user, cursor)); }

  @Get('contracts/:code')
  @ApiOperation({ summary: '계약 초안 내부 승인 상태와 이력' })
  async workspace(@Param('code') code: string, @CurrentUser() user: TokenPayload, @Query('cursor') cursor?: string) { return success(await this.approvals.workspace(code, user, cursor)); }

  @Get('contracts/:code/candidates')
  @RequireCrmDomainFeature('canWriteContract')
  @ApiOperation({ summary: '계약과 원본 초안을 읽을 수 있는 승인자 후보' })
  async candidates(@Param('code') code: string, @CurrentUser() user: TokenPayload, @Query('cursor') cursor?: string) { return success(await this.approvals.candidates(code, user, cursor)); }

  @Post('contracts/:code')
  @RequireCrmDomainFeature('canWriteContract')
  @ApiOperation({ summary: '저장된 계약 초안을 지정한 한 사람에게 승인 요청' })
  async request(@Param('code') code: string, @Body() body: ApprovalRequestDto, @CurrentUser() user: TokenPayload) { return success(await this.approvals.request(code, body, user)); }

  @Get(':id/snapshot')
  @ApiOperation({ summary: '원본 열람 권한을 확인한 후 요청 당시 계약 초안 조회' })
  async snapshot(@Param('id') id: string, @CurrentUser() user: TokenPayload) { return success(await this.approvals.snapshot(id, user)); }

  @Post(':id/decision')
  @ApiOperation({ summary: '지정된 승인자의 승인·반려 또는 요청자의 철회' })
  async decide(@Param('id') id: string, @Body() body: ApprovalDecisionDto, @CurrentUser() user: TokenPayload) { return success(await this.approvals.decide(id, body, user)); }
}
