'use client';

import { useEffect } from 'react';
import { SSOO_SHELL_METRICS } from '@ssoo/web-shell';
import { useLayoutStore } from '@/stores';

function detectDeviceType(): 'desktop' | 'mobile' {
  return window.innerWidth < SSOO_SHELL_METRICS.breakpoint.mobile ? 'mobile' : 'desktop';
}

export function useLayoutViewportSync() {
  const setDeviceType = useLayoutStore((state) => state.setDeviceType);

  useEffect(() => {
    setDeviceType(detectDeviceType());

    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setDeviceType(detectDeviceType());
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, [setDeviceType]);
}
