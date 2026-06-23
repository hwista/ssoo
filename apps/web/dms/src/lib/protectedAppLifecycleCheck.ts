'use client';

const FILE_DIALOG_ARM_WINDOW_MS = 2 * 60 * 1000;
const POST_DIALOG_SKIP_WINDOW_MS = 5000;

interface ProtectedAppLifecycleCheckState {
  armedUntil: number;
  skipUntil: number;
}

type WindowWithProtectedAppLifecycleCheck = Window & {
  __dmsProtectedAppLifecycleCheckState__?: ProtectedAppLifecycleCheckState;
};

function getLifecycleCheckState(): ProtectedAppLifecycleCheckState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const scopedWindow = window as WindowWithProtectedAppLifecycleCheck;
  if (!scopedWindow.__dmsProtectedAppLifecycleCheckState__) {
    scopedWindow.__dmsProtectedAppLifecycleCheckState__ = {
      armedUntil: 0,
      skipUntil: 0,
    };
  }

  return scopedWindow.__dmsProtectedAppLifecycleCheckState__;
}

export function armProtectedAppLifecycleCheckSkip() {
  const state = getLifecycleCheckState();
  if (!state) {
    return;
  }

  state.armedUntil = Date.now() + FILE_DIALOG_ARM_WINDOW_MS;
  state.skipUntil = 0;
}

export function shouldSkipProtectedAppLifecycleCheck(): boolean {
  const state = getLifecycleCheckState();
  if (!state) {
    return false;
  }

  const now = Date.now();
  if (state.skipUntil > now) {
    return true;
  }

  if (state.armedUntil <= now) {
    state.armedUntil = 0;
    state.skipUntil = 0;
    return false;
  }

  state.armedUntil = 0;
  state.skipUntil = now + POST_DIALOG_SKIP_WINDOW_MS;
  return true;
}
