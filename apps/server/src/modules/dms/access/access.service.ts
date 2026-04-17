import { ForbiddenException, Injectable } from '@nestjs/common';
import type { DmsAccessSnapshot, DmsFeatureAccess } from '@ssoo/types/dms';
import { AccessFoundationService } from '../../common/access/access-foundation.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';

const DMS_PERMISSION_CODES = {
  readDocuments: 'dms.document.read',
  writeDocuments: 'dms.document.write',
  manageTemplates: 'dms.template.manage',
  useAssistant: 'dms.assistant.use',
  useSearch: 'dms.search.use',
  manageSettings: 'dms.settings.manage',
  manageStorage: 'dms.storage.manage',
  useGit: 'dms.git.use',
  systemOverride: 'system.override',
} as const;

const FEATURE_ERROR_MESSAGES: Record<DmsFeatureKey, string> = {
  canReadDocuments: '문서를 조회할 권한이 없습니다.',
  canWriteDocuments: '문서를 작성할 권한이 없습니다.',
  canManageTemplates: '템플릿을 관리할 권한이 없습니다.',
  canUseAssistant: 'AI 기능을 사용할 권한이 없습니다.',
  canUseSearch: '검색 기능을 사용할 권한이 없습니다.',
  canManageSettings: '설정 화면에 접근할 권한이 없습니다.',
  canManageStorage: '외부 저장소를 관리할 권한이 없습니다.',
  canUseGit: 'Git 기능을 사용할 권한이 없습니다.',
};

const buildFeatureAccess = (enabled: boolean): DmsFeatureAccess => ({
  canReadDocuments: enabled,
  canWriteDocuments: enabled,
  canManageTemplates: enabled,
  canUseAssistant: enabled,
  canUseSearch: enabled,
  canManageSettings: enabled,
  canManageStorage: enabled,
  canUseGit: enabled,
});

export type DmsFeatureKey = keyof DmsFeatureAccess;

@Injectable()
export class AccessService {
  constructor(private readonly accessFoundationService: AccessFoundationService) {}

  async getAccessSnapshot(user: TokenPayload): Promise<DmsAccessSnapshot> {
    const accessContext = await this.accessFoundationService.resolveActionPermissionContext(user);
    if (accessContext.policy.hasSystemOverride) {
      return {
        isAuthenticated: true,
        features: buildFeatureAccess(true),
        policy: accessContext.policy,
      };
    }

    return {
      isAuthenticated: true,
      features: {
        canReadDocuments: accessContext.grantedPermissionCodes.has(DMS_PERMISSION_CODES.readDocuments),
        canWriteDocuments: accessContext.grantedPermissionCodes.has(DMS_PERMISSION_CODES.writeDocuments),
        canManageTemplates: accessContext.grantedPermissionCodes.has(DMS_PERMISSION_CODES.manageTemplates),
        canUseAssistant: accessContext.grantedPermissionCodes.has(DMS_PERMISSION_CODES.useAssistant),
        canUseSearch: accessContext.grantedPermissionCodes.has(DMS_PERMISSION_CODES.useSearch),
        canManageSettings: accessContext.grantedPermissionCodes.has(DMS_PERMISSION_CODES.manageSettings),
        canManageStorage: accessContext.grantedPermissionCodes.has(DMS_PERMISSION_CODES.manageStorage),
        canUseGit: accessContext.grantedPermissionCodes.has(DMS_PERMISSION_CODES.useGit),
      },
      policy: accessContext.policy,
    };
  }

  async assertFeatures(
    user: TokenPayload,
    requiredFeatures: DmsFeatureKey[],
  ): Promise<DmsAccessSnapshot> {
    const snapshot = await this.getAccessSnapshot(user);
    const deniedFeature = requiredFeatures.find((feature) => !snapshot.features[feature]);

    if (deniedFeature) {
      throw new ForbiddenException(FEATURE_ERROR_MESSAGES[deniedFeature]);
    }

    return snapshot;
  }
}
