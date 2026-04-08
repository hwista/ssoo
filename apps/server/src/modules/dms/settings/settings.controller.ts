import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
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
import { settingsService, type DmsSettingsConfig } from './settings.service.js';

@ApiTags('dms')
@ApiBearerAuth()
@Controller('dms/settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  @Get()
  @ApiOperation({ summary: 'DMS 설정 조회' })
  @ApiOkResponse({ description: '설정 스냅샷 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  getSettings() {
    return success(settingsService.getSettings());
  }

  @Post()
  @ApiOperation({ summary: 'DMS 설정 갱신' })
  @ApiOkResponse({ description: '설정 스냅샷 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async update(@Body() body: Record<string, unknown>) {
    const action = body.action === 'updateGitPath' ? 'updateGitPath' : 'update';

    if (action === 'update') {
      const config = body.config;
      const partial = config && typeof config === 'object'
        ? config as DeepPartial<DmsSettingsConfig>
        : undefined;
      const result = settingsService.updateSettings(partial);
      if (!result.success) {
        throw new BadRequestException(result.error);
      }
      return success({
        config: result.config,
        docDir: result.docDir,
        access: result.access,
      });
    }

    const newPath = typeof body.newPath === 'string' ? body.newPath : '';
    const copyFiles = body.copyFiles === true;
    const result = await settingsService.updateGitPath(newPath, copyFiles);
    if (!result.success) {
      throw new BadRequestException(result.error);
    }

    return success({
      config: result.config,
      docDir: result.docDir,
      access: result.access,
    });
  }
}
