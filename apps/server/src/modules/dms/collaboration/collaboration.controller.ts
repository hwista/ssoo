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
