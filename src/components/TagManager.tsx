'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Tag24Regular, Add24Regular, Dismiss24Regular, Edit24Regular, Delete24Regular } from '@fluentui/react-icons';

interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
}

interface TagManagerProps {
  filePath?: string;
  onTagsChange?: (tags: Tag[]) => void;
  compact?: boolean;
}

export default function TagManager({ filePath, onTagsChange, compact = false }: TagManagerProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [fileTags, setFileTags] = useState<Tag[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('');
  const [newTagDescription, setNewTagDescription] = useState('');
  const [showTagSelector, setShowTagSelector] = useState(false);

  // 태그 목록 로드
  const loadTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/tags');
      const data = await response.json();
      if (data.success) {
        setAllTags(data.tags);
        setColors(data.colors);
        if (!newTagColor && data.colors.length > 0) {
          setNewTagColor(data.colors[0]);
        }
      }

      // 파일 태그 로드
      if (filePath) {
        const fileResponse = await fetch(`/api/tags?filePath=${encodeURIComponent(filePath)}`);
        const fileData = await fileResponse.json();
        if (fileData.success) {
          setFileTags(fileData.tags);
        }
      }
    } catch (error) {
      console.error('태그 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filePath, newTagColor]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  // 태그 생성
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: newTagColor,
          description: newTagDescription.trim() || undefined
        })
      });

      const data = await response.json();
      if (data.success) {
        setAllTags([...allTags, data.tag]);
        setNewTagName('');
        setNewTagDescription('');
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('태그 생성 오류:', error);
    }
  };

  // 태그 수정
  const handleUpdateTag = async () => {
    if (!editingTag || !newTagName.trim()) return;

    try {
      const response = await fetch('/api/tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTag.id,
          name: newTagName.trim(),
          color: newTagColor,
          description: newTagDescription.trim() || undefined
        })
      });

      const data = await response.json();
      if (data.success) {
        setAllTags(allTags.map(t => t.id === data.tag.id ? data.tag : t));
        setFileTags(fileTags.map(t => t.id === data.tag.id ? data.tag : t));
        setEditingTag(null);
        setNewTagName('');
        setNewTagDescription('');
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('태그 수정 오류:', error);
    }
  };

  // 태그 삭제
  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('이 태그를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/tags?id=${tagId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        setAllTags(allTags.filter(t => t.id !== tagId));
        setFileTags(fileTags.filter(t => t.id !== tagId));
      }
    } catch (error) {
      console.error('태그 삭제 오류:', error);
    }
  };

  // 파일에 태그 추가
  const handleAddTagToFile = async (tagId: string) => {
    if (!filePath) return;

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addToFile',
          filePath,
          tagId
        })
      });

      const data = await response.json();
      if (data.success) {
        setFileTags(data.tags);
        onTagsChange?.(data.tags);
      }
    } catch (error) {
      console.error('태그 추가 오류:', error);
    }
  };

  // 파일에서 태그 제거
  const handleRemoveTagFromFile = async (tagId: string) => {
    if (!filePath) return;

    try {
      const response = await fetch(`/api/tags?filePath=${encodeURIComponent(filePath)}&tagId=${tagId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        setFileTags(data.tags);
        onTagsChange?.(data.tags);
      }
    } catch (error) {
      console.error('태그 제거 오류:', error);
    }
  };

  // 모달 열기
  const openCreateModal = (tag?: Tag) => {
    if (tag) {
      setEditingTag(tag);
      setNewTagName(tag.name);
      setNewTagColor(tag.color);
      setNewTagDescription(tag.description || '');
    } else {
      setEditingTag(null);
      setNewTagName('');
      setNewTagColor(colors[0] || '#3B82F6');
      setNewTagDescription('');
    }
    setShowCreateModal(true);
  };

  // 적용 가능한 태그 (아직 파일에 적용되지 않은 태그)
  const availableTags = allTags.filter(t => !fileTags.some(ft => ft.id === t.id));

  if (compact) {
    // 컴팩트 모드: 파일의 태그만 표시
    return (
      <div className="flex flex-wrap gap-1 items-center">
        {fileTags.map(tag => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            {filePath && (
              <button
                onClick={() => handleRemoveTagFromFile(tag.id)}
                className="hover:bg-white/20 rounded-full p-0.5"
              >
                <Dismiss24Regular className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
        {filePath && availableTags.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowTagSelector(!showTagSelector)}
              className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
            >
              <Add24Regular className="w-4 h-4" />
            </button>
            {showTagSelector && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg z-10 min-w-[150px]">
                {availableTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      handleAddTagToFile(tag.id);
                      setShowTagSelector(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // 풀 모드: 태그 관리 UI
  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <Tag24Regular />
          태그 관리
        </h3>
        <button
          onClick={() => openCreateModal()}
          className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          <Add24Regular className="w-4 h-4" />
          새 태그
        </button>
      </div>

      {/* 파일 태그 (파일이 선택된 경우) */}
      {filePath && (
        <div className="p-3 bg-gray-50 rounded-md">
          <div className="text-sm text-gray-500 mb-2">이 파일의 태그:</div>
          <div className="flex flex-wrap gap-2">
            {fileTags.length === 0 ? (
              <span className="text-sm text-gray-400">태그 없음</span>
            ) : (
              fileTags.map(tag => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                  <button
                    onClick={() => handleRemoveTagFromFile(tag.id)}
                    className="hover:bg-white/20 rounded-full"
                  >
                    <Dismiss24Regular className="w-4 h-4" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>
      )}

      {/* 전체 태그 목록 */}
      <div className="space-y-2">
        <div className="text-sm text-gray-500">전체 태그:</div>
        {isLoading ? (
          <div className="text-gray-400">로딩 중...</div>
        ) : allTags.length === 0 ? (
          <div className="text-gray-400">생성된 태그가 없습니다</div>
        ) : (
          <div className="space-y-1">
            {allTags.map(tag => (
              <div
                key={tag.id}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="font-medium">{tag.name}</span>
                  {tag.description && (
                    <span className="text-sm text-gray-400">- {tag.description}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {filePath && !fileTags.some(ft => ft.id === tag.id) && (
                    <button
                      onClick={() => handleAddTagToFile(tag.id)}
                      className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                      title="이 파일에 추가"
                    >
                      <Add24Regular className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => openCreateModal(tag)}
                    className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                  >
                    <Edit24Regular className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="p-1 text-red-400 hover:bg-red-50 rounded"
                  >
                    <Delete24Regular className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 생성/수정 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingTag ? '태그 수정' : '새 태그 만들기'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">태그 이름</label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="태그 이름"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">색상</label>
                <div className="flex gap-2 flex-wrap">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewTagColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        newTagColor === color ? 'border-gray-800' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">설명 (선택)</label>
                <input
                  type="text"
                  value={newTagDescription}
                  onChange={(e) => setNewTagDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="태그 설명"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTag(null);
                }}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={editingTag ? handleUpdateTag : handleCreateTag}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                {editingTag ? '수정' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
