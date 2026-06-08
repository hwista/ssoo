import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { success } from '../../../common/index.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { AccessService } from './access.service.js';

@ApiTags('sns-access')
@ApiBearerAuth()
@Controller('sns/access')
@UseGuards(RolesGuard)
export class AccessController {
  constructor(private readonly accessService: AccessService) {}

  @Get('me')
  @ApiOperation({ summary: 'SNS 접근 권한 snapshot 조회' })
  @ApiOkResponse({ description: 'SNS domain access snapshot 반환' })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async getMyAccess(@CurrentUser() user: TokenPayload) {
    return success(await this.accessService.getAccessSnapshot(user));
  }
}
