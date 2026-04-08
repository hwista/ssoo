import { Injectable } from '@nestjs/common';
import type { DmsAccessSnapshot } from '@ssoo/types/dms';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';

@Injectable()
export class AccessService {
  getAccessSnapshot(_user: TokenPayload): DmsAccessSnapshot {
    return {
      isAuthenticated: true,
      features: {
        canReadDocuments: true,
        canWriteDocuments: true,
        canManageTemplates: true,
        canUseAssistant: true,
        canUseSearch: true,
        canManageSettings: true,
        canManageStorage: true,
        canUseGit: true,
      },
    };
  }
}
