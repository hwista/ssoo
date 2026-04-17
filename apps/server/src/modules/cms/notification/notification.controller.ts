import { Controller, Get, Put, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { NotificationService } from './notification.service.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { success, paginated } from '../../../common/index.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import { FindNotificationsDto } from './dto/notification.dto.js';

@ApiTags('cms-notifications')
@ApiBearerAuth()
@Controller('cms/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: '알림 목록' })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findAll(@Query() params: FindNotificationsDto, @CurrentUser() user: TokenPayload) {
    const { data, total, page, pageSize } = await this.notificationService.findAll(BigInt(user.userId), params);
    const serialized = data.map((n) => serializeBigInt(n));
    return paginated(serialized as Record<string, unknown>[], page, pageSize, total);
  }

  @Put(':id/read')
  @ApiOperation({ summary: '알림 읽음 처리' })
  @ApiOkResponse({ description: '알림 읽음 처리 완료' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async markAsRead(@Param('id') id: string, @CurrentUser() user: TokenPayload) {
    const notification = await this.notificationService.markAsRead(BigInt(id), BigInt(user.userId));
    return success(serializeBigInt(notification));
  }

  @Put('read-all')
  @ApiOperation({ summary: '전체 알림 읽음 처리' })
  @ApiOkResponse({ description: '전체 알림 읽음 처리 완료' })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async markAllAsRead(@CurrentUser() user: TokenPayload) {
    const result = await this.notificationService.markAllAsRead(BigInt(user.userId));
    return success(result);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '읽지 않은 알림 수' })
  @ApiOkResponse({ description: '읽지 않은 알림 수' })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async getUnreadCount(@CurrentUser() user: TokenPayload) {
    const result = await this.notificationService.getUnreadCount(BigInt(user.userId));
    return success(result);
  }
}
