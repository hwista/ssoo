import { BadRequestException, Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';
import { success } from '../../../common/responses.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { gitService } from '../runtime/git.service.js';

type GitActionBody = {
  action?:
    | 'status'
    | 'commit'
    | 'commitFiles'
    | 'discard'
    | 'discardAll'
    | 'history'
    | 'fileHistory'
    | 'restore'
    | 'diff'
    | 'init';
  message?: string;
  author?: string;
  path?: string;
  files?: string[];
  commitHash?: string;
  maxCount?: number;
};

@ApiTags('dms')
@ApiBearerAuth()
@Controller('dms/git')
@UseGuards(JwtAuthGuard)
export class GitController {
  @Get()
  @ApiOperation({ summary: 'DMS Git 변경사항 조회' })
  @ApiOkResponse({ description: 'Git 상태 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async status() {
    await this.ensureInitialized();
    const result = await gitService.getChanges();
    if (!result.success) {
      throw new BadRequestException(result.error);
    }
    return success(result.data);
  }

  @Post()
  @ApiOperation({ summary: 'DMS Git 액션 실행' })
  @ApiOkResponse({ description: 'Git 액션 결과 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async action(@Body() body: GitActionBody) {
    const action = body.action ?? 'status';

    if (action === 'init') {
      const initResult = await gitService.initialize();
      if (!initResult.success) {
        throw new BadRequestException(initResult.error);
      }
      return success(initResult.data);
    }

    await this.ensureInitialized();

    switch (action) {
      case 'status':
        return this.wrap(await gitService.getChanges());
      case 'commit':
        if (!body.message) throw new BadRequestException('Missing commit message');
        return this.wrap(await gitService.commitAll(body.message, body.author));
      case 'commitFiles':
        if (!body.files?.length) throw new BadRequestException('Missing files');
        if (!body.message) throw new BadRequestException('Missing commit message');
        return this.wrap(await gitService.commitFiles(body.files, body.message, body.author));
      case 'discard':
        if (!body.path) throw new BadRequestException('Missing file path');
        return this.wrap(await gitService.discardFile(body.path));
      case 'discardAll':
        return this.wrap(await gitService.discardAll());
      case 'history':
        return this.wrap(await gitService.getHistory(body.maxCount));
      case 'fileHistory':
        if (!body.path) throw new BadRequestException('Missing file path');
        return this.wrap(await gitService.getFileHistory(body.path, body.maxCount));
      case 'restore':
        if (!body.path) throw new BadRequestException('Missing file path');
        if (!body.commitHash) throw new BadRequestException('Missing commit hash');
        return this.wrap(await gitService.restoreFile(body.path, body.commitHash));
      case 'diff':
        if (!body.path) throw new BadRequestException('Missing file path');
        return this.wrap(await gitService.getFileDiff(body.path));
      default:
        throw new BadRequestException(`Invalid action: ${action}`);
    }
  }

  private async ensureInitialized() {
    if (gitService.isAvailable) {
      return;
    }

    const result = await gitService.initialize();
    if (!result.success) {
      throw new BadRequestException(result.error);
    }
  }

  private wrap<T>(result: { success: true; data: T } | { success: false; error: string }) {
    if (!result.success) {
      throw new BadRequestException(result.error);
    }

    return success(result.data);
  }
}
