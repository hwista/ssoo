import { createSharedAxiosApiClient, SharedApiError } from '@ssoo/web-auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export { SharedApiError as ApiError };

export const apiClient = createSharedAxiosApiClient({
  baseURL: API_BASE_URL,
  defaultErrorMessage: '요청 실패',
});
