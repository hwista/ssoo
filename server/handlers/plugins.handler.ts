/**
 * 플러그인 핸들러
 * @description 플러그인 관리 (조회, 훅 실행, 활성화/비활성화)
 */

import {
  pluginManager,
  registerDefaultPlugins,
  PluginContext,
  PluginHook
} from '@/lib/plugins';

// ============================================================================
// Types
// ============================================================================

export type HandlerResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: number };

interface PluginInfo {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  order: number;
  hooks: string[];
  [key: string]: unknown;
}

interface PluginListResponse {
  plugins: PluginInfo[];
  totalPlugins: number;
}

interface SinglePluginResponse {
  plugin: PluginInfo;
}

interface HookExecutionResponse {
  results: unknown[];
  metadata: Record<string, unknown>;
}

interface EnabledResponse {
  message: string;
  pluginId: string;
  enabled: boolean;
}

interface OrderResponse {
  message: string;
  pluginId: string;
  order: number;
}

// ============================================================================
// Initialization
// ============================================================================

let initialized = false;
function ensureInitialized() {
  if (!initialized) {
    registerDefaultPlugins();
    initialized = true;
  }
}

// ============================================================================
// GET Handler - 플러그인 목록 조회
// ============================================================================

export async function getPlugins(params: {
  id?: string;
}): Promise<HandlerResult<PluginListResponse | SinglePluginResponse>> {
  try {
    ensureInitialized();

    const { id } = params;

    // 특정 플러그인 조회
    if (id) {
      const plugin = pluginManager.getPlugin(id);
      if (!plugin) {
        return {
          success: false,
          error: '플러그인을 찾을 수 없습니다',
          status: 404
        };
      }

      return {
        success: true,
        data: {
          plugin: {
            ...plugin.plugin.meta,
            enabled: plugin.enabled,
            order: plugin.order,
            hooks: Object.keys(plugin.plugin.hooks)
          }
        }
      };
    }

    // 전체 플러그인 목록
    const plugins = pluginManager.getPlugins().map(state => ({
      ...state.plugin.meta,
      enabled: state.enabled,
      order: state.order,
      hooks: Object.keys(state.plugin.hooks)
    }));

    return {
      success: true,
      data: {
        plugins,
        totalPlugins: plugins.length
      }
    };

  } catch (error) {
    console.error('플러그인 조회 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '플러그인 조회 중 오류가 발생했습니다',
      status: 500
    };
  }
}

// ============================================================================
// POST Handler - 플러그인 훅 실행 / 설정 변경
// ============================================================================

type PluginAction = 'executeHook' | 'setEnabled' | 'setOrder';

export async function handlePluginAction(body: {
  action?: PluginAction;
  pluginId?: string;
  hook?: string;
  context?: PluginContext;
  enabled?: boolean;
  order?: number;
}): Promise<HandlerResult<HookExecutionResponse | EnabledResponse | OrderResponse>> {
  try {
    ensureInitialized();

    const { action, pluginId, hook, context, enabled, order } = body;

    // 훅 실행
    if (action === 'executeHook' && hook && context) {
      const results = await pluginManager.executeHook(
        hook as PluginHook,
        context
      );

      // 메타데이터 병합
      const mergedMetadata: Record<string, unknown> = {};
      for (const result of results) {
        if (result.metadata) {
          Object.assign(mergedMetadata, result.metadata);
        }
      }

      return {
        success: true,
        data: {
          results,
          metadata: mergedMetadata
        }
      };
    }

    // 플러그인 활성화/비활성화
    if (action === 'setEnabled' && pluginId !== undefined && enabled !== undefined) {
      const success = pluginManager.setEnabled(pluginId, enabled);

      if (!success) {
        return {
          success: false,
          error: '플러그인을 찾을 수 없습니다',
          status: 404
        };
      }

      return {
        success: true,
        data: {
          message: enabled ? '플러그인이 활성화되었습니다' : '플러그인이 비활성화되었습니다',
          pluginId,
          enabled
        }
      };
    }

    // 플러그인 순서 변경
    if (action === 'setOrder' && pluginId && order !== undefined) {
      const success = pluginManager.setOrder(pluginId, order);

      if (!success) {
        return {
          success: false,
          error: '플러그인을 찾을 수 없습니다',
          status: 404
        };
      }

      return {
        success: true,
        data: {
          message: '플러그인 순서가 변경되었습니다',
          pluginId,
          order
        }
      };
    }

    return {
      success: false,
      error: '알 수 없는 액션입니다',
      status: 400
    };

  } catch (error) {
    console.error('플러그인 작업 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '플러그인 작업 중 오류가 발생했습니다',
      status: 500
    };
  }
}
