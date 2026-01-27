/**
 * 컴포넌트 타입 정의
 * 
 * Phase 2.1.5에서 모든 컴포넌트의 Props 인터페이스를 중앙화하여
 * 타입 안전성과 개발 효율성을 향상시킵니다.
 */

import { ReactNode } from 'react';
import { FileNode, ContextMenuItem } from './wiki';

// =============================================================================
// 이벤트 핸들러 타입 표준화
// =============================================================================

export interface FileSystemHandler {
  onFileSelect: (file: string) => void;
  onFileCreate: (path: string, type: 'file' | 'folder') => Promise<void>;
  onFileRename: (oldPath: string, newPath: string) => Promise<void>;
  onFileDelete: (path: string) => Promise<void>;
}

export interface EditorHandler {
  onContentChange: (content: string) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  onEdit: () => void;
}

export interface ModalHandler {
  onOpen: () => void;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface NotificationHandler {
  onClose: (id: string) => void;
  onShow: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

// =============================================================================
// 메인 컴포넌트 Props
// =============================================================================

export interface WikiAppProps {
  className?: string;
}

export interface WikiSidebarProps {
  width: number;
  className?: string;
}

export interface WikiEditorProps {
  className?: string;
}

export interface WikiModalsProps {
  className?: string;
}

// =============================================================================
// 에디터 관련 컴포넌트 Props
// =============================================================================

export interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onContentChange: (content: string) => void;
  onInsertImage?: () => void;
  onInsertLink?: () => void;
  onInsertTable?: () => void;
}

export interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (text: string, url: string) => void;
  initialText?: string;
  initialUrl?: string;
}

export interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (alt: string, url: string) => void;
  initialAlt?: string;
  initialUrl?: string;
}

// =============================================================================
// 파일 관리 관련 컴포넌트 Props
// =============================================================================

export interface CreateFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileCreated?: (filePath: string) => void;
  initialPath?: string;
  initialType?: 'file' | 'folder';
}

export interface TreeComponentProps {
  files: FileNode[];
  selectedFile: string | null;
  onFileSelect: (file: string) => void;
  onFileCreate: (path: string, type: 'file' | 'folder') => Promise<void>;
  onFileRename: (oldPath: string, newPath: string) => Promise<void>;
  onFileDelete: (path: string) => Promise<void>;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  className?: string;
}

// =============================================================================
// 알림 관련 컴포넌트 Props  
// =============================================================================

export interface NotificationProps {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: (id: string) => void;
  index: number;
}

export interface NotificationContainerProps {
  className?: string;
}

// =============================================================================
// 범용 모달 컴포넌트 Props
// =============================================================================

export interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  children?: ReactNode;
}

// =============================================================================
// 컨텍스트 메뉴 관련 Props
// =============================================================================

export interface ContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  onClose: () => void;
  items: ContextMenuItem[];
}

// =============================================================================
// 공통 UI 컴포넌트 Props
// =============================================================================

export interface ButtonProps {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}

export interface CardProps {
  className?: string;
  children: ReactNode;
  title?: string;
  padding?: boolean;
}

export interface InputProps {
  type?: 'text' | 'email' | 'password' | 'url' | 'search';
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  autoFocus?: boolean;
  maxLength?: number;
}

// =============================================================================
// 타입 가드 및 유틸리티 타입
// =============================================================================

export type ComponentVariant = 'default' | 'secondary' | 'destructive' | 'ghost' | 'outline';
export type ComponentSize = 'sm' | 'md' | 'lg';
export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export type ModalType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

// 컴포넌트 Props 추출 헬퍼
export type PropsOf<T> = T extends React.ComponentType<infer P> ? P : never;

// 이벤트 핸들러 타입 추출
export type EventHandler<T = void> = () => T;
export type ChangeHandler<T> = (value: T) => void;
export type AsyncHandler<T = void> = () => Promise<T>;

// 조건부 Props 타입
export type ConditionalProps<T, K extends keyof T> = T[K] extends true 
  ? Required<Pick<T, K>> 
  : Partial<Pick<T, K>>;