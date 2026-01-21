import { useCallback, useState, useRef, useEffect } from 'react';
import { logger } from '@/utils/errorUtils';

export interface UseAutoScrollOptions {
  /** 스크롤 동기화 활성화 여부 */
  enabled?: boolean;
  /** 스크롤 동기화 비율 (0-1) */
  syncRatio?: number;
  /** 디바운스 딜레이 (ms) */
  debounceMs?: number;
}

export interface UseAutoScrollReturn {
  /** 리더 요소 ref (스크롤 감지 대상) */
  leaderRef: React.RefObject<HTMLElement | null>;
  /** 팔로워 요소 ref (스크롤 동기화 대상) */
  followerRef: React.RefObject<HTMLElement | null>;
  /** 동기화 활성화 상태 */
  isEnabled: boolean;
  /** 동기화 토글 */
  toggleSync: () => void;
  /** 동기화 활성화/비활성화 */
  setEnabled: (enabled: boolean) => void;
  /** 수동 동기화 트리거 */
  syncNow: () => void;
}

/**
 * useAutoScroll
 * 두 스크롤 가능 요소(예: 에디터, 미리보기)의 스크롤을 동기화하는 훅
 * 
 * @example
 * const { leaderRef, followerRef, isEnabled, toggleSync } = useAutoScroll({ enabled: true });
 * 
 * <textarea ref={leaderRef} />
 * <div ref={followerRef} />
 */
export function useAutoScroll(options: UseAutoScrollOptions = {}): UseAutoScrollReturn {
  const {
    enabled: initialEnabled = false,
    syncRatio = 1.0,
    debounceMs = 50
  } = options;

  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const leaderRef = useRef<HTMLElement>(null);
  const followerRef = useRef<HTMLElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

  // 스크롤 동기화 함수
  const syncScroll = useCallback(() => {
    if (!isEnabled || !leaderRef.current || !followerRef.current || isSyncingRef.current) {
      return;
    }

    const leader = leaderRef.current;
    const follower = followerRef.current;

    // 스크롤 가능 여부 확인
    const leaderScrollHeight = leader.scrollHeight - leader.clientHeight;
    const followerScrollHeight = follower.scrollHeight - follower.clientHeight;

    if (leaderScrollHeight <= 0 || followerScrollHeight <= 0) {
      return;
    }

    // 리더의 스크롤 비율 계산
    const scrollPercentage = leader.scrollTop / leaderScrollHeight;

    // 팔로워 스크롤 위치 계산 및 적용
    const targetScroll = scrollPercentage * followerScrollHeight * syncRatio;

    isSyncingRef.current = true;
    follower.scrollTop = targetScroll;

    // 짧은 딜레이 후 플래그 해제
    setTimeout(() => {
      isSyncingRef.current = false;
    }, 100);

    logger.debug('스크롤 동기화', {
      leaderScroll: leader.scrollTop,
      followerScroll: targetScroll,
      percentage: scrollPercentage
    });
  }, [isEnabled, syncRatio]);

  // 디바운스된 스크롤 핸들러
  const handleScroll = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      syncScroll();
    }, debounceMs);
  }, [syncScroll, debounceMs]);

  // 리더 요소에 스크롤 이벤트 리스너 등록
  useEffect(() => {
    const leader = leaderRef.current;
    if (!leader || !isEnabled) {
      return;
    }

    leader.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      leader.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isEnabled, handleScroll]);

  // 토글 함수
  const toggleSync = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  // 수동 동기화
  const syncNow = useCallback(() => {
    syncScroll();
  }, [syncScroll]);

  return {
    leaderRef,
    followerRef,
    isEnabled,
    toggleSync,
    setEnabled: setIsEnabled,
    syncNow
  };
}

export default useAutoScroll;
