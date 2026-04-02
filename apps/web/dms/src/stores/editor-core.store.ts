'use client';

import { create } from 'zustand';
import { fileApi, templateApi, contentApi, getErrorMessage } from '@/lib/api';
import type { DocumentMetadata } from '@/types';
import type { ContentType } from '@/types/content-metadata';
import type { TemplateReferenceDoc, TemplateGeneration, TemplateOriginType } from '@/types/template';
import { logger, PerformanceTimer } from '@/lib/utils/errorUtils';

/**
 * 템플릿 저장 시 필요한 메타데이터.
 * DocumentPage가 save 직전에 설정하면, saveFile()이 templateApi.upsert() 호출에 사용.
 */
export interface TemplateSaveData {
  id?: string;
  scope: 'personal' | 'global';
  kind: 'document' | 'folder';
  originType: TemplateOriginType;
  referenceDocuments: TemplateReferenceDoc[];
  generation: TemplateGeneration;
}

interface FileMetadata {
  createdAt: Date | null;
  modifiedAt: Date | null;
  size: number | null;
}

export interface EditorHandlers {
  save: () => Promise<void>;
  cancel: () => void;
  getMarkdown: () => string;
  getSelection: () => { from: number; to: number };
  insertAt: (from: number, to: number, text: string) => void;
  setPendingInsert: (range: { from: number; to: number } | null) => void;
  markAsSaved: () => void;
}

export interface EditorTabState {
  content: string;
  currentFilePath: string | null;
  isEditing: boolean;
  fileMetadata: FileMetadata;
  documentMetadata: DocumentMetadata | null;
  isLoading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  editorHandlers: EditorHandlers | null;
  pendingMetadataUpdate: Partial<DocumentMetadata> | null;
  /** 콘텐츠 타입 — 문서/템플릿 통합 지원 */
  contentType: ContentType;
  /** 템플릿 저장용 메타데이터 (DocumentPage가 save 직전에 설정) */
  templateSaveData: TemplateSaveData | null;
}

export const initialEditorTabState: EditorTabState = {
  content: '',
  currentFilePath: null,
  isEditing: false,
  fileMetadata: { createdAt: null, modifiedAt: null, size: null },
  documentMetadata: null,
  isLoading: false,
  error: null,
  hasUnsavedChanges: false,
  isSaving: false,
  editorHandlers: null,
  pendingMetadataUpdate: null,
  contentType: 'document',
  templateSaveData: null,
};

interface EditorMultiStoreState {
  editors: Record<string, EditorTabState>;
}

interface EditorMultiStoreActions {
  _updateTab: (tabId: string, patch: Partial<EditorTabState>) => void;
  _getTab: (tabId: string) => EditorTabState;
  removeTab: (tabId: string) => void;
  loadFile: (tabId: string, path: string) => Promise<void>;
  saveFile: (tabId: string, path: string, content: string) => Promise<void>;
  saveFileKeepEditing: (tabId: string, path: string, content: string) => Promise<void>;
  refreshFileMetadata: (tabId: string, path: string) => Promise<void>;
  updateDocumentMetadata: (tabId: string, update: Partial<DocumentMetadata>) => Promise<void>;
  setLocalDocumentMetadata: (tabId: string, update: Partial<DocumentMetadata>) => void;
  replaceLocalDocumentMetadata: (tabId: string, next: DocumentMetadata | null) => void;
  flushPendingMetadata: (tabId: string) => Promise<void>;
  discardPendingMetadata: (tabId: string) => Promise<void>;
  /** 통합 콘텐츠 저장 (contentApi 사용) */
  saveContent: (tabId: string, path: string, content: string, metadata?: Record<string, unknown>) => Promise<void>;
  /** 통합 콘텐츠 로드 (contentApi 사용) */
  loadContent: (tabId: string, path: string, options?: { strict?: boolean; contentType?: ContentType }) => Promise<void>;
  /** contentType 설정 */
  setContentType: (tabId: string, contentType: ContentType) => void;
  /** 템플릿 저장 메타데이터 설정 (save 직전에 호출) */
  setTemplateSaveData: (tabId: string, data: TemplateSaveData | null) => void;
}

type EditorMultiStore = EditorMultiStoreState & EditorMultiStoreActions;

