'use client';

import * as React from 'react';
import { templateApi } from '@/lib/api';
import type { TemplateScope } from '@/types/template';
import type { CreatePathResult } from './useEditorCreatePathDialog';

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
  templateSaveEnabled: boolean;
  templateSaveDraft?: {
    name: string;
    description: string;
    scope: TemplateScope;
  };
  tabId: string;
}

interface EditorPersistenceActions {
  save: () => Promise<void>;
  storeSaveFile: (path: string, content: string) => Promise<void>;
  resetContent: (content: string) => void;
  discardPendingMetadata: () => Promise<void>;
  setIsEditing: (editing: boolean) => void;
  setMetadataTitle: (title: string) => void;
  updateTab: (tabId: string, patch: { path: string; title: string }) => void;
  closeTab: (tabId: string) => void;
  onCreatePathResolved?: (path: string) => void;
  onTemplateSaved?: () => void;
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
  }) => Promise<CreatePathResult | null>;
}

function deriveTemplateName(params: {
  editorContent: string;
  currentFilePath: string | null;
  preferredCreatePath?: string;
}) {
  const heading = params.editorContent.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading;

  const pathSource = params.currentFilePath || params.preferredCreatePath || '';
  const fileName = pathSource.split('/').pop()?.replace(/\.md$/i, '').trim();
  if (fileName) return fileName;

  return '새 템플릿';
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
  const handleSave = React.useCallback(async () => {
    if (state.templateSaveEnabled) {
      const name = state.templateSaveDraft?.name.trim() || deriveTemplateName({
        editorContent: state.editorContent,
        currentFilePath: state.currentFilePath,
        preferredCreatePath: state.preferredCreatePath,
      });

      if (!state.editorContent.trim()) {
        deps.showError('저장 실패', '비어 있는 문서는 템플릿으로 저장할 수 없습니다.');
        return;
      }

      try {
        const response = await templateApi.upsert({
          name,
          description: state.templateSaveDraft?.description.trim() || '',
          scope: state.templateSaveDraft?.scope ?? 'personal',
          kind: 'document',
          content: state.editorContent,
        });

        if (!response.success) {
          deps.showError('저장 실패', response.error || '템플릿 저장 중 오류가 발생했습니다.');
          return;
        }

        actions.onTemplateSaved?.();
        deps.showSuccess('템플릿 저장 완료', `'${name}' 템플릿이 저장되었습니다. 문서는 위키에 저장되지 않았습니다.`);
      } catch {
        deps.showError('저장 실패', '템플릿 저장 중 오류가 발생했습니다.');
      }
      return;
    }

    if (state.isCreateMode) {
      // AI 추천 경로에서 디렉토리/제목 분해
      const hint = state.preferredCreatePath?.trim() || '';
      const parts = hint.split('/');
      const nameHint = parts.pop()?.replace(/\.md$/i, '') || '';
      const dirHint = parts.join('/');
      const fileName = state.generatedFileName || 'new-doc.md';

      const result = await deps.requestSaveLocation({
        suggestedTitle: nameHint,
        suggestedDirectory: dirHint,
        fileName,
        isNewDocument: true,
      });
      if (!result) return;

      const resolvedPath = result.path.endsWith('.md') ? result.path : `${result.path}.md`;

      try {
        await actions.storeSaveFile(resolvedPath, state.editorContent);
        if (result.title) {
          actions.setMetadataTitle(result.title);
        }
        actions.setIsEditing(false);
        actions.onCreatePathResolved?.(resolvedPath);
        deps.showSuccess('생성 완료', '새 문서가 생성되었습니다.');

        const newPath = `/doc/${encodeURIComponent(resolvedPath)}`;
        const tabTitle = result.title || resolvedPath.split('/').pop() || resolvedPath;
        actions.updateTab(state.tabId, { path: newPath, title: tabTitle });
      } catch {
        deps.showError('생성 실패', '문서 생성 중 오류가 발생했습니다.');
      }
      return;
    }

    if (!state.currentFilePath) {
      deps.showError('저장 실패', '선택된 파일이 없습니다.');
      return;
    }

    try {
      await actions.save();
      actions.setIsEditing(false);
      deps.showSuccess('저장 완료', '파일이 저장되었습니다.');
    } catch {
      deps.showError('저장 실패', '파일 저장 중 오류가 발생했습니다.');
    }
  }, [actions, deps, state]);

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
