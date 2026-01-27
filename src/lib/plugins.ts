// 플러그인 시스템 정의

// 플러그인 메타데이터
export interface PluginMeta {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  icon?: string;
}

// 플러그인 훅 타입
export type PluginHook =
  | 'onContentChange'      // 문서 내용 변경 시
  | 'onFileSave'           // 파일 저장 시
  | 'onFileOpen'           // 파일 열기 시
  | 'onEditorReady'        // 에디터 준비 완료 시
  | 'onRender'             // 렌더링 시
  | 'onToolbarRender';     // 툴바 렌더링 시

// 플러그인 컨텍스트 (플러그인에 전달되는 정보)
export interface PluginContext {
  content: string;
  filePath?: string;
  fileName?: string;
  metadata?: Record<string, unknown>;
}

// 플러그인 결과
export interface PluginResult {
  content?: string;                    // 수정된 컨텐츠
  sidebarWidget?: React.ReactNode;     // 사이드바 위젯
  statusBarWidget?: React.ReactNode;   // 상태바 위젯
  toolbarItems?: ToolbarItem[];        // 툴바 아이템
  metadata?: Record<string, unknown>;  // 메타데이터
}

// 툴바 아이템
export interface ToolbarItem {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  isActive?: boolean;
}

// 플러그인 인터페이스
export interface Plugin {
  meta: PluginMeta;
  hooks: Partial<Record<PluginHook, (context: PluginContext) => PluginResult | Promise<PluginResult>>>;
  activate?: () => void;
  deactivate?: () => void;
}

// 플러그인 상태
export interface PluginState {
  plugin: Plugin;
  enabled: boolean;
  order: number;
}

// 플러그인 매니저 클래스
class PluginManager {
  private plugins: Map<string, PluginState> = new Map();
  private listeners: Map<PluginHook, Set<string>> = new Map();

  // 플러그인 등록
  register(plugin: Plugin): boolean {
    if (this.plugins.has(plugin.meta.id)) {
      console.warn(`플러그인 "${plugin.meta.id}"이(가) 이미 등록되어 있습니다.`);
      return false;
    }

    this.plugins.set(plugin.meta.id, {
      plugin,
      enabled: true,
      order: this.plugins.size
    });

    // 훅 리스너 등록
    for (const hook of Object.keys(plugin.hooks) as PluginHook[]) {
      if (!this.listeners.has(hook)) {
        this.listeners.set(hook, new Set());
      }
      this.listeners.get(hook)!.add(plugin.meta.id);
    }

    // 활성화 콜백 실행
    if (plugin.activate) {
      plugin.activate();
    }

    return true;
  }

  // 플러그인 해제
  unregister(pluginId: string): boolean {
    const state = this.plugins.get(pluginId);
    if (!state) {
      return false;
    }

    // 비활성화 콜백 실행
    if (state.plugin.deactivate) {
      state.plugin.deactivate();
    }

    // 훅 리스너 제거
    for (const listeners of this.listeners.values()) {
      listeners.delete(pluginId);
    }

    this.plugins.delete(pluginId);
    return true;
  }

  // 플러그인 활성화/비활성화
  setEnabled(pluginId: string, enabled: boolean): boolean {
    const state = this.plugins.get(pluginId);
    if (!state) {
      return false;
    }

    state.enabled = enabled;

    if (enabled && state.plugin.activate) {
      state.plugin.activate();
    } else if (!enabled && state.plugin.deactivate) {
      state.plugin.deactivate();
    }

    return true;
  }

  // 훅 실행
  async executeHook(hook: PluginHook, context: PluginContext): Promise<PluginResult[]> {
    const results: PluginResult[] = [];
    const listenerIds = this.listeners.get(hook);

    if (!listenerIds) {
      return results;
    }

    // 순서대로 실행
    const sortedPlugins = Array.from(listenerIds)
      .map(id => this.plugins.get(id))
      .filter((state): state is PluginState => state !== undefined && state.enabled)
      .sort((a, b) => a.order - b.order);

    for (const state of sortedPlugins) {
      const hookFn = state.plugin.hooks[hook];
      if (hookFn) {
        try {
          const result = await hookFn(context);
          results.push(result);

          // 컨텐츠가 수정되었다면 다음 플러그인에 전달
          if (result.content) {
            context = { ...context, content: result.content };
          }
        } catch (error) {
          console.error(`플러그인 "${state.plugin.meta.id}" 훅 실행 오류:`, error);
        }
      }
    }

    return results;
  }

  // 등록된 플러그인 목록
  getPlugins(): PluginState[] {
    return Array.from(this.plugins.values());
  }

  // 특정 플러그인 조회
  getPlugin(pluginId: string): PluginState | undefined {
    return this.plugins.get(pluginId);
  }

  // 플러그인 순서 변경
  setOrder(pluginId: string, order: number): boolean {
    const state = this.plugins.get(pluginId);
    if (!state) {
      return false;
    }
    state.order = order;
    return true;
  }
}

// 싱글톤 인스턴스
export const pluginManager = new PluginManager();

// ================================
// 기본 제공 플러그인
// ================================

