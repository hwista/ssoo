import type { SnsAccessSnapshot } from '@ssoo/types/sns';
import { apiClient } from '../client';
import type { ApiResponse } from '../types';

export const accessApi = {
  me: () => apiClient.get<ApiResponse<SnsAccessSnapshot>>('/sns/access/me'),
};
