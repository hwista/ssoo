import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { success } from '../../../common/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../auth/interfaces/auth.interface.js';
import { ParticipationOperationsService } from './participation-operations.service.js';
import { participationId } from './participation-write.service.js';
import { CreateMembershipDto, CreateServiceGrantDto, ParticipationListQuery, ParticipationRevisionDto, TransferMembershipDto, UpdateMembershipDto, UpdateServiceGrantDto } from './participation-operations.dto.js';

@ApiTags('Participation operations')
@ApiBearerAuth()
@Controller('access/participation')
export class ParticipationOperationsController {
  constructor(private readonly operations: ParticipationOperationsService) {}

  @Get('diagnose/:userId') @ApiOperation({ summary: '사용자 계정·참여·5앱 이용 자격 진단' })
  async diagnose(@CurrentUser() actor: TokenPayload, @Param('userId') userId: string) {
    return success(await this.operations.diagnose(BigInt(actor.userId), participationId(userId)));
  }

  @Get('memberships') @ApiOperation({ summary: '관리자 조직 소속 검색' })
  async memberships(@CurrentUser() user: TokenPayload, @Query() query: ParticipationListQuery) {
    return success(await this.operations.memberships(BigInt(user.userId), query));
  }

  @Post('memberships') @ApiOperation({ summary: '관리자 조직 소속 배치' })
  async createMembership(@CurrentUser() user: TokenPayload, @Body() dto: CreateMembershipDto) {
    return success(await this.operations.createMembership(BigInt(user.userId), dto));
  }

  @Put('memberships/:id') @ApiOperation({ summary: '조직 소속 기간·주 소속·직책 변경' })
  async updateMembership(@CurrentUser() user: TokenPayload, @Param('id') id: string, @Body() dto: UpdateMembershipDto) {
    return success(await this.operations.updateMembership(participationId(id), BigInt(user.userId), dto));
  }

  @Post('memberships/:id/end') @ApiOperation({ summary: '소속 종료 및 해당 조직 이용권·위임 회수' })
  async endMembership(@CurrentUser() user: TokenPayload, @Param('id') id: string, @Body() dto: ParticipationRevisionDto) {
    return success(await this.operations.endMembership(participationId(id), BigInt(user.userId), dto));
  }

  @Post('memberships/:id/transfer') @ApiOperation({ summary: '기존 소속 종료와 새 조직 전보' })
  async transfer(@CurrentUser() user: TokenPayload, @Param('id') id: string, @Body() dto: TransferMembershipDto) {
    return success(await this.operations.transferMembership(participationId(id), BigInt(user.userId), dto));
  }

  @Get('grants') @ApiOperation({ summary: '관리자 서비스 이용권 검색·유효성 조회' })
  async grants(@CurrentUser() user: TokenPayload, @Query() query: ParticipationListQuery) {
    return success(await this.operations.grants(BigInt(user.userId), query));
  }

  @Post('grants') @ApiOperation({ summary: '관리자 조직별 서비스 이용권 부여' })
  async createGrant(@CurrentUser() user: TokenPayload, @Body() dto: CreateServiceGrantDto) {
    return success(await this.operations.createGrant(BigInt(user.userId), dto));
  }

  @Put('grants/:id') @ApiOperation({ summary: '서비스 이용권 역할·기간 변경 또는 재부여' })
  async updateGrant(@CurrentUser() user: TokenPayload, @Param('id') id: string, @Body() dto: UpdateServiceGrantDto) {
    return success(await this.operations.updateGrant(participationId(id), BigInt(user.userId), dto));
  }

  @Post('grants/:id/revoke') @ApiOperation({ summary: '사유·변경 버전을 확인한 서비스 이용권 회수' })
  async revokeGrant(@CurrentUser() user: TokenPayload, @Param('id') id: string, @Body() dto: ParticipationRevisionDto) {
    return success(await this.operations.revokeGrant(participationId(id), BigInt(user.userId), dto));
  }
}
