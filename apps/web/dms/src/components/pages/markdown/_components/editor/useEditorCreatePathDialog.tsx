'use client';

import * as React from 'react';
import { EditorInputDialog } from './EditorInputDialog';

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

export function useEditorCreatePathDialog() {
  const [dialogState, setDialogState] = React.useState<InputDialogState>(INITIAL_STATE);
  const resolverRef = React.useRef<((value: string | null) => void) | null>(null);

  const openInputDialog = React.useCallback((state: Omit<InputDialogState, 'open'>) => {
    return new Promise<string | null>((resolve) => {
      resolverRef.current = resolve;
      setDialogState({
        open: true,
        ...state,
      });
    });
  }, []);

  const requestCreatePath = React.useCallback((preferredPath?: string) => {
    const pathHint = preferredPath?.trim();
    if (pathHint) return Promise.resolve(pathHint);

    return openInputDialog({
      title: '새 문서 경로 입력',
      description: '문서를 저장할 상대 경로를 입력하세요.',
      label: '문서 경로',
      placeholder: '예: drafts/new-doc.md',
      defaultValue: 'drafts/new-doc.md',
      confirmText: '저장',
    });
  }, [openInputDialog]);

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

  return {
    requestCreatePath,
    requestImageUrl,
    requestLinkUrl,
    createPathDialog: (
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
    ),
  };
}
