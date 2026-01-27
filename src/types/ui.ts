/**
 * UI 컴포넌트 관련 타입 정의
 * 알림, 모달, 상태 관리 등
 */

import type { FileNode, FileType, FileMetadata } from './fileSystem';

// 🔔 알림 시스템 (기존 2곳 중복 → 1곳 통합)
export interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
  // 확장 속성
  action?: NotificationAction;
  persistent?: boolean;
  icon?: string;
}

export interface NotificationAction {
  label: string;
  handler: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

// 🖱️ 컨텍스트 메뉴 (기존 확장)
export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  target: FileNode | null;
  type: 'file' | 'folder' | 'empty';
  id: string;
  isRendering?: boolean;
  // 확장 속성
  items?: ContextMenuItem[];
}

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  submenu?: ContextMenuItem[];
  handler?: (target: FileNode | null) => void;
}

// 🗂️ 파일 생성 다이얼로그 (기존 확장)
export interface CreateDialogState {
  type: 'file' | 'folder';
  parentPath?: string;
  // 확장 속성
  visible: boolean;
  defaultName?: string;
  allowedTypes?: FileType[];
  validation?: ValidationRules;
}

export interface CreateFileParams {
  name: string;
  extension: string;
  path: string;
  type: 'file' | 'folder';
  // 확장 속성
  template?: string;
  metadata?: Partial<FileMetadata>;
}

// ✅ 유효성 검사
export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// 💬 메시지 모달
export type MessageType = 'success' | 'error' | 'warning' | 'confirm' | 'info';

export interface MessageConfig {
  title?: string;
  message: string;
  type: MessageType;
  details?: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface MessageState extends MessageConfig {
  isOpen: boolean;
}

// 🎨 테마 관련
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: string;
}

// 📏 레이아웃 관련
export interface LayoutState {
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  editorSplit: 'single' | 'horizontal' | 'vertical';
  previewMode: 'hidden' | 'side' | 'overlay';
}

// 🔧 컴포넌트 공통 Props
export interface BaseComponentProps {
  className?: string;
  id?: string;
  'data-testid'?: string;
  style?: React.CSSProperties;
}

// 🎛️ 컨트롤 컴포넌트 Props
export interface ControlProps extends BaseComponentProps {
  disabled?: boolean;
  loading?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}