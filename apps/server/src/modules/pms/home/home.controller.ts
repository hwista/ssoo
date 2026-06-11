import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { success } from '../../../common/index.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { HomeService } from './home.service.js';

@ApiTags('home')
@ApiBearerAuth()
@Controller('home')
@UseGuards(RolesGuard)
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('summary')
  @ApiOperation({ summary: 'PMS 홈 요약' })
  @ApiOkResponse({ description: 'PMS 홈 요약' })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async getSummary(@CurrentUser() currentUser: TokenPayload) {
    const summary = await this.homeService.getSummary(currentUser);
    return success(summary);
  }
}
