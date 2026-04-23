import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';
import type { DeepPartial } from '../runtime/dms-config.service.js';
import { success } from '../../../common/responses.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { DmsFeatureGuard } from '../access/dms-feature.guard.js';
import { RequireDmsFeature } from '../access/require-dms-feature.decorator.js';
import { settingsService, type DmsSettingsConfig } from './settings.service.js';

@ApiTags('dms')
@ApiBearerAuth()
@Controller('dms/settings')
@UseGuards(JwtAuthGuard, DmsFeatureGuard)
@RequireDmsFeature('canManageSettings')
export class SettingsController {
  @Get()
  @ApiOperation({ summary: 'DMS 설정 조회' })
  @ApiOkResponse({ description: '설정 스냅샷 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async getSettings(@Query('includeRuntime') includeRuntime?: string) {
    const shouldIncludeRuntime = includeRuntime === '1' || includeRuntime === 'true';
    return success(await settingsService.getSettings(shouldIncludeRuntime));
  }

  @Post()
  @ApiOperation({ summary: 'DMS 설정 갱신' })
  @ApiOkResponse({ description: '설정 스냅샷 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async update(@Body() body: Record<string, unknown>) {
    const action = body.action === 'updateGitPath' ? 'updateGitPath' : 'update';
    if (action === 'updateGitPath') {
      throw new BadRequestException('Markdown runtime 경로는 settings에서 변경할 수 없습니다. 배포/runtime 설정으로 관리하세요.');
    }

    const config = body.config;
    const partial = config && typeof config === 'object'
      ? config as DeepPartial<DmsSettingsConfig>
      : undefined;
    const result = await settingsService.updateSettings(partial);
    if (!result.success) {
      throw new BadRequestException(result.error);
    }

    return success({
      config: result.config,
      docDir: result.docDir,
      access: result.access,
      runtime: result.runtime,
    });
  }
}
