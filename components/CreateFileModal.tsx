'use client';

import React, { useState, useEffect } from 'react';
import { FileNode } from '@/types';
import TreeComponent from './TreeComponent';
import MessageModal from './MessageModal';
import { useMessage } from '@/hooks/useMessage';
import { normalizePath } from '@/utils/pathUtils';
import { logger } from '@/utils/errorUtils';
import { Button, Input, Dropdown, Option, Card, Text } from '@fluentui/react-components';

interface CreateFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (params: CreateFileParams) => Promise<void>;
  initialPath?: string; // 트리에서 우클릭한 경우 초기 경로
  mode: 'file' | 'folder';
  treeData: FileNode[];
}

interface CreateFileParams {
  name: string;
  extension: string;
  path: string;
  type: 'file' | 'folder';
}

const FILE_EXTENSIONS = [
  { value: 'md', label: 'Markdown (.md)', icon: '📝' },
  { value: 'txt', label: 'Text (.txt)', icon: '📄' },
  { value: 'json', label: 'JSON (.json)', icon: '📋' },
  { value: 'js', label: 'JavaScript (.js)', icon: '🟨' },
  { value: 'ts', label: 'TypeScript (.ts)', icon: '🔷' },
  { value: 'css', label: 'CSS (.css)', icon: '🎨' },
  { value: 'html', label: 'HTML (.html)', icon: '🌐' },
  { value: 'py', label: 'Python (.py)', icon: '🐍' },
];