export const useEditorMultiStore = create<EditorMultiStore>((set, get) => ({
  editors: {},

  _updateTab: (tabId, patch) => {
    set((state) => {
      const prev = state.editors[tabId] ?? { ...initialEditorTabState };
      return {
        editors: { ...state.editors, [tabId]: { ...prev, ...patch } },
      };
    });
  },

  _getTab: (tabId) => get().editors[tabId] ?? { ...initialEditorTabState },

  removeTab: (tabId) => {
    set((state) => {
      const rest = { ...state.editors };
      delete rest[tabId];
      return { editors: rest };
    });
  },

  loadFile: async (tabId, path) => {
    const timer = new PerformanceTimer('파일 로드');
    get()._updateTab(tabId, { isLoading: true, error: null, currentFilePath: path });

    try {
      const response = await fileApi.read(path);
      if (!response.success) {
        throw new Error(`파일 읽기 실패: ${getErrorMessage(response)}`);
      }

      const fileData = response.data as
        | {
            content?: string;
            metadata?: {
              createdAt: string;
              modifiedAt: string;
              size: number;
              document?: DocumentMetadata | null;
            } | null;
          }
        | undefined;

      const patch: Partial<EditorTabState> = { content: fileData?.content || '' };

      if (fileData?.metadata) {
        patch.fileMetadata = {
          createdAt: new Date(fileData.metadata.createdAt),
          modifiedAt: new Date(fileData.metadata.modifiedAt),
          size: fileData.metadata.size,
        };
        patch.documentMetadata = fileData.metadata.document || null;
      } else {
        patch.fileMetadata = initialEditorTabState.fileMetadata;
        patch.documentMetadata = null;
      }

      get()._updateTab(tabId, patch);
      logger.info('파일 로드 성공', { path, hasMetadata: !!fileData?.metadata });
      timer.end({ success: true });
    } catch (error) {
      timer.end({ success: false });
      const errorMsg = error instanceof Error ? error.message : '파일 로드 실패';

      get()._updateTab(tabId, {
        content: '',
        fileMetadata: initialEditorTabState.fileMetadata,
        documentMetadata: null,
        error: errorMsg,
      });

      if (errorMsg.includes('파일을 찾을 수 없습니다')) {
        logger.warn('존재하지 않는 파일 로드 요청', { path, tabId });
      } else {
        logger.error('파일 로드 중 오류', error);
      }
    } finally {
      get()._updateTab(tabId, { isLoading: false });
    }
  },

  saveFile: async (tabId, path, content) => {
    const timer = new PerformanceTimer('파일 저장');
    const tabState = get()._getTab(tabId);
    get()._updateTab(tabId, { isLoading: true, error: null });

    try {
      // 템플릿 저장: templateApi.upsert() 사용
      if (tabState.contentType === 'template' && tabState.templateSaveData) {
        const name = tabState.documentMetadata?.title || path.split('/').pop()?.replace(/\.md$/i, '') || 'Untitled';
        const response = await templateApi.upsert({
          ...(tabState.templateSaveData.id ? { id: tabState.templateSaveData.id } : {}),
          name,
          description: '',
          scope: tabState.templateSaveData.scope,
          kind: tabState.templateSaveData.kind,
          content,
          tags: tabState.documentMetadata?.tags ?? [],
          originType: tabState.templateSaveData.originType,
          referenceDocuments: tabState.templateSaveData.referenceDocuments,
          generation: tabState.templateSaveData.generation,
        });

        if (!response.success) {
          throw new Error(`템플릿 저장 실패: ${getErrorMessage(response)}`);
        }

        const savedId = response.data?.id;
        get()._updateTab(tabId, {
          content,
          isEditing: false,
          currentFilePath: path,
          templateSaveData: savedId
            ? { ...tabState.templateSaveData, id: savedId }
            : tabState.templateSaveData,
        });

        logger.info('템플릿 저장 성공', { path, templateId: savedId });
        timer.end({ success: true });
        return;
      }

      // 문서 저장: fileApi.update() 사용 (기존 동작)
      const response = await fileApi.update(path, content);
      if (!response.success) {
        throw new Error(`파일 저장 실패: ${getErrorMessage(response)}`);
      }

      get()._updateTab(tabId, { content, isEditing: false, currentFilePath: path });
      await get().flushPendingMetadata(tabId);
      await get().refreshFileMetadata(tabId, path);

      logger.info('파일 저장 성공', { path });
      timer.end({ success: true });
    } catch (error) {
      timer.end({ success: false });
      logger.error('파일 저장 중 오류', error);
      const errorMsg = error instanceof Error ? error.message : '파일 저장 실패';
      get()._updateTab(tabId, { error: errorMsg });
      throw error;
    } finally {
      get()._updateTab(tabId, { isLoading: false });
    }
  },

  saveFileKeepEditing: async (tabId, path, content) => {
    const timer = new PerformanceTimer('임시 파일 저장');

    try {
      const response = await fileApi.update(path, content);
      if (!response.success) {
        throw new Error(`파일 저장 실패: ${getErrorMessage(response)}`);
      }

      get()._updateTab(tabId, { content });
      await get().flushPendingMetadata(tabId);
      await get().refreshFileMetadata(tabId, path);

      logger.info('임시 저장 성공 (편집 모드 유지)', { path });
      timer.end({ success: true });
    } catch (error) {
      timer.end({ success: false });
      logger.error('임시 저장 중 오류', error);
      throw error;
    }
  },

  refreshFileMetadata: async (tabId, path) => {
    try {
      const response = await fileApi.getMetadata(path);
      if (!response.success) {
        throw new Error(`메타데이터 조회 실패: ${getErrorMessage(response)}`);
      }

      const metadataResponse = response.data as
        | {
            metadata?: {
              createdAt: string;
              modifiedAt: string;
              size: number;
              document?: DocumentMetadata | null;
            } | null;
          }
        | undefined;

      if (metadataResponse?.metadata) {
        get()._updateTab(tabId, {
          fileMetadata: {
            createdAt: new Date(metadataResponse.metadata.createdAt),
            modifiedAt: new Date(metadataResponse.metadata.modifiedAt),
            size: metadataResponse.metadata.size,
          },
          documentMetadata: metadataResponse.metadata.document || null,
        });
      }
    } catch (error) {
      logger.warn('메타데이터 새로고침 실패', error);
    }
  },

  setLocalDocumentMetadata: (tabId, update) => {
    const tabState = get()._getTab(tabId);
    const patch: Partial<EditorTabState> = {
      pendingMetadataUpdate: { ...(tabState.pendingMetadataUpdate || {}), ...update },
    };
    if (tabState.documentMetadata) {
      patch.documentMetadata = { ...tabState.documentMetadata, ...update };
    } else {
      patch.documentMetadata = update as DocumentMetadata;
    }
    get()._updateTab(tabId, patch);
  },

  replaceLocalDocumentMetadata: (tabId, next) => {
    get()._updateTab(tabId, {
      documentMetadata: next,
      pendingMetadataUpdate: null,
    });
  },

  flushPendingMetadata: async (tabId) => {
    const tabState = get()._getTab(tabId);
    if (!tabState.pendingMetadataUpdate || !tabState.currentFilePath) return;

    try {
      const response = await fileApi.updateMetadata(tabState.currentFilePath, tabState.pendingMetadataUpdate);
      if (!response.success) {
        throw new Error(`메타데이터 플러시 실패: ${getErrorMessage(response)}`);
      }
      const merged = response.data as DocumentMetadata | undefined;
      const patch: Partial<EditorTabState> = { pendingMetadataUpdate: null };
      if (merged) {
        patch.documentMetadata = merged;
      }
      get()._updateTab(tabId, patch);
      logger.info('보류 메타데이터 플러시 완료', { path: tabState.currentFilePath });
    } catch (error) {
      logger.error('메타데이터 플러시 실패', error);
      throw error;
    }
  },

  discardPendingMetadata: async (tabId) => {
    const tabState = get()._getTab(tabId);
    if (!tabState.pendingMetadataUpdate) return;

    get()._updateTab(tabId, { pendingMetadataUpdate: null });
    if (tabState.currentFilePath) {
      await get().refreshFileMetadata(tabId, tabState.currentFilePath);
    }
    logger.info('보류 메타데이터 폐기', { path: tabState.currentFilePath });
  },

  updateDocumentMetadata: async (tabId, update) => {
    const tabState = get()._getTab(tabId);
    if (!tabState.currentFilePath) {
      logger.warn('메타데이터 업데이트 실패: 파일 경로 없음');
      return;
    }

    try {
      const response = await fileApi.updateMetadata(tabState.currentFilePath, update);
      if (!response.success) {
        throw new Error(`메타데이터 업데이트 실패: ${getErrorMessage(response)}`);
      }

      const merged = response.data as DocumentMetadata | undefined;
      if (merged) {
        get()._updateTab(tabId, { documentMetadata: merged });
      } else {
        get()._updateTab(tabId, {
          documentMetadata: tabState.documentMetadata
            ? { ...tabState.documentMetadata, ...update, updatedAt: new Date().toISOString() }
            : null,
        });
      }

      logger.info('문서 메타데이터 업데이트 성공', { path: tabState.currentFilePath });
    } catch (error) {
      logger.error('문서 메타데이터 업데이트 실패', error);
      throw error;
    }
  },

  setContentType: (tabId, contentType) => {
    get()._updateTab(tabId, { contentType });
  },

  setTemplateSaveData: (tabId, data) => {
    get()._updateTab(tabId, { templateSaveData: data });
  },

  saveContent: async (tabId, path, content, metadata) => {
    const timer = new PerformanceTimer('통합 콘텐츠 저장');
    get()._updateTab(tabId, { isSaving: true, error: null });

    try {
      const response = await contentApi.save(path, content, metadata);
      if (!response.success) {
        throw new Error(`콘텐츠 저장 실패: ${getErrorMessage(response)}`);
      }

      get()._updateTab(tabId, {
        content,
        currentFilePath: path,
        hasUnsavedChanges: false,
        pendingMetadataUpdate: null,
      });

      logger.info('통합 콘텐츠 저장 성공', { path });
      timer.end({ success: true });
    } catch (error) {
      timer.end({ success: false });
      logger.error('통합 콘텐츠 저장 실패', error);
      const errorMsg = error instanceof Error ? error.message : '콘텐츠 저장 실패';
      get()._updateTab(tabId, { error: errorMsg });
      throw error;
    } finally {
      get()._updateTab(tabId, { isSaving: false });
    }
  },

  loadContent: async (tabId, path, options) => {
    const timer = new PerformanceTimer('통합 콘텐츠 로드');
    const contentType = options?.contentType ?? 'document';
    get()._updateTab(tabId, { isLoading: true, error: null, currentFilePath: path, contentType });

    try {
      const response = await contentApi.load(path, { strict: options?.strict });
      if (!response.success) {
        throw new Error(`콘텐츠 로드 실패: ${getErrorMessage(response)}`);
      }

      const data = response.data;
      const patch: Partial<EditorTabState> = {
        content: data?.content || '',
        documentMetadata: (data?.metadata as unknown as DocumentMetadata) || null,
      };

      get()._updateTab(tabId, patch);
      logger.info('통합 콘텐츠 로드 성공', { path, contentType });
      timer.end({ success: true });
    } catch (error) {
      timer.end({ success: false });
      const errorMsg = error instanceof Error ? error.message : '콘텐츠 로드 실패';
      get()._updateTab(tabId, {
        content: '',
        documentMetadata: null,
        error: errorMsg,
      });
      logger.error('통합 콘텐츠 로드 실패', error);
    } finally {
      get()._updateTab(tabId, { isLoading: false });
    }
  },
}));

