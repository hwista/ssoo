import type { AccessInspectionResult } from '@ssoo/types/common';
import { apiClient } from '../client';
import type { ApiResponse } from '../types';

export interface InspectAccessParams {
  userId?: string;
  loginId?: string;
  targetObjectType?: string;
  targetObjectId?: string;
  domainPermissionCodes?: string;
  includeInactive?: boolean;
}

export const accessOpsApi = {
  inspect: async (params: InspectAccessParams) => {
    const response = await apiClient.get<ApiResponse<AccessInspectionResult>>('/access/ops/inspect', {
      params,
    });
    if (!response.data.data) {
      throw new Error('권한 inspect 응답이 비어 있습니다.');
    }

    return response.data.data;
  },
};
