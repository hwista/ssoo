'use client';

import { useCallback, useMemo, useRef } from 'react';

export interface ActiveRequest {
  token: number;
  controller: AbortController;
  signal: AbortSignal;
}

export interface RequestLifecycle {
  beginRequest: () => ActiveRequest;
  isRequestActive: (token: number) => boolean;
  abortActiveRequest: () => void;
  finalizeRequest: (token: number) => void;
}

export function useRequestLifecycle(): RequestLifecycle {
  const currentTokenRef = useRef(0);
  const activeTokenRef = useRef<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const beginRequest = useCallback((): ActiveRequest => {
    controllerRef.current?.abort();

    const controller = new AbortController();
    const token = currentTokenRef.current + 1;

    currentTokenRef.current = token;
    activeTokenRef.current = token;
    controllerRef.current = controller;

    return {
      token,
      controller,
      signal: controller.signal,
    };
  }, []);

  const isRequestActive = useCallback((token: number) => {
    return activeTokenRef.current === token && !controllerRef.current?.signal.aborted;
  }, []);

  const abortActiveRequest = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    activeTokenRef.current = null;
  }, []);

  const finalizeRequest = useCallback((token: number) => {
    if (activeTokenRef.current !== token) return;
    controllerRef.current = null;
    activeTokenRef.current = null;
  }, []);

  return useMemo(() => ({
    beginRequest,
    isRequestActive,
    abortActiveRequest,
    finalizeRequest,
  }), [abortActiveRequest, beginRequest, finalizeRequest, isRequestActive]);
}
