'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { People24Regular, Circle12Filled } from '@fluentui/react-icons';

interface Participant {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  cursor?: {
    position: number;
  };
}

interface CollaborationIndicatorProps {
  filePath: string;
  userId: string;
  userName: string;
  isEditing?: boolean;
  onParticipantsChange?: (participants: Participant[]) => void;
}

export default function CollaborationIndicator({
  filePath,
  userId,
  userName,
  isEditing = false,
  onParticipantsChange
}: CollaborationIndicatorProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [userColor, setUserColor] = useState<string>('#3B82F6');
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const joinedRef = useRef(false);

  // 세션 참가
  const joinSession = useCallback(async () => {
    if (joinedRef.current) return;

    try {
      const response = await fetch('/api/collaborate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          filePath,
          userId,
          userName,
          content: '' // 초기 콘텐츠는 빈 문자열
        })
      });

      const data = await response.json();
      if (data.success) {
        setIsConnected(true);
        setUserColor(data.userColor);
        joinedRef.current = true;
      }
    } catch (error) {
      console.error('세션 참가 오류:', error);
    }
  }, [filePath, userId, userName]);

  // 세션 나가기
  const leaveSession = useCallback(async () => {
    if (!joinedRef.current) return;

    try {
      await fetch('/api/collaborate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leave',
          filePath,
          userId
        })
      });
      joinedRef.current = false;
      setIsConnected(false);
    } catch (error) {
      console.error('세션 나가기 오류:', error);
    }
  }, [filePath, userId]);

  // 세션 상태 폴링
  const pollSessionState = useCallback(async () => {
    try {
      const response = await fetch(`/api/collaborate?filePath=${encodeURIComponent(filePath)}`);
      const data = await response.json();

      if (data.success && data.active) {
        setParticipants(data.participants);
        onParticipantsChange?.(data.participants);
      } else {
        setParticipants([]);
      }
    } catch (error) {
      console.error('세션 상태 조회 오류:', error);
    }
  }, [filePath, onParticipantsChange]);

  // 편집 중일 때만 세션 참가
  useEffect(() => {
    if (isEditing && filePath) {
      joinSession();

      // 폴링 시작 (2초 간격)
      pollingRef.current = setInterval(pollSessionState, 2000);
      pollSessionState(); // 즉시 한 번 실행

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
        leaveSession();
      };
    }
  }, [isEditing, filePath, joinSession, leaveSession, pollSessionState]);

  // 컴포넌트 언마운트 시 세션 나가기
  useEffect(() => {
    return () => {
      if (joinedRef.current) {
        // 동기적으로 처리하기 위해 navigator.sendBeacon 사용
        const data = JSON.stringify({
          action: 'leave',
          filePath,
          userId
        });
        navigator.sendBeacon('/api/collaborate', data);
      }
    };
  }, [filePath, userId]);

  const activeParticipants = participants.filter(p => p.isActive);
  const otherParticipants = activeParticipants.filter(p => p.id !== userId);

  if (!isEditing || activeParticipants.length <= 1) {
    return null;
  }

  return (
    <div className="relative">
      {/* 참가자 아바타 그룹 */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        <People24Regular className="w-4 h-4 text-gray-600 dark:text-gray-300" />

        {/* 아바타 스택 */}
        <div className="flex -space-x-2">
          {activeParticipants.slice(0, 4).map((participant) => (
            <div
              key={participant.id}
              className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-700 flex items-center justify-center text-xs font-medium text-white"
              style={{ backgroundColor: participant.color }}
              title={participant.name}
            >
              {participant.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {activeParticipants.length > 4 && (
            <div className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-700 bg-gray-400 flex items-center justify-center text-xs font-medium text-white">
              +{activeParticipants.length - 4}
            </div>
          )}
        </div>

        <span className="text-sm text-gray-600 dark:text-gray-300">
          {activeParticipants.length}명 편집 중
        </span>
      </button>

      {/* 상세 정보 드롭다운 */}
      {showDetails && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDetails(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg z-20">
            <div className="p-3 border-b dark:border-gray-700">
              <h3 className="font-medium text-sm dark:text-white">
                현재 편집 중인 사용자
              </h3>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {activeParticipants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white"
                    style={{ backgroundColor: participant.color }}
                  >
                    {participant.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate dark:text-white">
                        {participant.name}
                      </span>
                      {participant.id === userId && (
                        <span className="text-xs text-gray-400">(나)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Circle12Filled
                        className="w-2 h-2"
                        style={{ color: participant.isActive ? '#22C55E' : '#9CA3AF' }}
                      />
                      {participant.isActive ? '활성' : '비활성'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {otherParticipants.length > 0 && (
              <div className="p-3 border-t dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                다른 사용자의 변경사항이 실시간으로 반영됩니다
              </div>
            )}
          </div>
        </>
      )}

      {/* 연결 상태 표시 */}
      {isConnected && (
        <div
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-700"
          style={{ backgroundColor: '#22C55E' }}
          title="연결됨"
        />
      )}
    </div>
  );
}
