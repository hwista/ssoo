import { apiClient } from '../client';
import type { ApiResponse } from '../types';

export interface BusinessOrganizationOption { id: string; name: string }

export const onboardingApi = {
  async businessOrganizations() {
    const response = await apiClient.get<ApiResponse<BusinessOrganizationOption[]>>('/onboarding/business-organizations', { params: { service: 'pms' } });
    return response.data;
  },
};
