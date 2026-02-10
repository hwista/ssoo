import { apiClient } from '../client';
import { ApiResponse, PaginatedResponse, ListParams } from '../types';

/**
 * 프로젝트 상태 코드
 */
export type ProjectStatusCode = 'request' | 'proposal' | 'execution' | 'transition';

/**
 * 프로젝트 단계 코드
 */
export type ProjectStageCode = 'waiting' | 'in_progress' | 'done';

/**
 * 프로젝트 소스 코드
 */
export type ProjectDoneResultCode =
  | 'accepted'
  | 'rejected'
  | 'won'
  | 'lost'
  | 'completed'
  | 'cancelled'
  | 'transferred'
  | 'hold';

/**
 * 프로젝트 DTO
 */
export interface Project {
  id: number;
  projectName: string;
  statusCode: ProjectStatusCode;
  stageCode: ProjectStageCode;
  doneResultCode?: ProjectDoneResultCode;
  customerId?: number;
  currentOwnerUserId?: number;
  memo?: string | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  requestDetail?: ProjectRequestDetail | null;
}

export interface ProjectRequestDetail {
  requestSourceCode?: string | null;
  requestChannelCode?: string | null;
  requestSummary?: string | null;
  requestReceivedAt?: string | null;
  requestPriorityCode?: string | null;
  requestOwnerUserId?: number | string | null;
  memo?: string | null;
}

/**
 * 프로젝트 생성 요청
 */
export interface CreateProjectRequest {
  projectName: string;
  statusCode?: ProjectStatusCode;
  stageCode?: ProjectStageCode;
  customerId?: number;
  description?: string;
}

/**
 * 프로젝트 수정 요청
 */
export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {
  doneResultCode?: ProjectDoneResultCode;
}

/**
 * 프로젝트 필터
 */
export interface ProjectFilters extends ListParams {
  statusCode?: ProjectStatusCode;
  stageCode?: ProjectStageCode;
  customerId?: number;
}

interface ProjectListApiResponse {
  success: boolean;
  data?: Project[];
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
}

/**
 * 프로젝트 API
 */
export const projectsApi = {
  /**
   * 프로젝트 목록 조회
   */
  list: async (params?: ProjectFilters): Promise<ApiResponse<PaginatedResponse<Project>>> => {
    const requestParams = params
      ? {
          ...params,
          ...(params.pageSize !== undefined && { limit: params.pageSize }),
        }
      : undefined;
    const response = await apiClient.get<ProjectListApiResponse>('/projects', {
      params: requestParams,
    });

    if (!response.data.success || !response.data.data || !response.data.meta) {
      return {
        success: false,
        data: null,
        message: response.data.error?.message || '요청 처리 중 오류가 발생했습니다.',
      };
    }

    const pageSize = response.data.meta.limit || params?.pageSize || 10;
    const totalPages = pageSize ? Math.ceil(response.data.meta.total / pageSize) : 0;

    return {
      success: true,
      data: {
        items: response.data.data,
        total: response.data.meta.total,
        page: response.data.meta.page,
        pageSize,
        totalPages,
      },
      message: response.data.message || '',
    };
  },

  /**
   * 프로젝트 상세 조회
   */
  getById: async (id: number): Promise<ApiResponse<Project>> => {
    const response = await apiClient.get<ApiResponse<Project>>(`/projects/${id}`);
    return response.data;
  },

  /**
   * 프로젝트 생성
   */
  create: async (data: CreateProjectRequest): Promise<ApiResponse<Project>> => {
    const response = await apiClient.post<ApiResponse<Project>>('/projects', data);
    return response.data;
  },

  /**
   * 프로젝트 수정
   */
  update: async (id: number, data: UpdateProjectRequest): Promise<ApiResponse<Project>> => {
    const response = await apiClient.put<ApiResponse<Project>>(`/projects/${id}`, data);
    return response.data;
  },

  /**
   * 프로젝트 삭제
   */
  delete: async (id: number): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/projects/${id}`);
    return response.data;
  },
};
