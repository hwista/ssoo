'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Apps24Regular,
  ToggleLeft24Regular,
  ToggleRight24Filled,
  Info24Regular,
  ArrowUp24Regular,
  ArrowDown24Regular
} from '@fluentui/react-icons';

interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  icon?: string;
  enabled: boolean;
  order: number;
  hooks: string[];
}

interface PluginManagerProps {
  onClose?: () => void;
}

export default function PluginManager({ onClose }: PluginManagerProps) {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlugin, setSelectedPlugin] = useState<PluginInfo | null>(null);

  // 플러그인 목록 로드
  const loadPlugins = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/plugins');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '플러그인 목록 로드 실패');
      }

      setPlugins(data.plugins.sort((a: PluginInfo, b: PluginInfo) => a.order - b.order));
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  // 플러그인 활성화/비활성화
  const togglePlugin = async (pluginId: string, currentEnabled: boolean) => {
    try {
      const response = await fetch('/api/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setEnabled',
          pluginId,
          enabled: !currentEnabled
        })
      });

      const data = await response.json();
      if (data.success) {
        setPlugins(plugins.map(p =>
          p.id === pluginId ? { ...p, enabled: !currentEnabled } : p
        ));
      }
    } catch (error) {
      console.error('플러그인 토글 오류:', error);
    }
  };

  // 플러그인 순서 변경
  const movePlugin = async (pluginId: string, direction: 'up' | 'down') => {
    const index = plugins.findIndex(p => p.id === pluginId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= plugins.length) return;

    try {
      await fetch('/api/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setOrder',
          pluginId,
          order: newIndex
        })
      });

      // 로컬 상태 업데이트
      const newPlugins = [...plugins];
      [newPlugins[index], newPlugins[newIndex]] = [newPlugins[newIndex], newPlugins[index]];
      newPlugins.forEach((p, i) => p.order = i);
      setPlugins(newPlugins);
    } catch (error) {
      console.error('플러그인 순서 변경 오류:', error);
    }
  };

  // 훅 이름을 한글로 변환
  const getHookLabel = (hook: string): string => {
    const labels: Record<string, string> = {
      onContentChange: '내용 변경',
      onFileSave: '파일 저장',
      onFileOpen: '파일 열기',
      onEditorReady: '에디터 준비',
      onRender: '렌더링',
      onToolbarRender: '툴바 렌더링'
    };
    return labels[hook] || hook;
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <h2 className="text-lg font-semibold flex items-center gap-2 dark:text-white">
          <Apps24Regular />
          플러그인 관리
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            ✕
          </button>
        )}
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-hidden flex">
        {/* 플러그인 목록 */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              플러그인 로딩 중...
            </div>
          ) : error ? (
            <div className="text-center text-red-500 py-8">{error}</div>
          ) : plugins.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              등록된 플러그인이 없습니다
            </div>
          ) : (
            <div className="space-y-3">
              {plugins.map((plugin, index) => (
                <div
                  key={plugin.id}
                  className={`p-4 border rounded-lg transition-colors cursor-pointer ${
                    selectedPlugin?.id === plugin.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  } ${!plugin.enabled ? 'opacity-60' : ''}`}
                  onClick={() => setSelectedPlugin(plugin)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{plugin.icon || '🔌'}</span>
                      <div>
                        <h3 className="font-medium dark:text-white">
                          {plugin.name}
                          <span className="ml-2 text-xs text-gray-400">
                            v{plugin.version}
                          </span>
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {plugin.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* 순서 변경 버튼 */}
                      <div className="flex flex-col">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            movePlugin(plugin.id, 'up');
                          }}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                        >
                          <ArrowUp24Regular className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            movePlugin(plugin.id, 'down');
                          }}
                          disabled={index === plugins.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                        >
                          <ArrowDown24Regular className="w-4 h-4" />
                        </button>
                      </div>

                      {/* 토글 버튼 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlugin(plugin.id, plugin.enabled);
                        }}
                        className={`p-1 rounded ${
                          plugin.enabled
                            ? 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                            : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {plugin.enabled ? (
                          <ToggleRight24Filled className="w-6 h-6" />
                        ) : (
                          <ToggleLeft24Regular className="w-6 h-6" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 훅 태그 */}
                  <div className="flex flex-wrap gap-1 mt-3">
                    {plugin.hooks.map(hook => (
                      <span
                        key={hook}
                        className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                      >
                        {getHookLabel(hook)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 상세 정보 패널 */}
        {selectedPlugin && (
          <div className="w-80 border-l dark:border-gray-700 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center gap-2 mb-4">
              <Info24Regular className="text-blue-500" />
              <h3 className="font-medium dark:text-white">플러그인 정보</h3>
            </div>

            <div className="space-y-4 text-sm">
              <div className="text-center py-4">
                <span className="text-4xl">{selectedPlugin.icon || '🔌'}</span>
                <h4 className="font-medium mt-2 dark:text-white">{selectedPlugin.name}</h4>
                <p className="text-gray-500 dark:text-gray-400">v{selectedPlugin.version}</p>
              </div>

              <div>
                <label className="text-gray-500 dark:text-gray-400">설명</label>
                <p className="mt-1 dark:text-gray-200">{selectedPlugin.description}</p>
              </div>

              {selectedPlugin.author && (
                <div>
                  <label className="text-gray-500 dark:text-gray-400">제작자</label>
                  <p className="mt-1 dark:text-gray-200">{selectedPlugin.author}</p>
                </div>
              )}

              <div>
                <label className="text-gray-500 dark:text-gray-400">ID</label>
                <p className="mt-1 font-mono text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded dark:text-gray-200">
                  {selectedPlugin.id}
                </p>
              </div>

              <div>
                <label className="text-gray-500 dark:text-gray-400">지원 훅</label>
                <div className="mt-2 space-y-1">
                  {selectedPlugin.hooks.map(hook => (
                    <div
                      key={hook}
                      className="flex items-center gap-2 text-gray-700 dark:text-gray-300"
                    >
                      <span className="w-2 h-2 bg-blue-500 rounded-full" />
                      {getHookLabel(hook)}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-500 dark:text-gray-400">상태</label>
                <p className={`mt-1 ${selectedPlugin.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                  {selectedPlugin.enabled ? '✓ 활성화됨' : '○ 비활성화됨'}
                </p>
              </div>

              <div>
                <label className="text-gray-500 dark:text-gray-400">실행 순서</label>
                <p className="mt-1 dark:text-gray-200">{selectedPlugin.order + 1}번째</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
