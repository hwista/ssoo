import { Controller, Get } from "@nestjs/common";
import { ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { ApiResponse } from "@ssoo/types";
import { HealthStatusDto } from '../../../common/swagger/health.dto.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "헬스 체크" })
  @ApiOkResponse({ type: HealthStatusDto })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  check(): ApiResponse<HealthStatusDto> {
    return {
      success: true,
      data: {
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "ssoo-server",
        version: "0.0.1",
      },
    };
  }
}
