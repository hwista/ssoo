import { NextRequest, NextResponse } from 'next/server';
import {
  pluginManager,
  registerDefaultPlugins,
  PluginContext,
  PluginHook
} from '@/lib/plugins';

// 기본 플러그인 등록 (서버 시작 시 한 번만)
let initialized = false;
function ensureInitialized() {
  if (!initialized) {
    registerDefaultPlugins();
    initialized = true;
  }
}

// 플러그인 목록 조회
export async function GET(request: NextRequest) {
  try {
    ensureInitialized();

    const { searchParams } = new URL(request.url);
    const pluginId = searchParams.get('id');

    // 특정 플러그인 조회
    if (pluginId) {
      const plugin = pluginManager.getPlugin(pluginId);
      if (!plugin) {
        return NextResponse.json(
          { error: '플러그인을 찾을 수 없습니다' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        plugin: {
          ...plugin.plugin.meta,
          enabled: plugin.enabled,
          order: plugin.order,
          hooks: Object.keys(plugin.plugin.hooks)
        }
      });
    }

    // 전체 플러그인 목록
    const plugins = pluginManager.getPlugins().map(state => ({
      ...state.plugin.meta,
      enabled: state.enabled,
      order: state.order,
      hooks: Object.keys(state.plugin.hooks)
    }));

    return NextResponse.json({
      success: true,
      plugins,
      totalPlugins: plugins.length
    });

  } catch (error) {
    console.error('플러그인 조회 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '플러그인 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 플러그인 훅 실행 / 설정 변경
export async function POST(request: NextRequest) {
  try {
    ensureInitialized();

    const body = await request.json();
    const { action, pluginId, hook, context, enabled, order } = body;

    // 훅 실행
    if (action === 'executeHook' && hook && context) {
      const results = await pluginManager.executeHook(
        hook as PluginHook,
        context as PluginContext
      );

      // 메타데이터 병합
      const mergedMetadata: Record<string, unknown> = {};
      for (const result of results) {
        if (result.metadata) {
          Object.assign(mergedMetadata, result.metadata);
        }
      }

      return NextResponse.json({
        success: true,
        results,
        metadata: mergedMetadata
      });
    }

    // 플러그인 활성화/비활성화
    if (action === 'setEnabled' && pluginId !== undefined && enabled !== undefined) {
      const success = pluginManager.setEnabled(pluginId, enabled);

      if (!success) {
        return NextResponse.json(
          { error: '플러그인을 찾을 수 없습니다' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: enabled ? '플러그인이 활성화되었습니다' : '플러그인이 비활성화되었습니다',
        pluginId,
        enabled
      });
    }

    // 플러그인 순서 변경
    if (action === 'setOrder' && pluginId && order !== undefined) {
      const success = pluginManager.setOrder(pluginId, order);

      if (!success) {
        return NextResponse.json(
          { error: '플러그인을 찾을 수 없습니다' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '플러그인 순서가 변경되었습니다',
        pluginId,
        order
      });
    }

    return NextResponse.json(
      { error: '알 수 없는 액션입니다' },
      { status: 400 }
    );

  } catch (error) {
    console.error('플러그인 작업 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '플러그인 작업 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
