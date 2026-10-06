import { BadRequestException, Injectable } from '@nestjs/common';
import type { DocumentVisibility } from '@ssoo/types/dms';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { PlatformAdmissionService } from '../../common/onboarding/platform-admission.service.js';

@Injectable()
export class DocumentVisibilityService {
  constructor(private readonly admission: PlatformAdmissionService) {}

  async resolve(user: TokenPayload, value: unknown): Promise<DocumentVisibility> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('문서 공개 범위를 지정해 주세요.');
    }
    const { scope, targetOrgId } = value as Record<string, unknown>;
    if (scope !== 'self' && scope !== 'organization' && scope !== 'public') {
      throw new BadRequestException('지원하지 않는 문서 공개 범위입니다.');
    }
    if (scope !== 'organization') return { scope };
    if (targetOrgId !== undefined && typeof targetOrgId !== 'string') {
      throw new BadRequestException('공개 대상 조직을 선택해 주세요.');
    }
    const orgId = await this.admission.resolveBusinessOrganization(BigInt(user.userId), 'dms', targetOrgId);
    return { scope, targetOrgId: orgId.toString() };
  }
}