// 1. 단어 수 카운터 플러그인
export const wordCountPlugin: Plugin = {
  meta: {
    id: 'word-count',
    name: '단어 수 카운터',
    version: '1.0.0',
    description: '문서의 단어 수, 문자 수, 줄 수를 표시합니다',
    icon: '📊'
  },
  hooks: {
    onContentChange: (context) => {
      const content = context.content || '';
      const words = content.trim().split(/\s+/).filter(w => w.length > 0).length;
      const chars = content.length;
      const charsNoSpaces = content.replace(/\s/g, '').length;
      const lines = content.split('\n').length;

      return {
        metadata: {
          wordCount: words,
          charCount: chars,
          charCountNoSpaces: charsNoSpaces,
          lineCount: lines
        }
      };
    }
  }
};

// 2. 읽기 시간 계산 플러그인
export const readingTimePlugin: Plugin = {
  meta: {
    id: 'reading-time',
    name: '읽기 시간',
    version: '1.0.0',
    description: '예상 읽기 시간을 계산합니다',
    icon: '⏱️'
  },
  hooks: {
    onContentChange: (context) => {
      const content = context.content || '';
      const words = content.trim().split(/\s+/).filter(w => w.length > 0).length;
      // 평균 읽기 속도: 분당 200단어 (한국어 기준)
      const minutes = Math.ceil(words / 200);

      return {
        metadata: {
          readingTime: minutes,
          readingTimeText: minutes < 1 ? '1분 미만' : `약 ${minutes}분`
        }
      };
    }
  }
};

// 3. 헤딩 목차 추출 플러그인
export const tocPlugin: Plugin = {
  meta: {
    id: 'toc',
    name: '목차 추출',
    version: '1.0.0',
    description: '마크다운 헤딩을 기반으로 목차를 생성합니다',
    icon: '📑'
  },
  hooks: {
    onContentChange: (context) => {
      const content = context.content || '';
      const headingRegex = /^(#{1,6})\s+(.+)$/gm;
      const toc: { level: number; text: string; id: string }[] = [];

      let match;
      while ((match = headingRegex.exec(content)) !== null) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = text.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-');

        toc.push({ level, text, id });
      }

      return {
        metadata: {
          toc,
          hasHeadings: toc.length > 0
        }
      };
    }
  }
};

// 4. 링크 추출 플러그인
export const linkExtractorPlugin: Plugin = {
  meta: {
    id: 'link-extractor',
    name: '링크 추출',
    version: '1.0.0',
    description: '문서 내 모든 링크를 추출합니다',
    icon: '🔗'
  },
  hooks: {
    onContentChange: (context) => {
      const content = context.content || '';

      // 마크다운 링크 추출
      const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      const links: { text: string; url: string; type: 'internal' | 'external' }[] = [];

      let match;
      while ((match = mdLinkRegex.exec(content)) !== null) {
        const text = match[1];
        const url = match[2];
        const type = url.startsWith('http') ? 'external' : 'internal';
        links.push({ text, url, type });
      }

      // 일반 URL 추출
      const urlRegex = /https?:\/\/[^\s)]+/g;
      while ((match = urlRegex.exec(content)) !== null) {
        const url = match[0];
        if (!links.some(l => l.url === url)) {
          links.push({ text: url, url, type: 'external' });
        }
      }

      return {
        metadata: {
          links,
          linkCount: links.length,
          externalLinkCount: links.filter(l => l.type === 'external').length,
          internalLinkCount: links.filter(l => l.type === 'internal').length
        }
      };
    }
  }
};

// 5. 코드 블록 통계 플러그인
export const codeStatsPlugin: Plugin = {
  meta: {
    id: 'code-stats',
    name: '코드 블록 통계',
    version: '1.0.0',
    description: '문서 내 코드 블록 통계를 제공합니다',
    icon: '💻'
  },
  hooks: {
    onContentChange: (context) => {
      const content = context.content || '';

      // 코드 블록 추출 (``` 또는 ~~~)
      const codeBlockRegex = /```(\w*)\n[\s\S]*?```|~~~(\w*)\n[\s\S]*?~~~/g;
      const codeBlocks: { language: string; lineCount: number }[] = [];

      let match;
      while ((match = codeBlockRegex.exec(content)) !== null) {
        const language = match[1] || match[2] || 'plaintext';
        const block = match[0];
        const lineCount = block.split('\n').length - 2; // 시작/끝 ``` 제외

        codeBlocks.push({ language, lineCount });
      }

      // 언어별 통계
      const languageStats: Record<string, number> = {};
      for (const block of codeBlocks) {
        languageStats[block.language] = (languageStats[block.language] || 0) + 1;
      }

      return {
        metadata: {
          codeBlocks,
          codeBlockCount: codeBlocks.length,
          totalCodeLines: codeBlocks.reduce((sum, b) => sum + b.lineCount, 0),
          languageStats
        }
      };
    }
  }
};

// 기본 플러그인 등록
export function registerDefaultPlugins(): void {
  pluginManager.register(wordCountPlugin);
  pluginManager.register(readingTimePlugin);
  pluginManager.register(tocPlugin);
  pluginManager.register(linkExtractorPlugin);
  pluginManager.register(codeStatsPlugin);
}
