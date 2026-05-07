import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { success } from '../../../common/responses.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { AccessRequestService } from './access-request.service.js';
import { DmsFeatureGuard } from './dms-feature.guard.js';
import { RequireDmsFeature } from './require-dms-feature.decorator.js';
import { CreateDirectGrantDto } from './dto/access-request.dto.js';

@ApiTags('dms-access')
@ApiBearerAuth()
@Controller('dms/access/grants')
@UseGuards(DmsFeatureGuard)
export class AccessGrantController {
  constructor(private readonly accessRequestService: AccessRequestService) {}

  @Post()
  @RequireDmsFeature('canReadDocuments')
  @ApiOperation({ summary: '관리자 직접 grant 발급 (요청 entity 없이)' })
  @ApiOkResponse({ description: '신규 또는 갱신된 grant 정보 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async createDirectGrant(
    @CurrentUser() currentUser: TokenPayload,
    @Body() dto: CreateDirectGrantDto,
  ) {
    return success(await this.accessRequestService.createDirectGrant(currentUser, dto));
  }
}
