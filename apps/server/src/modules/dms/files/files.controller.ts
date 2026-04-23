import { Controller, Get, UseGuards } from '@nestjs/common';
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
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { DocumentAclService } from '../access/document-acl.service.js';
import { AccessRequestService } from '../access/access-request.service.js';
import { DocumentControlPlaneService } from '../access/document-control-plane.service.js';
import { DmsFeatureGuard } from '../access/dms-feature.guard.js';
import { RequireDmsFeature } from '../access/require-dms-feature.decorator.js';

@ApiTags('dms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, DmsFeatureGuard)
@RequireDmsFeature('canReadDocuments')
@Controller('dms/files')
export class FilesController {
  constructor(
    private readonly documentAclService: DocumentAclService,
    private readonly accessRequestService: AccessRequestService,
    private readonly documentControlPlaneService: DocumentControlPlaneService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'DMS 파일 트리 조회' })
  @ApiOkResponse({ description: '파일 트리 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  @ApiUnauthorizedResponse({ type: ApiError, description: '인증 필요' })
  async getFileTree(@CurrentUser() currentUser: TokenPayload) {
    await this.accessRequestService.ensureRepoControlPlaneSynced();
    const documents = await this.documentControlPlaneService.listActiveDocuments();
    const projectedDocuments = documents.map((document) => this.documentControlPlaneService.projectMetadata(document));
    const tree = this.documentControlPlaneService.buildFileTree(projectedDocuments);

    return success(this.documentAclService.filterFileTree(currentUser, tree));
  }
}
