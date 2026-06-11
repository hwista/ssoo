import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiBearerAuth,
  ApiTags } from '@nestjs/swagger';
import type { DeepPartial } from '../runtime/dms-config.service.js';
import { success } from '../../../common/responses.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { AccessService } from '../access/access.service.js';
import { DmsFeatureGuard } from '../access/dms-feature.guard.js';
import { settingsService, type DmsSettingsConfig } from './settings.service.js';

@ApiTags('dms')
@ApiBearerAuth()
@Controller('dms/settings')
@UseGuards(DmsFeatureGuard)
export class SettingsController {
  constructor(private readonly accessService: AccessService) {}

  private async getAccess(currentUser: TokenPayload) {
    const snapshot = await this.accessService.getAccessSnapshot(currentUser);
    return {
      canManageSystem: snapshot.features.canManageSettings,
      canManagePersonal: true,
    };
  }

  @Get()
  @ApiOperation({ summary: 'DMS 설정 조회' })
  @ApiOkResponse({ description: '설정 스냅샷 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async getSettings(
    @CurrentUser() currentUser: TokenPayload,
    @Query('includeRuntime') includeRuntime?: string,
  ) {
    const shouldIncludeRuntime = includeRuntime === '1' || includeRuntime === 'true';
    const userId = String(currentUser.userId);
    const access = await this.getAccess(currentUser);
    return success(await settingsService.getSettings(shouldIncludeRuntime, userId, access));
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'DMS 설정 갱신' })
  @ApiOkResponse({ description: '설정 스냅샷 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async update(
    @CurrentUser() currentUser: TokenPayload,
    @Body() body: Record<string, unknown>,
  ) {
    const action = body.action === 'updateGitPath' ? 'updateGitPath' : 'update';
    if (action === 'updateGitPath') {
      throw new BadRequestException('Markdown runtime 경로는 settings에서 변경할 수 없습니다. 배포/runtime 설정으로 관리하세요.');
    }

    const userId = String(currentUser.userId);
    const config = body.config;
    const partial = config && typeof config === 'object'
      ? config as DeepPartial<DmsSettingsConfig>
      : undefined;
    const access = await this.getAccess(currentUser);
    if (partial?.system && !access.canManageSystem) {
      throw new ForbiddenException('DMS 시스템 설정은 admin 계정만 변경할 수 있습니다.');
    }
    const result = await settingsService.updateSettings(partial, userId, access);
    if (!result.success) {
      throw new BadRequestException(result.error);
    }

    return success({
      config: result.config,
      docDir: result.docDir,
      access: result.access,
      runtime: result.runtime });
  }
}