export default function CreateFileModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  initialPath = '', 
  mode,
  treeData 
}: CreateFileModalProps) {
  const [fileName, setFileName] = useState('');
  const [selectedExtension, setSelectedExtension] = useState('md');
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [currentMode, setCurrentMode] = useState<'file' | 'folder'>(mode);

  // 메시지 모달 훅
  const { messageState, hideMessage, showError } = useMessage();

  useEffect(() => {
    if (isOpen) {
      // 모달이 열릴 때 초기화
      setTimeout(() => {
        setFileName('');
        setSelectedExtension('md');
        setCurrentPath(initialPath);
        setCurrentMode(mode); // mode prop을 currentMode에 반영
      }, 0);
    }
  }, [isOpen, initialPath, mode]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    logger.info('CreateFileModal handleSubmit 시작', {
      fileName,
      isDuplicate,
      currentMode,
      selectedExtension,
      currentPath,
      fileNameValidation
    });
    
    // 파일명 유효성 검사
    if (!fileNameValidation.isValid) {
      showError(fileNameValidation.message);
      return;
    }

    if (isDuplicate) {
      showError(`이미 같은 이름의 ${currentMode === 'file' ? '파일' : '폴더'}이 존재합니다.`);
      return;
    }

    try {
      console.log('🚀 CreateFileModal handleSubmit 시작');
      logger.info('파일/폴더 생성 시작', { fileName, currentMode, selectedExtension, currentPath });
      
      // 성공 시 입력 필드를 먼저 초기화 (밸리데이션 메시지 깜빡임 방지)
      const currentFileName = fileName;
      const currentExtension = selectedExtension;
      const currentType = currentMode;
      const currentCreatePath = currentPath;
      
      setFileName('');
      setSelectedExtension('md');
      
      console.log('📞 onConfirm 호출 전:', onConfirm);
      await onConfirm({
        name: currentFileName,
        extension: currentType === 'folder' ? '' : currentExtension,
        path: currentCreatePath,
        type: currentType
      });
      console.log('✅ onConfirm 성공');

      logger.info('파일/폴더 생성 성공');
      
    } catch (error) {
      console.error('❌ CreateFileModal 에러:', error);
      logger.error('파일/폴더 생성 실패', error, { 
        fileName, 
        currentMode, 
        selectedExtension, 
        currentPath 
      });
      
      // 실패 시 입력 필드 복원
      // (이미 초기화되었으므로 사용자가 다시 입력해야 함)
      
      // CreateFileModal에서 에러 메시지 표시
      console.log('📢 CreateFileModal showError 호출');
      showError(
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      );
    }
    
    logger.info('CreateFileModal handleSubmit 종료');
  };

  const handleClose = () => {
    logger.debug('모달 닫기 (X 버튼)');
    onClose();
  };

  const fullFileName = currentMode === 'folder' 
    ? fileName 
    : `${fileName}${selectedExtension ? `.${selectedExtension}` : ''}`;

  // 파일명 유효성 검사 함수
  const validateFileName = (name: string): { isValid: boolean; message: string } => {
    if (!name.trim()) {
      return { isValid: false, message: '파일명을 입력해주세요.' };
    }

    // 길이 검사 (Windows/macOS 파일명 제한)
    if (name.length > 255) {
      return { isValid: false, message: '파일명이 너무 깁니다. (최대 255자)' };
    }

    // Windows에서 금지된 문자 검사
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(name)) {
      return { isValid: false, message: '파일명에 사용할 수 없는 문자가 포함되어 있습니다. (< > : " / \\ | ? *)' };
    }

    // Windows 예약어 검사
    const reservedNames = [
      'CON', 'PRN', 'AUX', 'NUL',
      'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
      'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];
    const nameWithoutExt = name.split('.')[0].toUpperCase();
    if (reservedNames.includes(nameWithoutExt)) {
      return { isValid: false, message: `'${nameWithoutExt}'는 시스템 예약어입니다.` };
    }

    // 파일명이 점으로 시작하거나 끝나는 경우
    if (name.startsWith('.') && name.length === 1) {
      return { isValid: false, message: '파일명은 단일 점(.)일 수 없습니다.' };
    }

    if (name.endsWith('.') || name.endsWith(' ')) {
      return { isValid: false, message: '파일명은 점(.)이나 공백으로 끝날 수 없습니다.' };
    }

    // 연속된 점 검사
    if (name.includes('..')) {
      return { isValid: false, message: '파일명에 연속된 점(..)을 사용할 수 없습니다.' };
    }

    return { isValid: true, message: '' };
  };

  // 파일명 유효성 검사 결과
  const fileNameValidation = validateFileName(fileName);

  // 중복 검사 함수
  const checkDuplicate = () => {
    if (!fileName.trim()) return false;
    
    // 경로 정규화 - 백슬래시를 슬래시로 통일
    const normalizedCurrentPath = normalizePath(currentPath || '');
    const normalizedFullPath = normalizedCurrentPath 
      ? `${normalizedCurrentPath}/${fullFileName}`
      : fullFileName;
    
    const checkInNodes = (nodes: FileNode[]): boolean => {
      return nodes.some(node => {
        // 노드 경로도 정규화
        const normalizedNodePath = normalizePath(node.path);
        
        // 디버깅용 로그
        logger.debug('중복 검사', {
          targetPath: normalizedFullPath,
          nodePath: normalizedNodePath,
          nodeType: node.type,
          targetType: currentMode,
          match: normalizedNodePath === normalizedFullPath && node.type === currentMode
        });
        
        if (normalizedNodePath === normalizedFullPath && node.type === currentMode) return true;
        return node.children ? checkInNodes(node.children) : false;
      });
    };
    
    return checkInNodes(treeData);
  };

  const isDuplicate = checkDuplicate();

  // 폴더 선택 핸들러
  const handleFolderSelect = (path: string) => {
    setCurrentPath(path);
  };

  return (
    <>
      {/* 메인 모달 */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
        <Card style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.12)', width: 600, minHeight: 480, maxHeight: '90vh', height: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 24, borderBottom: '1px solid #eee' }}>
            <Text size={500} weight="semibold">➕ 새로 만들기</Text>
            <Button appearance="subtle" onClick={handleClose} icon={<span style={{ fontSize: 20 }}>✕</span>} />
          </div>
          <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            {/* 왼쪽: 폴더 트리 */}
            <div style={{ width: '50%', borderRight: '1px solid #eee', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ padding: 16, borderBottom: '1px solid #eee' }}>
                <Text size={300} weight="semibold">📂 위치 선택</Text>
              </div>
              <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                <TreeComponent
                  treeData={[{ name: '루트 폴더', type: 'directory', path: '', children: treeData }]}
                  selectedFile={currentPath}
                  onFileSelect={handleFolderSelect}
                  showSearch={true}
                  searchPlaceholder="폴더 검색..."
                  showExpandCollapseButtons={true}
                  defaultExpanded={true}
                  enableContextMenu={false}
                  showOnlyFolders={true}
                  showFileIcons={true}
                  height="100%"
                />
              </div>
            </div>
            {/* 오른쪽: 파일 정보 입력 */}
            <div style={{ width: '50%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ padding: 16, borderBottom: '1px solid #eee' }}>
                <Text size={300} weight="semibold">📝 항목 정보</Text>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 24, minHeight: 0, maxHeight: 'calc(90vh - 120px)' }}>
                {/* 타입 선택 라디오 버튼 */}
                <div style={{ marginBottom: 16 }}>
                  <Text size={300} weight="semibold">🎯 생성할 항목</Text>
                  <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input type="radio" name="createType" value="file" checked={currentMode === 'file'} onChange={e => setCurrentMode(e.target.value as 'file' | 'folder')} style={{ marginRight: 8 }} />
                      <Text size={300}>📄 파일</Text>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input type="radio" name="createType" value="folder" checked={currentMode === 'folder'} onChange={e => setCurrentMode(e.target.value as 'file' | 'folder')} style={{ marginRight: 8 }} />
                      <Text size={300}>📁 폴더</Text>
                    </label>
                  </div>
                </div>
                {/* 현재 경로 표시 */}
                <div style={{ marginBottom: 16 }}>
                  <Text size={300} weight="semibold">📍 생성 위치</Text>
                  <Card style={{ padding: 8, background: '#f9fafb', border: '1px solid #eee', fontSize: 14, color: '#555', marginTop: 4 }}>
                    <Text>{currentPath || '루트 폴더'}</Text>
                  </Card>
                </div>
                {/* 파일/폴더명 입력 */}
                <div style={{ marginBottom: 16 }}>
                  <Text size={300} weight="semibold">{currentMode === 'file' ? '📄 파일명' : '📁 폴더명'}</Text>
                  <Input
                    type="text"
                    value={fileName}
                    onChange={(_, data) => setFileName(data.value)}
                    placeholder={currentMode === 'file' ? '파일명을 입력하세요' : '폴더명을 입력하세요'}
                    appearance="outline"
                    autoFocus
                  />
                  {/* 실시간 검증 메시지 */}
                  {!fileName.trim() ? (
                    <Text size={200} style={{ marginTop: 4, color: '#888' }}>ℹ️ 필수 입력항목입니다</Text>
                  ) : !fileNameValidation.isValid ? (
                    <Text size={200} style={{ marginTop: 4, color: '#dc2626' }}>❌ {fileNameValidation.message}</Text>
                  ) : isDuplicate ? (
                    <Text size={200} style={{ marginTop: 4, color: '#dc2626' }}>❌ 이미 같은 이름의 {currentMode === 'file' ? '파일' : '폴더'}이 존재합니다</Text>
                  ) : (
                    <Text size={200} style={{ marginTop: 4, color: '#059669' }}>✅ 사용 가능한 이름입니다</Text>
                  )}
                </div>
                {/* 확장자 선택 (파일인 경우만) */}
                {currentMode === 'file' && (
                  <div style={{ marginBottom: 16 }}>
                    <Text size={300} weight="semibold">🏷️ 파일 형식</Text>
                    <Dropdown
                      value={selectedExtension}
                      onOptionSelect={(_, data) => { if (data.optionValue) setSelectedExtension(data.optionValue); }}
                    >
                      {FILE_EXTENSIONS.map(ext => (
                        <Option key={ext.value} value={ext.value} text={ext.label}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <span>{ext.icon}</span>
                            <span>{ext.label}</span>
                          </span>
                        </Option>
                      ))}
                    </Dropdown>
                  </div>
                )}
                {/* 미리보기 */}
                <div style={{ marginBottom: 16 }}>
                  <Text size={300} weight="semibold">👀 미리보기</Text>
                  <Card style={{ padding: 12, background: '#eff6ff', border: '1px solid #93c5fd', marginTop: 4 }}>
                    <Text size={200} style={{ color: '#2563eb' }}>
                      생성될 경로: {(() => { const normalizedPath = normalizePath(currentPath || ''); return normalizedPath ? `${normalizedPath}/${fullFileName}` : fullFileName; })()}
                    </Text>
                  </Card>
                </div>
              </div>
            </div>
          </div>
          {/* 하단 버튼 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: 24, borderTop: '1px solid #eee' }}>
            <Button appearance="outline" onClick={onClose}>취소</Button>
            <Button appearance="primary" onClick={handleSubmit} disabled={!fileName.trim() || !fileNameValidation.isValid || isDuplicate} title={!fileName.trim() ? '이름을 입력해주세요' : !fileNameValidation.isValid ? fileNameValidation.message : isDuplicate ? '중복된 이름입니다' : `${currentMode === 'file' ? '파일' : '폴더'} 생성하기`}>
              {currentMode === 'file' ? '파일 만들기' : '폴더 만들기'}
            </Button>
          </div>
        </Card>
      </div>

      {/* 메시지 모달 */}
      <MessageModal
        isOpen={messageState.isOpen}
        type={messageState.type}
        title={messageState.title}
        message={messageState.message}
        details={messageState.details}
        confirmText={messageState.confirmText}
        cancelText={messageState.cancelText}
        showCancel={messageState.showCancel}
        onConfirm={messageState.onConfirm || (() => {})}
        onCancel={messageState.onCancel}
        onClose={hideMessage}
      />
    </>
  );
}