export function createEditorTabActions(tabId: string) {
  const gs = () => useEditorMultiStore.getState();

  return {
    setContent: (content: string) => gs()._updateTab(tabId, { content }),
    setIsEditing: (editing: boolean) => gs()._updateTab(tabId, { isEditing: editing }),
    setError: (error: string | null) => gs()._updateTab(tabId, { error }),
    setHasUnsavedChanges: (hasChanges: boolean) => gs()._updateTab(tabId, { hasUnsavedChanges: hasChanges }),
    setIsSaving: (saving: boolean) => gs()._updateTab(tabId, { isSaving: saving }),
    setCurrentFilePath: (path: string | null) => gs()._updateTab(tabId, { currentFilePath: path }),
    setEditorHandlers: (handlers: EditorHandlers) => gs()._updateTab(tabId, { editorHandlers: handlers }),
    clearEditorHandlers: () => gs()._updateTab(tabId, { editorHandlers: null }),
    setLocalDocumentMetadata: (update: Partial<DocumentMetadata>) => gs().setLocalDocumentMetadata(tabId, update),
    replaceLocalDocumentMetadata: (next: DocumentMetadata | null) => gs().replaceLocalDocumentMetadata(tabId, next),
    loadFile: (path: string) => gs().loadFile(tabId, path),
    saveFile: (path: string, content: string) => gs().saveFile(tabId, path, content),
    saveFileKeepEditing: (path: string, content: string) => gs().saveFileKeepEditing(tabId, path, content),
    refreshFileMetadata: (path: string) => gs().refreshFileMetadata(tabId, path),
    updateDocumentMetadata: (update: Partial<DocumentMetadata>) => gs().updateDocumentMetadata(tabId, update),
    flushPendingMetadata: () => gs().flushPendingMetadata(tabId),
    discardPendingMetadata: () => gs().discardPendingMetadata(tabId),
    setContentType: (contentType: ContentType) => gs().setContentType(tabId, contentType),
    setTemplateSaveData: (data: TemplateSaveData | null) => gs().setTemplateSaveData(tabId, data),
    saveContent: (path: string, content: string, metadata?: Record<string, unknown>) => gs().saveContent(tabId, path, content, metadata),
    loadContent: (path: string, options?: { strict?: boolean; contentType?: ContentType }) => gs().loadContent(tabId, path, options),
    reset: () => gs()._updateTab(tabId, { ...initialEditorTabState }),
    removeTabEditor: () => gs().removeTab(tabId),
  };
}
