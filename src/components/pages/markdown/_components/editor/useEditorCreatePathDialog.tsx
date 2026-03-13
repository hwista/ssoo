'use client';

import * as React from 'react';
import { EditorInputDialog } from './EditorInputDialog';
import { SaveLocationDialog } from '@/components/common/save-location';
import type { SaveLocationResult } from '@/components/common/save-location';

interface InputDialogState {
  open: boolean;
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  defaultValue: string;
  confirmText: string;
}

const INITIAL_STATE: InputDialogState = {
  open: false,
  title: '',
  description: undefined,
  label: '',
  placeholder: undefined,
  defaultValue: '',
  confirmText: '확인',
};

interface SaveLocationState {
  open: boolean;
  initialTitle: string;
  initialDirectory: string;
  fileName: string;
  isNewDocument: boolean;
}

const INITIAL_SAVE_LOCATION: SaveLocationState = {
  open: false,
  initialTitle: '',
  initialDirectory: '',
  fileName: '',
  isNewDocument: true,
};

export interface CreatePathResult {
  path: string;
  title: string;
}

export function useEditorCreatePathDialog() {
  const [dialogState, setDialogState] = React.useState<InputDialogState>(INITIAL_STATE);
  const [saveLocationState, setSaveLocationState] = React.useState<SaveLocationState>(INITIAL_SAVE_LOCATION);
  const resolverRef = React.useRef<((value: string | null) => void) | null>(null);
  const saveLocationResolverRef = React.useRef<((value: CreatePathResult | null) => void) | null>(null);

  const openInputDialog = React.useCallback((state: Omit<InputDialogState, 'open'>) => {
    return new Promise<string | null>((resolve) => {
      resolverRef.current = resolve;
      setDialogState({ open: true, ...state });
    });
  }, []);

  /**
   * SaveLocationDialog 기반 저장 경로 요청.
   * 문서명 + 디렉토리 + 자동 파일명을 결정한 후 전체 경로 + title 반환.
   */
  const requestSaveLocation = React.useCallback((params: {
    suggestedTitle?: string;
    suggestedDirectory?: string;
    fileName: string;
    isNewDocument: boolean;
  }) => {
    return new Promise<CreatePathResult | null>((resolve) => {
      saveLocationResolverRef.current = resolve;
      setSaveLocationState({
        open: true,
        initialTitle: params.suggestedTitle || '',
        initialDirectory: params.suggestedDirectory || '',
        fileName: params.fileName,
        isNewDocument: params.isNewDocument,
      });
    });
  }, []);

  /** 기존 호환용 requestCreatePath — 내부적으로 requestSaveLocation 으로 위임 */
  const requestCreatePath = React.useCallback((preferredPath?: string) => {
    // 경로 힌트를 디렉토리/제목으로 분해
    const pathHint = preferredPath?.trim() || '';
    const parts = pathHint.split('/');
    const namePart = parts.pop()?.replace(/\.md$/i, '') || '';
    const dirPart = parts.join('/');

    // 항상 SaveLocationDialog 를 열어 사용자 확인을 받음
    return requestSaveLocation({
      suggestedTitle: namePart,
      suggestedDirectory: dirPart,
      fileName: '', // 호출 측에서 별도 지정 필요
      isNewDocument: true,
    }).then((result) => result?.path ?? null);
  }, [requestSaveLocation]);

  const requestImageUrl = React.useCallback(() => openInputDialog({
    title: '이미지 URL 입력',
    description: '삽입할 이미지의 URL을 입력하세요.',
    label: '이미지 URL',
    placeholder: 'https://example.com/image.png',
    defaultValue: '',
    confirmText: '삽입',
  }), [openInputDialog]);

  const requestLinkUrl = React.useCallback(() => openInputDialog({
    title: '링크 URL 입력',
    description: '삽입할 링크의 URL을 입력하세요.',
    label: '링크 URL',
    placeholder: 'https://example.com',
    defaultValue: '',
    confirmText: '삽입',
  }), [openInputDialog]);

  const closeDialog = React.useCallback((value: string | null) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setDialogState(INITIAL_STATE);
  }, []);

  const closeSaveLocation = React.useCallback((result: SaveLocationResult | null) => {
    if (result) {
      const fullPath = result.directory
        ? `${result.directory}/${result.fileName}`
        : result.fileName;
      saveLocationResolverRef.current?.({ path: fullPath, title: result.title });
    } else {
      saveLocationResolverRef.current?.(null);
    }
    saveLocationResolverRef.current = null;
    setSaveLocationState(INITIAL_SAVE_LOCATION);
  }, []);

  return {
    requestCreatePath,
    requestSaveLocation,
    requestImageUrl,
    requestLinkUrl,
    createPathDialog: (
      <>
        <EditorInputDialog
          open={dialogState.open}
          title={dialogState.title}
          description={dialogState.description}
          label={dialogState.label}
          placeholder={dialogState.placeholder}
          defaultValue={dialogState.defaultValue}
          confirmText={dialogState.confirmText}
          cancelText="취소"
          onConfirm={(value) => closeDialog(value || null)}
          onCancel={() => closeDialog(null)}
        />
        <SaveLocationDialog
          open={saveLocationState.open}
          onOpenChange={(open) => { if (!open) closeSaveLocation(null); }}
          initialTitle={saveLocationState.initialTitle}
          initialDirectory={saveLocationState.initialDirectory}
          fileName={saveLocationState.fileName}
          isNewDocument={saveLocationState.isNewDocument}
          onConfirm={closeSaveLocation}
        />
      </>
    ),
  };
}
