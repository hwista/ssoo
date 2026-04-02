'use client';

import * as React from 'react';
import type { CreatePathResult } from './useEditorCreatePathDialog';
import type { ContentType } from '@/types/content-metadata';

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
}

interface EditorPersistenceState {
  content: string;
  editorContent: string;
  currentFilePath: string | null;
  hasUnsavedChanges: boolean;
  pendingMetadataUpdate: unknown;
  isCreateMode: boolean;
  preferredCreatePath?: string;
  /** 새 문서용 자동 생성 파일명 */
  generatedFileName?: string;
  tabId: string;
  /** 콘텐츠 타입 (문서/템플릿) — 저장 후 흐름 분기에 사용 */
  contentType?: ContentType;
  /** 사이드카 메타데이터 제목 (AI 추천 등) — 저장 모달 제목에 우선 반영 */
  metadataTitle?: string;
}

interface EditorPersistenceActions {
  save: () => Promise<void>;
  storeSaveFile: (path: string, content: string) => Promise<void>;
  resetContent: (content: string) => void;
  discardPendingMetadata: () => Promise<void>;
  setIsEditing: (editing: boolean) => void;
  setMetadataTitle: (title: string) => void;
  updateTab: (tabId: string, patch: { id?: string; path?: string; title?: string }) => void;
  closeTab: (tabId: string) => void;
  onCreatePathResolved?: (path: string) => void;
}

interface EditorPersistenceDeps {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  showSuccess: (title: string, description: string) => void;
  showError: (title: string, description: string) => void;
  requestCreatePath: (preferredPath?: string) => Promise<string | null>;
  requestSaveLocation: (params: {
    suggestedTitle?: string;
    suggestedDirectory?: string;
    fileName: string;
    isNewDocument: boolean;
    contentType?: 'document' | 'template';
  }) => Promise<CreatePathResult | null>;
  /** 저장 직전 콘텐츠 변환 (예: blob URL → 실제 경로 치환) */
  transformBeforeSave?: (content: string) => Promise<string>;
}

export function useEditorPersistence({
  state,
  actions,
  deps,
}: {
  state: EditorPersistenceState;
  actions: EditorPersistenceActions;
  deps: EditorPersistenceDeps;
}) {
  const isTemplate = state.contentType === 'template';

  const handleSave = React.useCallback(async () => {
    // blob URL 등 변환이 필요한 경우 적용
    const finalContent = deps.transformBeforeSave
      ? await deps.transformBeforeSave(state.editorContent)
      : state.editorContent;

    if (state.isCreateMode) {
      // AI 추천 경로에서 디렉토리/제목 분해
      const hint = state.preferredCreatePath?.trim() || '';
      const parts = hint.split('/');
      const nameHint = parts.pop()?.replace(/\.md$/i, '') || '';
      const dirHint = parts.join('/') || (isTemplate ? 'templates/personal' : '');
      const fileName = state.generatedFileName || (isTemplate ? 'new-template.md' : 'new-doc.md');
      // 사이드카 메타데이터 제목이 있으면 경로 파생 이름보다 우선
      const suggestedTitle = state.metadataTitle || nameHint;

      const result = await deps.requestSaveLocation({
        suggestedTitle,
        suggestedDirectory: dirHint,
        fileName,
        isNewDocument: true,
        contentType: state.contentType,
      });
      if (!result) return;

      const resolvedPath = result.path.endsWith('.md') ? result.path : `${result.path}.md`;

      try {
        if (result.title) {
          actions.setMetadataTitle(result.title);
        }
        await actions.storeSaveFile(resolvedPath, finalContent);
        actions.setIsEditing(false);

        if (isTemplate) {
          // 템플릿: 서버가 경로를 자동 결정하므로 탭 경로는 유지
          // 탭 제목만 저장된 이름으로 갱신
          const tabTitle = result.title || resolvedPath.split('/').pop()?.replace(/\.md$/, '') || '템플릿';
          actions.updateTab(state.tabId, { title: tabTitle });
          deps.showSuccess('저장 완료', '템플릿이 저장되었습니다.');
        } else {
          // 문서: 탭을 새 파일 경로로 업데이트
          actions.onCreatePathResolved?.(resolvedPath);
          deps.showSuccess('생성 완료', '새 문서가 생성되었습니다.');
          const newPath = `/doc/${encodeURIComponent(resolvedPath)}`;
          const newTabId = `file-${encodeURIComponent(resolvedPath)}`;
          const tabTitle = result.title || resolvedPath.split('/').pop() || resolvedPath;
          actions.updateTab(state.tabId, { id: newTabId, path: newPath, title: tabTitle });
        }
      } catch {
        const errorMsg = isTemplate
          ? '템플릿 저장 중 오류가 발생했습니다.'
          : '문서 생성 중 오류가 발생했습니다.';
        deps.showError('저장 실패', errorMsg);
      }
      return;
    }

    // 기존 콘텐츠 저장 (템플릿은 templateSaveData.id 존재 시 여기로 진입)
    if (!state.currentFilePath && !isTemplate) {
      deps.showError('저장 실패', '선택된 파일이 없습니다.');
      return;
    }

    try {
      if (isTemplate) {
        // 템플릿 재저장: storeSaveFile이 contentType 기반으로 templateApi 호출
        await actions.storeSaveFile(state.currentFilePath || '__template__', finalContent);
        // 탭 제목을 현재 메타데이터 제목으로 갱신
        if (state.metadataTitle) {
          actions.updateTab(state.tabId, { title: state.metadataTitle });
        }
      } else if (deps.transformBeforeSave) {
        // 변환된 콘텐츠가 있으면 직접 storeSaveFile 호출
        await actions.storeSaveFile(state.currentFilePath!, finalContent);
        actions.resetContent(finalContent);
      } else {
        await actions.save();
      }
      actions.setIsEditing(false);
      const successMsg = isTemplate ? '템플릿이 저장되었습니다.' : '파일이 저장되었습니다.';
      deps.showSuccess('저장 완료', successMsg);
    } catch {
      const errorMsg = isTemplate
        ? '템플릿 저장 중 오류가 발생했습니다.'
        : '파일 저장 중 오류가 발생했습니다.';
      deps.showError('저장 실패', errorMsg);
    }
  }, [actions, deps, state, isTemplate]);

  const handleCancel = React.useCallback(async () => {
    if (state.hasUnsavedChanges || state.pendingMetadataUpdate) {
      const confirmed = await deps.confirm({
        title: '변경사항 폐기',
        description: '저장하지 않은 변경사항이 있습니다. 정말로 진행하시겠습니까?',
        confirmText: '확인',
        cancelText: '돌아가기',
      });
      if (!confirmed) return;
    }

    if (state.isCreateMode) {
      actions.closeTab(state.tabId);
      return;
    }

    actions.resetContent(state.content);
    await actions.discardPendingMetadata();
    actions.setIsEditing(false);
  }, [actions, deps, state]);

  return {
    handleSave,
    handleCancel,
  };
}
