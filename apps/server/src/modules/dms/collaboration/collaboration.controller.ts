import { BadRequestException, Body, Controller, Delete, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { success } from '../../../common/responses.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { DmsFeatureGuard } from '../access/dms-feature.guard.js';
import { RequireDmsFeature } from '../access/require-dms-feature.decorator.js';
import { CollaborationService } from './collaboration.service.js';

@ApiTags('dms')
@ApiBearerAuth()
@Controller('dms/collaboration')
@UseGuards(DmsFeatureGuard)
@RequireDmsFeature('canReadDocuments')
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Get()
  @ApiOperation({ summary: '문서 collaboration snapshot 조회' })
  @ApiOkResponse({ description: '문서 collaboration snapshot 반환' })
  getSnapshot(@Query('path') path?: string) {
    if (!path?.trim()) throw new BadRequestException('path는 필수입니다.');
    return success(this.collaborationService.getSnapshot(path));
  }

  @Get('publish-failures')
  @RequireDmsFeature('canUseGit')
  @ApiOperation({ summary: '자동 publish 실패 목록 조회' })
  @ApiOkResponse({ description: '수동 복구가 필요한 publish 실패 목록 반환' })
  async listPublishFailures() {
    return success(await this.collaborationService.listPublishFailures());
  }

  @Post()
  @ApiOperation({ summary: '문서 collaboration heartbeat / join' })
  @ApiOkResponse({ description: '문서 collaboration snapshot 반환' })
  async heartbeat(@CurrentUser() currentUser: TokenPayload, @Body() body: { path?: string; mode?: 'view' | 'edit'; sessionId?: string }) {
    if (!body.path?.trim()) throw new BadRequestException('path는 필수입니다.');
    return success(await this.collaborationService.heartbeat({ path: body.path, mode: body.mode, sessionId: body.sessionId, currentUser }));
  }

  @Post('takeover')
  @ApiOperation({ summary: '문서 soft lock takeover' })
  @ApiOkResponse({ description: '문서 collaboration snapshot 반환' })
  async takeover(@CurrentUser() currentUser: TokenPayload, @Body() body: { path?: string; sessionId?: string }) {
    if (!body.path?.trim()) throw new BadRequestException('path는 필수입니다.');
    return success(await this.collaborationService.takeover({ path: body.path, sessionId: body.sessionId, currentUser }));
  }

  @Get('takeover/pending')
  @ApiOperation({ summary: '문서 soft lock takeover 미처리 요청 조회' })
  @ApiOkResponse({ description: '현재 사용자 기준 미처리 takeover 요청 반환' })
  getTakeoverPendingState(@CurrentUser() currentUser: TokenPayload, @Query('path') path?: string) {
    if (!path?.trim()) throw new BadRequestException('path는 필수입니다.');
    return success(this.collaborationService.getTakeoverPendingState({ path, currentUser }));
  }

  @Post('takeover/respond')
  @ApiOperation({ summary: '문서 soft lock takeover 요청 응답' })
  @ApiOkResponse({ description: '문서 collaboration snapshot 반환' })
  async respondToTakeover(
    @CurrentUser() currentUser: TokenPayload,
    @Body() body: { requestId?: string; approved?: boolean },
  ) {
    if (!body.requestId?.trim()) throw new BadRequestException('requestId는 필수입니다.');
    return success(await this.collaborationService.respondToTakeover({
      requestId: body.requestId,
      approved: body.approved === true,
      currentUser,
    }));
  }

  @Post('refresh')
  @ApiOperation({ summary: '문서 publish 상태 refresh' })
  @ApiOkResponse({ description: '문서 collaboration snapshot 반환' })
  async refresh(@Body() body: { path?: string }) {
    if (!body.path?.trim()) throw new BadRequestException('path는 필수입니다.');
    return success(await this.collaborationService.refreshPublishState(body.path));
  }

  @Post('retry-publish')
  @ApiOperation({ summary: '문서 publish 재시도' })
  @ApiOkResponse({ description: '문서 collaboration snapshot 반환' })
  async retryPublish(@CurrentUser() currentUser: TokenPayload, @Body() body: { path?: string }) {
    if (!body.path?.trim()) throw new BadRequestException('path는 필수입니다.');
    return success(await this.collaborationService.retryPublish(body.path, currentUser));
  }

  @Post('force-lock')
  @RequireDmsFeature('canManageSettings')
  @ApiOperation({ summary: '문서 경로 강제 잠금' })
  @ApiOkResponse({ description: '문서 collaboration snapshot 반환' })
  async forceLock(@CurrentUser() currentUser: TokenPayload, @Body() body: { path?: string; reason?: string }) {
    if (!body.path?.trim()) throw new BadRequestException('path는 필수입니다.');
    return success(await this.collaborationService.forceLockPath(body.path, currentUser, body.reason));
  }

  @Post('force-unlock')
  @RequireDmsFeature('canManageSettings')
  @ApiOperation({ summary: '문서 경로 강제 잠금 해제' })
  @ApiOkResponse({ description: '문서 collaboration snapshot 반환' })
  async forceUnlock(@CurrentUser() currentUser: TokenPayload, @Body() body: { path?: string }) {
    if (!body.path?.trim()) throw new BadRequestException('path는 필수입니다.');
    return success(await this.collaborationService.forceUnlockPath(body.path, currentUser));
  }

  @Delete()
  @ApiOperation({ summary: '문서 collaboration leave' })
  @ApiOkResponse({ description: '문서 collaboration snapshot 반환' })
  leave(@CurrentUser() currentUser: TokenPayload, @Body() body: { path?: string; sessionId?: string }) {
    if (!body.path?.trim()) throw new BadRequestException('path는 필수입니다.');
    return success(this.collaborationService.leave({ path: body.path, sessionId: body.sessionId, currentUser }));
  }
}
