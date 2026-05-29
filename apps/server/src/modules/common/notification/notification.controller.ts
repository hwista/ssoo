import { Body, Controller, Get, Param, Put, Query, Sse } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Observable } from 'rxjs';
import { success } from '../../../common/responses.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../auth/interfaces/auth.interface.js';
import { ListNotificationsDto, MarkNotificationsByReferenceDto } from './dto/notification.dto.js';
import { CommonNotificationService } from './notification.service.js';

@ApiTags('common-notifications')
@ApiBearerAuth()
@Controller('notifications')
export class CommonNotificationController {
  constructor(private readonly notificationService: CommonNotificationService) {}

  @Get()
  @ApiOperation({ summary: '내 알림 목록 조회' })
  @ApiOkResponse({ description: '내 알림 목록 반환' })
  async findAll(
    @Query() params: ListNotificationsDto,
    @CurrentUser() user: TokenPayload,
  ) {
    return success(await this.notificationService.findAll(BigInt(user.userId), params));
  }

  @Get('unread-count')
  @ApiOperation({ summary: '내 미읽음 알림 수 조회' })
  @ApiOkResponse({ description: '내 미읽음 알림 수 반환' })
  async getUnreadCount(
    @Query('sourceApp') sourceApp: ListNotificationsDto['sourceApp'],
    @CurrentUser() user: TokenPayload,
  ) {
    return success(await this.notificationService.getUnreadCount(BigInt(user.userId), sourceApp));
  }

  @Sse('events')
  @ApiOperation({ summary: '내 알림 이벤트 스트림 구독' })
  streamEvents(
    @Query('sourceApp') sourceApp: ListNotificationsDto['sourceApp'],
    @CurrentUser() user: TokenPayload,
  ): Observable<MessageEvent> {
    return this.notificationService.streamForUser(BigInt(user.userId), sourceApp);
  }

  @Put(':id/read')
  @ApiOperation({ summary: '알림 읽음 처리' })
  @ApiOkResponse({ description: '읽음 처리된 알림 반환' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload,
  ) {
    return success(await this.notificationService.markAsRead(BigInt(id), BigInt(user.userId)));
  }

  @Put(':id/unread')
  @ApiOperation({ summary: '알림 안읽음 처리' })
  @ApiOkResponse({ description: '안읽음 처리된 알림 반환' })
  async markAsUnread(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload,
  ) {
    return success(await this.notificationService.markAsUnread(BigInt(id), BigInt(user.userId)));
  }

  @Put('read-all')
  @ApiOperation({ summary: '내 알림 전체 읽음 처리' })
  @ApiOkResponse({ description: '읽음 처리 건수 반환' })
  async markAllAsRead(
    @Query('sourceApp') sourceApp: ListNotificationsDto['sourceApp'],
    @CurrentUser() user: TokenPayload,
  ) {
    return success(await this.notificationService.markAllAsRead(BigInt(user.userId), sourceApp));
  }

  @Put('read-by-reference')
  @ApiOperation({ summary: '참조 경로 기준 알림 읽음 처리' })
  @ApiOkResponse({ description: '읽음 처리 건수 반환' })
  async markByReferencePathAsRead(
    @Body() body: MarkNotificationsByReferenceDto,
    @CurrentUser() user: TokenPayload,
  ) {
    return success(await this.notificationService.markByReferencePathAsRead(
      BigInt(user.userId),
      body.path,
      body.sourceApp,
    ));
  }
}
