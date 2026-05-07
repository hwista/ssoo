/**
 * User-scope cleanup registry.
 *
 * 로그인 사용자가 변경될 때 cross-user 잔존 위험이 있는 client-side store /
 * cache 를 일괄 invalidate 하기 위한 공용 통로. 각 store 가 자체 등록 → 사용자
 * 전환 시 registry 가 모든 listener 를 emit. AppLayout 같은 컴포넌트가 store
 * 별로 reset 호출을 일일이 작성할 필요 없음 (새 store 추가 시 그 store 파일
 * 안에서 1회 등록만으로 자동 합류).
 *
 * 활성화: `useAuthStore.subscribe` 가 module 최초 로드 시 hooked. 즉 어떤
 * 코드든 user-scope.ts 를 import 하는 순간부터 user 변경 감지 자동 시작.
 * (각 store 가 자체 등록을 위해 import 하므로 자동 활성.)
 */

import { useAuthStore } from '@/stores/auth.store';

export type UserChangeListener = (
  /** 새 사용자 ID (로그아웃 시 null) */
  next: string | null,
  /** 직전 사용자 ID (첫 로그인 시 null) */
  prev: string | null,
) => void;

const listeners = new Set<UserChangeListener>();

/**
 * user 변경 시 호출될 listener 등록. 같은 store 가 hot-reload 등으로 재등록되어도
 * Set 이 dedupe 하지 않으므로 module-level 1회만 호출되도록 사용처에서 보장.
 *
 * @returns unregister fn
 */
export function registerUserScopedReset(listener: UserChangeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let lastUserId: string | null = useAuthStore.getState().user?.userId ?? null;

useAuthStore.subscribe((state) => {
  const next = state.user?.userId ?? null;
  if (next === lastUserId) return;
  const prev = lastUserId;
  lastUserId = next;
  listeners.forEach((fn) => {
    try {
      fn(next, prev);
    } catch (error) {
      // 한 listener 실패가 다른 store reset 을 막지 않도록 격리.
      // eslint-disable-next-line no-console
      console.error('[user-scope] listener threw', error);
    }
  });
});
