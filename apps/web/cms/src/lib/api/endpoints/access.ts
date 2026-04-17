import type { CmsAccessSnapshot } from '@ssoo/types/cms';
import { apiClient } from '../client';
import type { ApiResponse } from '../types';

export const accessApi = {
  me: () => apiClient.get<ApiResponse<CmsAccessSnapshot>>('/cms/access/me'),
};
