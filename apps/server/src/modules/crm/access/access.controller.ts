import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { success } from '../../../common/index.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CrmAccessService } from './access.service.js';

@ApiTags('crm-access')
@ApiBearerAuth()
@Controller('crm/access')
@UseGuards(RolesGuard)
export class CrmAccessController {
  constructor(private readonly accessService: CrmAccessService) {}

  @Get('me')
  @ApiOperation({ summary: 'CRM 계약·계획·원가·보고·공급자 설정 전역 접근 스냅샷' })
  @ApiOkResponse({ description: '공용 permission resolution 기반 CRM 도메인 접근 스냅샷' })
  @ApiQuery({ name: 'ownerOrganizationId', required: false, type: String, description: '대상 업무 조직 ID' })
  async myAccess(@CurrentUser() currentUser: TokenPayload, @Query('ownerOrganizationId') organizationId?: string) {
    const scope = organizationId ? await this.accessService.resolveReadOrganization(currentUser, organizationId) : undefined;
    return success(await this.accessService.getDomainAccess(currentUser, scope));
  }
}
