import { Controller, Get, InternalServerErrorException, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { success } from '../../../common/responses.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { fileSystemService } from '../runtime/file-system.service.js';

@ApiTags('dms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dms/files')
export class FilesController {
  @Get()
  @ApiOperation({ summary: 'DMS 파일 트리 조회' })
  @ApiOkResponse({ description: '파일 트리 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  @ApiUnauthorizedResponse({ type: ApiError, description: '인증 필요' })
  async getFileTree() {
    const result = await fileSystemService.getFileTree();
    if (!result.success) {
      throw new InternalServerErrorException(result.error?.message ?? '파일 트리 조회에 실패했습니다.');
    }

    return success(result.data ?? []);
  }
}
