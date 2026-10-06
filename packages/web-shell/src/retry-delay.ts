'use client';

import { useEffect, useState } from 'react';
import { readSsooErrorMetadata } from './error-model';

export function useSsooRetryDelay(error: unknown): number {
  const seconds = readSsooErrorMetadata(error).retryAfterSeconds ?? 0;
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    setRemaining(seconds);
    if (seconds <= 0) return;
    const deadline = Date.now() + seconds * 1000;
    const timer = setInterval(() => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [error, seconds]);
  return remaining;
}
