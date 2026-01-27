'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield24Regular,
  Person24Regular,
  People24Regular,
  Add24Regular,
  Delete24Regular,
  Checkmark24Regular,
  Dismiss24Regular,
  Clock24Regular
} from '@fluentui/react-icons';
import {
  ResourceType,
  Action,
  ResourcePermissionEntry,
  ACTION_LABELS,
  RESOURCE_LABELS,
  ROLE_LABELS,
  ROLE_COLORS,
  ROLE_ICONS,
  Role
} from '@/lib/permissions/types';

interface PermissionEditorProps {
  resourceType: ResourceType;
  resourceId: string;
  resourcePath?: string;
  currentUserId: string;
  onClose?: () => void;
}

interface PermissionEntryUI extends ResourcePermissionEntry {
  principalName?: string;
}

const ALL_ACTIONS: Action[] = ['create', 'read', 'update', 'delete', 'share', 'manage'];
const ALL_ROLES: Role[] = ['admin', 'manager', 'editor', 'viewer', 'guest'];

export default function PermissionEditor({
  resourceType,
  resourceId,
  resourcePath,
  currentUserId,
  onClose
}: PermissionEditorProps) {
  const [permissions, setPermissions] = useState<PermissionEntryUI[]>([]);
  const [inheritFromParent, setInheritFromParent] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 새 권한 추가 폼 상태
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPrincipalType, setNewPrincipalType] = useState<'user' | 'role' | 'group'>('user');
  const [newPrincipalId, setNewPrincipalId] = useState('');
  const [newActions, setNewActions] = useState<Action[]>(['read']);
  const [newExpiresAt, setNewExpiresAt] = useState('');

  // 권한 로드
  const loadPermissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        action: 'resourcePermissions',
        resourceType,
        resourceId
      });

      const response = await fetch(`/api/permissions?${params}`);
      const data = await response.json();

      if (data.success && data.permissions) {
        setPermissions(data.permissions.permissions || []);
        setInheritFromParent(data.permissions.inheritFromParent ?? true);
      } else {
        setPermissions([]);
      }
    } catch (err) {
      setError('권한을 불러올 수 없어요');
    } finally {
      setIsLoading(false);
    }
  }, [resourceType, resourceId]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // 권한 부여
  const grantPermission = async () => {
    if (!newPrincipalId || newActions.length === 0) {
      setError('대상과 권한을 선택해주세요');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'grantPermission',
          resourceType,
          resourceId,
          principalType: newPrincipalType,
          principalId: newPrincipalId,
          actions: newActions,
          grantedBy: currentUserId,
          expiresAt: newExpiresAt ? new Date(newExpiresAt).getTime() : undefined,
          inheritFromParent
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('권한을 부여했어요');
        setShowAddForm(false);
        setNewPrincipalId('');
        setNewActions(['read']);
        setNewExpiresAt('');
        loadPermissions();
      } else {
        setError(data.error || '권한 부여에 실패했어요');
      }
    } catch (err) {
      setError('권한 부여 중 오류가 발생했어요');
    } finally {
      setIsSaving(false);
      setTimeout(() => { setSuccess(null); setError(null); }, 3000);
    }
  };

  // 권한 회수
  const revokePermission = async (entry: PermissionEntryUI) => {
    if (!confirm('이 권한을 회수할까요?')) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revokePermission',
          resourceType,
          resourceId,
          principalType: entry.principalType,
          principalId: entry.principalId,
          revokedBy: currentUserId
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('권한을 회수했어요');
        loadPermissions();
      } else {
        setError(data.error || '권한 회수에 실패했어요');
      }
    } catch (err) {
      setError('권한 회수 중 오류가 발생했어요');
    } finally {
      setIsSaving(false);
      setTimeout(() => { setSuccess(null); setError(null); }, 3000);
    }
  };

  // 액션 토글
  const toggleAction = (action: Action) => {
    setNewActions(prev =>
      prev.includes(action)
        ? prev.filter(a => a !== action)
        : [...prev, action]
    );
  };

  // 만료 시간 포맷
  const formatExpiry = (timestamp?: number): string => {
    if (!timestamp) return '무기한';
    const date = new Date(timestamp);
    if (date.getTime() < Date.now()) return '만료됨';
    return date.toLocaleDateString('ko-KR');
  };

  // Principal 타입별 아이콘
  const getPrincipalIcon = (type: 'user' | 'role' | 'group') => {
    switch (type) {
      case 'user': return <Person24Regular className="w-4 h-4" />;
      case 'role': return <Shield24Regular className="w-4 h-4" />;
      case 'group': return <People24Regular className="w-4 h-4" />;
    }
  };

  // Principal 표시명
  const getPrincipalDisplay = (entry: PermissionEntryUI) => {
    if (entry.principalType === 'role') {
      const roleLabel = ROLE_LABELS[entry.principalId as Role];
      const roleIcon = ROLE_ICONS[entry.principalId as Role];
      return roleLabel ? `${roleIcon} ${roleLabel}` : entry.principalId;
    }
    return entry.principalName || entry.principalId;
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        권한을 불러오는 중...
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 dark:text-white">
            <Shield24Regular />
            권한 설정
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {RESOURCE_LABELS[resourceType]}: {resourcePath || resourceId}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <Dismiss24Regular className="w-5 h-5 dark:text-gray-400" />
          </button>
        )}
      </div>

      {/* 알림 */}
      {(error || success) && (
        <div className={`mx-4 mt-4 p-3 rounded-lg text-sm ${
          error
            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
            : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
        }`}>
          {error || success}
        </div>
      )}

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 상속 설정 */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={inheritFromParent}
            onChange={(e) => setInheritFromParent(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-500"
          />
          <span className="text-sm dark:text-gray-300">
            상위 폴더에서 권한 상속
          </span>
        </label>

        {/* 현재 권한 목록 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium dark:text-white">권한 목록</h3>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Add24Regular className="w-4 h-4" />
              추가
            </button>
          </div>

          {permissions.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg">
              설정된 권한이 없어요
            </div>
          ) : (
            <div className="space-y-2">
              {permissions.map((entry, index) => (
                <div
                  key={`${entry.principalType}-${entry.principalId}-${index}`}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      entry.principalType === 'role'
                        ? `bg-opacity-20`
                        : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                    style={entry.principalType === 'role' ? {
                      backgroundColor: `${ROLE_COLORS[entry.principalId as Role]}20`
                    } : undefined}
                    >
                      {getPrincipalIcon(entry.principalType)}
                    </div>
                    <div>
                      <div className="font-medium text-sm dark:text-white">
                        {getPrincipalDisplay(entry)}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {entry.actions.map(action => (
                          <span
                            key={action}
                            className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded"
                          >
                            {ACTION_LABELS[action]}
                          </span>
                        ))}
                      </div>
                      {entry.expiresAt && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <Clock24Regular className="w-3 h-3" />
                          {formatExpiry(entry.expiresAt)}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => revokePermission(entry)}
                    disabled={isSaving}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    title="권한 회수"
                  >
                    <Delete24Regular className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 권한 추가 폼 */}
        {showAddForm && (
          <div className="p-4 border dark:border-gray-600 rounded-lg space-y-4">
            <h4 className="font-medium dark:text-white">새 권한 추가</h4>

            {/* 대상 타입 */}
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                대상 타입
              </label>
              <div className="flex gap-2">
                {(['user', 'role', 'group'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setNewPrincipalType(type);
                      setNewPrincipalId('');
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                      newPrincipalType === type
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:text-gray-300'
                    }`}
                  >
                    {getPrincipalIcon(type)}
                    {type === 'user' ? '사용자' : type === 'role' ? '역할' : '그룹'}
                  </button>
                ))}
              </div>
            </div>

            {/* 대상 선택 */}
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                {newPrincipalType === 'user' ? '사용자 ID' :
                 newPrincipalType === 'role' ? '역할' : '그룹 ID'}
              </label>
              {newPrincipalType === 'role' ? (
                <select
                  value={newPrincipalId}
                  onChange={(e) => setNewPrincipalId(e.target.value)}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="">역할 선택</option>
                  {ALL_ROLES.map(role => (
                    <option key={role} value={role}>
                      {ROLE_ICONS[role]} {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={newPrincipalId}
                  onChange={(e) => setNewPrincipalId(e.target.value)}
                  placeholder={newPrincipalType === 'user' ? '사용자 ID 입력' : '그룹 ID 입력'}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              )}
            </div>

            {/* 액션 선택 */}
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                권한
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_ACTIONS.map(action => (
                  <button
                    key={action}
                    onClick={() => toggleAction(action)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      newActions.includes(action)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                    }`}
                  >
                    {newActions.includes(action) && <Checkmark24Regular className="w-3 h-3 inline mr-1" />}
                    {ACTION_LABELS[action]}
                  </button>
                ))}
              </div>
            </div>

            {/* 만료일 */}
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                만료일 (선택)
              </label>
              <input
                type="date"
                value={newExpiresAt}
                onChange={(e) => setNewExpiresAt(e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* 버튼 */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                취소
              </button>
              <button
                onClick={grantPermission}
                disabled={isSaving || !newPrincipalId || newActions.length === 0}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? '저장 중...' : '권한 부여'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
