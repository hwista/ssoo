import {
  SSOO_APP_ICON_DESCRIPTOR,
  SSOO_APP_ICON_PATH,
  type SsooAppIconDescriptor,
} from './app-icon';

export type SsooAppKey = 'admin' | 'crm' | 'pms' | 'dms' | 'sns';

export interface SsooAppIdentity {
  key: SsooAppKey;
  productName: 'SSOT';
  appName: string;
  browserTitle: string;
  brandTitle: string;
  description: string;
}

export interface SsooAppMetadata {
  title: string;
  description: string;
  icons: {
    icon: SsooAppIconDescriptor[];
    shortcut: string[];
  };
}

export const SSOO_APP_IDENTITIES: Record<SsooAppKey, SsooAppIdentity> = {
  admin: {
    key: 'admin',
    productName: 'SSOT',
    appName: 'Platform',
    browserTitle: 'SSOT Platform',
    brandTitle: 'SSOT Platform',
    description: 'SSOT 플랫폼 관리 허브',
  },
  crm: {
    key: 'crm',
    productName: 'SSOT',
    appName: 'Sales',
    browserTitle: 'SSOT Sales',
    brandTitle: 'SSOT Sales',
    description: 'SSOT 영업기회 워크스페이스',
  },
  pms: {
    key: 'pms',
    productName: 'SSOT',
    appName: 'Project',
    browserTitle: 'SSOT Project',
    brandTitle: 'SSOT Project',
    description: 'SI/SM 조직의 Opportunity-Project-System 통합 업무 허브',
  },
  dms: {
    key: 'dms',
    productName: 'SSOT',
    appName: 'Document',
    browserTitle: 'SSOT Document',
    brandTitle: 'SSOT Document',
    description: '위키, 시스템 개발문서, 블로그 통합 문서 관리 시스템',
  },
  sns: {
    key: 'sns',
    productName: 'SSOT',
    appName: 'Connect',
    browserTitle: 'SSOT Connect',
    brandTitle: 'SSOT Connect',
    description: 'SSOT 사용자 소셜 허브',
  },
};

export function getSsooAppIdentity(appKey: SsooAppKey): SsooAppIdentity {
  return SSOO_APP_IDENTITIES[appKey];
}

export function getSsooAppMetadata(appKey: SsooAppKey): SsooAppMetadata {
  const identity = getSsooAppIdentity(appKey);

  return {
    title: identity.browserTitle,
    description: identity.description,
    icons: {
      icon: [SSOO_APP_ICON_DESCRIPTOR],
      shortcut: [SSOO_APP_ICON_PATH],
    },
  };
}
