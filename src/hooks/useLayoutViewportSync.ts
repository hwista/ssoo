'use client';

import { useEffect } from 'react';
import { BREAKPOINTS } from '@/lib/constants/layout';
import { useLayoutStore } from '@/stores';

function detectDeviceType(): 'desktop' | 'mobile' {
  return window.innerWidth < BREAKPOINTS.mobile ? 'mobile' : 'desktop';
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
