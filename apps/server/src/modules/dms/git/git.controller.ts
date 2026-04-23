import fs from 'fs';
import { BadRequestException, Controller, Get, Post, Body, NotFoundException, UseGuards } from '@nestjs/common';
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
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { AccessRequestService } from '../access/access-request.service.js';
import { DocumentAclService } from '../access/document-acl.service.js';
import { DmsFeatureGuard } from '../access/dms-feature.guard.js';
import { RequireDmsFeature } from '../access/require-dms-feature.decorator.js';
import { contentService } from '../runtime/content.service.js';
import { isMarkdownFile } from '../runtime/file-utils.js';
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
@UseGuards(JwtAuthGuard, DmsFeatureGuard)
@RequireDmsFeature('canUseGit')
export class GitController {
  constructor(
    private readonly documentAclService: DocumentAclService,
    private readonly accessRequestService: AccessRequestService,
  ) {}

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
  async action(
    @Body() body: GitActionBody,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const action = body.action ?? 'status';

    if (action === 'init') {
      const initResult = await gitService.initialize();
      if (!initResult.success) {
        throw new BadRequestException(initResult.error);
      }
      return success(initResult.data);
    }

    await this.ensureInitialized();
    await this.accessRequestService.ensureRepoControlPlaneSynced();

    switch (action) {
      case 'status':
        return this.wrap(await gitService.getChanges());
      case 'commit':
        if (!body.message) throw new BadRequestException('Missing commit message');
        return this.wrap(await gitService.commitAll(body.message, body.author));
      case 'commitFiles':
        if (!body.files?.length) throw new BadRequestException('Missing files');
        if (!body.message) throw new BadRequestException('Missing commit message');
        return this.wrap(await gitService.commitFiles(
          this.resolveGitPaths(body.files, currentUser, 'write'),
          body.message,
          body.author,
        ));
      case 'discard':
        if (!body.path) throw new BadRequestException('Missing file path');
        return this.wrap(await gitService.discardFile(
          this.resolveGitPath(body.path, currentUser, 'write'),
        ));
      case 'discardAll':
        return this.wrap(await gitService.discardAll());
      case 'history':
        return this.wrap(await gitService.getHistory(body.maxCount));
      case 'fileHistory':
        if (!body.path) throw new BadRequestException('Missing file path');
        return this.wrap(await gitService.getFileHistory(
          this.resolveGitPath(body.path, currentUser, 'read'),
          body.maxCount,
        ));
      case 'restore':
        if (!body.path) throw new BadRequestException('Missing file path');
        if (!body.commitHash) throw new BadRequestException('Missing commit hash');
        return this.wrap(await gitService.restoreFile(
          this.resolveGitPath(body.path, currentUser, 'write'),
          body.commitHash,
        ));
      case 'diff':
        if (!body.path) throw new BadRequestException('Missing file path');
        return this.wrap(await gitService.getFileDiff(
          this.resolveGitPath(body.path, currentUser, 'read'),
        ));
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

  private resolveGitPaths(
    filePaths: string[],
    currentUser: TokenPayload,
    access: 'read' | 'write',
  ): string[] {
    return Array.from(new Set(
      filePaths.map((filePath) => this.resolveGitPath(filePath, currentUser, access)),
    ));
  }

  private resolveGitPath(
    filePath: string,
    currentUser: TokenPayload,
    access: 'read' | 'write',
  ): string {
    const trimmedPath = filePath.trim();
    const { targetPath, valid, safeRelPath } = contentService.resolveContentPath(trimmedPath);
    if (!valid || safeRelPath.trim().length === 0) {
      throw new BadRequestException('Invalid file path');
    }
    if (!isMarkdownFile(safeRelPath)) {
      throw new BadRequestException('Git path must reference a markdown document');
    }

    if (!fs.existsSync(targetPath)) {
      throw new NotFoundException('Git path not found');
    }

    if (access === 'write') {
      this.documentAclService.assertCanWriteAbsolutePath(currentUser, targetPath);
    } else {
      this.documentAclService.assertCanReadAbsolutePath(currentUser, targetPath);
    }

    return safeRelPath;
  }
}
