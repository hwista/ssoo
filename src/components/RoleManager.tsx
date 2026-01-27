'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield24Regular,
  Person24Regular,
  People24Regular,
  Add24Regular,
  Delete24Regular,
  Edit24Regular,
  Checkmark24Regular,
  Dismiss24Regular,
  ChevronDown24Regular,
  ChevronRight24Regular,
  Info24Regular
} from '@fluentui/react-icons';
import {
  Role,
  RoleDefinition,
  Permission,
  Group,
  ACTION_LABELS,
  RESOURCE_LABELS,
  ROLE_LABELS,
  ROLE_COLORS,
  ROLE_ICONS
} from '@/lib/permissions/types';

interface RoleManagerProps {
  currentUserId: string;
  onClose?: () => void;
}

interface RoleUI {
  id: Role;
  name: string;
  description: string;
  priority: number;
  isSystem?: boolean;
  inherits?: Role;
  label: string;
  color: string;
  icon: string;
  permissions?: Permission[];
}

export default function RoleManager({ currentUserId, onClose }: RoleManagerProps) {
  const [roles, setRoles] = useState<RoleUI[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleUI | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [activeTab, setActiveTab] = useState<'roles' | 'groups' | 'assign'>('roles');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 역할 할당 폼
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState<Role>('viewer');
  const [assignExpiry, setAssignExpiry] = useState('');

  // 그룹 생성 폼
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newGroupId, setNewGroupId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');

  // 역할 목록 로드
  const loadRoles = useCallback(async () => {
    try {
      const response = await fetch('/api/permissions?action=roles');
      const data = await response.json();
      if (data.success) {
        setRoles(data.roles);
      }
    } catch (err) {
      setError('역할을 불러올 수 없어요');
    }
  }, []);

  // 그룹 목록 로드
  const loadGroups = useCallback(async () => {
    try {
      const response = await fetch('/api/permissions?action=groups');
      const data = await response.json();
      if (data.success) {
        setGroups(data.groups);
      }
    } catch (err) {
      setError('그룹을 불러올 수 없어요');
    }
  }, []);

  useEffect(() => {
    Promise.all([loadRoles(), loadGroups()]).finally(() => setIsLoading(false));
  }, [loadRoles, loadGroups]);

  // 역할 상세 로드
  const loadRoleDetails = async (roleId: Role) => {
    try {
      const response = await fetch(`/api/permissions?action=role&roleId=${roleId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedRole({
          ...data.role,
          permissions: data.permissions
        });
      }
    } catch (err) {
      setError('역할 상세를 불러올 수 없어요');
    }
  };

  // 역할 할당
  const handleAssignRole = async () => {
    if (!assignUserId) {
      setError('사용자 ID를 입력해주세요');
      return;
    }

    try {
      const response = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assignRole',
          userId: assignUserId,
          role: assignRole,
          assignedBy: currentUserId,
          expiresAt: assignExpiry ? new Date(assignExpiry).getTime() : undefined
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('역할을 할당했어요');
        setAssignUserId('');
        setAssignExpiry('');
      } else {
        setError(data.error || '역할 할당에 실패했어요');
      }
    } catch (err) {
      setError('역할 할당 중 오류가 발생했어요');
    }

    setTimeout(() => { setSuccess(null); setError(null); }, 3000);
  };

  // 그룹 생성
  const handleCreateGroup = async () => {
    if (!newGroupId || !newGroupName) {
      setError('그룹 ID와 이름을 입력해주세요');
      return;
    }

    try {
      const response = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createGroup',
          groupId: newGroupId,
          name: newGroupName,
          description: newGroupDescription,
          createdBy: currentUserId
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('그룹을 생성했어요');
        setShowGroupForm(false);
        setNewGroupId('');
        setNewGroupName('');
        setNewGroupDescription('');
        loadGroups();
      } else {
        setError(data.error || '그룹 생성에 실패했어요');
      }
    } catch (err) {
      setError('그룹 생성 중 오류가 발생했어요');
    }

    setTimeout(() => { setSuccess(null); setError(null); }, 3000);
  };

  // 그룹 삭제
  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('이 그룹을 삭제할까요?')) return;

    try {
      const response = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteGroup',
          groupId,
          deletedBy: currentUserId
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('그룹을 삭제했어요');
        setSelectedGroup(null);
        loadGroups();
      } else {
        setError(data.error || '그룹 삭제에 실패했어요');
      }
    } catch (err) {
      setError('그룹 삭제 중 오류가 발생했어요');
    }

    setTimeout(() => { setSuccess(null); setError(null); }, 3000);
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <h2 className="text-lg font-semibold flex items-center gap-2 dark:text-white">
          <Shield24Regular />
          권한 관리
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <Dismiss24Regular className="w-5 h-5 dark:text-gray-400" />
          </button>
        )}
      </div>

      {/* 탭 */}
      <div className="flex border-b dark:border-gray-700">
        {(['roles', 'groups', 'assign'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-blue-500 border-b-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab === 'roles' && '역할'}
            {tab === 'groups' && '그룹'}
            {tab === 'assign' && '역할 할당'}
          </button>
        ))}
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
      <div className="flex-1 overflow-hidden flex">
        {/* 역할 탭 */}
        {activeTab === 'roles' && (
          <>
            {/* 역할 목록 */}
            <div className="w-1/3 border-r dark:border-gray-700 overflow-y-auto">
              {roles.map(role => (
                <button
                  key={role.id}
                  onClick={() => loadRoleDetails(role.id)}
                  className={`w-full text-left p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedRole?.id === role.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="text-2xl"
                      style={{ filter: `drop-shadow(0 0 2px ${role.color})` }}
                    >
                      {role.icon}
                    </span>
                    <div>
                      <div className="font-medium dark:text-white">{role.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        우선순위: {role.priority}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* 역할 상세 */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedRole ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{selectedRole.icon}</span>
                    <div>
                      <h3 className="text-xl font-bold dark:text-white">{selectedRole.label}</h3>
                      <p className="text-gray-500 dark:text-gray-400">{selectedRole.description}</p>
                    </div>
                  </div>

                  {selectedRole.inherits && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Info24Regular className="w-4 h-4" />
                      <span>
                        {ROLE_ICONS[selectedRole.inherits]} {ROLE_LABELS[selectedRole.inherits]} 역할을 상속받아요
                      </span>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium mb-2 dark:text-white">권한</h4>
                    <div className="space-y-2">
                      {selectedRole.permissions?.map((perm, i) => (
                        <div
                          key={i}
                          className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div className="font-medium text-sm dark:text-white mb-1">
                            {RESOURCE_LABELS[perm.resource]}
                            {perm.scope && perm.scope !== 'all' && (
                              <span className="ml-2 text-xs text-gray-400">
                                ({perm.scope === 'own' ? '본인만' : '팀 내'})
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {perm.actions.map(action => (
                              <span
                                key={action}
                                className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded"
                              >
                                {ACTION_LABELS[action]}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                  역할을 선택해주세요
                </div>
              )}
            </div>
          </>
        )}

        {/* 그룹 탭 */}
        {activeTab === 'groups' && (
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium dark:text-white">그룹 목록</h3>
              <button
                onClick={() => setShowGroupForm(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
              >
                <Add24Regular className="w-4 h-4" />
                그룹 생성
              </button>
            </div>

            {/* 그룹 생성 폼 */}
            {showGroupForm && (
              <div className="mb-4 p-4 border dark:border-gray-600 rounded-lg space-y-3">
                <h4 className="font-medium dark:text-white">새 그룹</h4>
                <input
                  type="text"
                  value={newGroupId}
                  onChange={(e) => setNewGroupId(e.target.value)}
                  placeholder="그룹 ID (영문)"
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="그룹 이름"
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
                <input
                  type="text"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="설명 (선택)"
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowGroupForm(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleCreateGroup}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    생성
                  </button>
                </div>
              </div>
            )}

            {/* 그룹 목록 */}
            {groups.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg">
                생성된 그룹이 없어요
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map(group => (
                  <div
                    key={group.id}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <People24Regular className="w-6 h-6 text-blue-500" />
                        <div>
                          <div className="font-medium dark:text-white">{group.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {group.members.length}명 • {group.roles.length}개 역할
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Delete24Regular className="w-4 h-4" />
                      </button>
                    </div>
                    {group.description && (
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {group.description}
                      </p>
                    )}
                    {group.roles.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {group.roles.map(role => (
                          <span
                            key={role}
                            className="px-2 py-0.5 text-xs rounded"
                            style={{
                              backgroundColor: `${ROLE_COLORS[role]}20`,
                              color: ROLE_COLORS[role]
                            }}
                          >
                            {ROLE_ICONS[role]} {ROLE_LABELS[role]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 역할 할당 탭 */}
        {activeTab === 'assign' && (
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="max-w-md mx-auto space-y-4">
              <h3 className="font-medium dark:text-white">사용자에게 역할 할당</h3>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  사용자 ID
                </label>
                <input
                  type="text"
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  placeholder="사용자 ID 입력"
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  역할
                </label>
                <div className="space-y-2">
                  {roles.map(role => (
                    <label
                      key={role.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        assignRole === role.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                          : 'bg-gray-50 dark:bg-gray-700 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role.id}
                        checked={assignRole === role.id}
                        onChange={(e) => setAssignRole(e.target.value as Role)}
                        className="sr-only"
                      />
                      <span className="text-xl">{role.icon}</span>
                      <div>
                        <div className="font-medium dark:text-white">{role.label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {role.description}
                        </div>
                      </div>
                      {assignRole === role.id && (
                        <Checkmark24Regular className="w-5 h-5 text-blue-500 ml-auto" />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  만료일 (선택)
                </label>
                <input
                  type="date"
                  value={assignExpiry}
                  onChange={(e) => setAssignExpiry(e.target.value)}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  비워두면 무기한 할당돼요
                </p>
              </div>

              <button
                onClick={handleAssignRole}
                disabled={!assignUserId}
                className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                역할 할당
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
