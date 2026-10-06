import { BadRequestException, Controller, Get, Param, ServiceUnavailableException } from "@nestjs/common";
import {
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { ApiResponse } from "@ssoo/types";
import { HealthReadinessDto, HealthStatusDto } from '../../../common/swagger/health.dto.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { ApiOkEnvelopeResponse } from '../../../common/swagger/api-response.decorator.js';
import { Public } from '../../common/auth/decorators/public.decorator.js';
import { PLATFORM_APPS, PlatformReadinessService, type PlatformApp } from './platform-readiness.service.js';

@ApiTags("health")
@Controller("health")
@Public()
export class HealthController {
  constructor(
    private readonly platform: PlatformReadinessService,
  ) {}

  @Get()
  @ApiOperation({ summary: "헬스 체크" })
  @ApiOkEnvelopeResponse(HealthStatusDto)
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  check(): ApiResponse<HealthStatusDto> {
    return {
      success: true,
      data: {
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "ssoo-server",
        version: "0.0.1",
        releaseSha: process.env.SSOO_RELEASE_SHA || 'local-development',
      },
    };
  }

  @Get('core-readiness')
  @ApiOperation({ summary: '공통 서버 기동 준비 상태' })
  async checkCoreReadiness() {
    const core = await this.platform.core();
    if (core.status !== 'ready') {
      throw new ServiceUnavailableException({ code: 'PLATFORM_NOT_READY', message: 'Core runtime is not ready.' });
    }
    return { success: true, data: core };
  }

  @Get('apps/:app')
  @ApiOperation({ summary: '앱별 배포 준비 상태 (민감정보 제외)' })
  async checkAppReadiness(@Param('app') app: string) {
    if (!PLATFORM_APPS.includes(app as PlatformApp)) throw new BadRequestException('Unknown platform app');
    const readiness = await this.platform.app(app as PlatformApp);
    if (readiness.status !== 'ready') {
      throw new ServiceUnavailableException({ code: readiness.code, message: 'App runtime is not ready.', readiness });
    }
    return { success: true, data: readiness };
  }

  @Get('readiness')
  @ApiOperation({ summary: '플랫폼 전체 앱 readiness 체크' })
  @ApiOkEnvelopeResponse(HealthReadinessDto)
  @ApiServiceUnavailableResponse({ type: ApiError, description: '플랫폼 readiness 실패' })
  async checkReadiness(): Promise<ApiResponse<HealthReadinessDto>> {
    const snapshot = await this.platform.all();
    if (snapshot.core.status !== 'ready') {
      throw new ServiceUnavailableException({ code: 'PLATFORM_NOT_READY', message: 'Core runtime is not ready.' });
    }
    const failed = snapshot.apps.filter((readiness) => readiness.status !== 'ready');
    if (failed.some((readiness) => readiness.app === 'dms')) {
      throw new ServiceUnavailableException({ code: 'DMS_RUNTIME_NOT_READY', message: 'DMS runtime readiness check failed.', services: snapshot.apps });
    }
    if (failed.length > 0) {
      throw new ServiceUnavailableException({ code: 'APP_RUNTIME_NOT_READY', message: 'Platform app readiness check failed.', services: snapshot.apps });
    }
    return {
      success: true,
      data: {
        status: 'ready', timestamp: new Date().toISOString(), service: 'ssoo-server',
        database: 'ready', dms: 'ready', services: snapshot.apps,
        releaseSha: process.env.SSOO_RELEASE_SHA || 'local-development',
      },
    };
  }
}
