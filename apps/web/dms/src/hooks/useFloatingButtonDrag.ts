'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';

interface UseFloatingButtonDragOptions {
  /** Distance from viewport right edge (px) */
  homeRight: number;
  /** Distance from viewport bottom edge (px) */
  homeBottom: number;
  /** Button diameter (px) */
  buttonSize: number;
  /** Snap-back threshold distance (px) */
  snapThreshold?: number;
}

interface UseFloatingButtonDragReturn {
  style: CSSProperties;
  isDragging: boolean;
  isAtHome: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  /** Returns true (once) if the last pointerup was a drag — call in click handler to suppress. */
  consumeDrag: () => boolean;
}

export function useFloatingButtonDrag({
  homeRight,
  homeBottom,
  buttonSize,
  snapThreshold = 80,
}: UseFloatingButtonDragOptions): UseFloatingButtonDragReturn {
  const [offset, setOffset] = useState<{ dx: number; dy: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [snapping, setSnapping] = useState(false);

  const dragStartRef = useRef<{ sx: number; sy: number } | null>(null);
  const movedRef = useRef(false);
  const clickSuppressedRef = useRef(false);

  const isAtHome = offset === null;

  const homeX = typeof window !== 'undefined' ? window.innerWidth - homeRight - buttonSize : 0;
  const homeY = typeof window !== 'undefined' ? window.innerHeight - homeBottom - buttonSize : 0;

  /** Returns true (and resets flag) if the most recent pointerup was a drag, not a click. */
  const consumeDrag = useCallback(() => {
    if (clickSuppressedRef.current) {
      clickSuppressedRef.current = false;
      return true;
    }
    return false;
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = { sx: e.clientX, sy: e.clientY };
    movedRef.current = false;
    setIsDragging(true);
    setSnapping(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const onPointerMove = (e: PointerEvent) => {
      const start = dragStartRef.current;
      if (!start) return;

      const distFromStart = Math.hypot(e.clientX - start.sx, e.clientY - start.sy);
      if (!movedRef.current && distFromStart < 5) return;
      movedRef.current = true;

      const curX = offset !== null ? homeX + offset.dx : homeX;
      const curY = offset !== null ? homeY + offset.dy : homeY;
      const rawX = curX + (e.clientX - start.sx);
      const rawY = curY + (e.clientY - start.sy);

      const clampedX = Math.max(0, Math.min(rawX, window.innerWidth - buttonSize));
      const clampedY = Math.max(0, Math.min(rawY, window.innerHeight - buttonSize));

      setOffset({ dx: clampedX - homeX, dy: clampedY - homeY });
      dragStartRef.current = { sx: e.clientX, sy: e.clientY };
    };

    const onPointerUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;

      if (!movedRef.current) return;
      clickSuppressedRef.current = true;

      const finalX = offset !== null ? homeX + offset.dx : homeX;
      const finalY = offset !== null ? homeY + offset.dy : homeY;
      const dist = Math.hypot(finalX - homeX, finalY - homeY);

      if (dist <= snapThreshold) {
        setSnapping(true);
        setOffset(null);
        const timer = window.setTimeout(() => setSnapping(false), 250);
        return () => window.clearTimeout(timer);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [isDragging, offset, homeX, homeY, buttonSize, snapThreshold]);

  // Recalculate on resize — snap home if currently at home
  useEffect(() => {
    const onResize = () => {
      if (offset === null) return;
      const newHomeX = window.innerWidth - homeRight - buttonSize;
      const newHomeY = window.innerHeight - homeBottom - buttonSize;
      const curX = newHomeX + offset.dx;
      const curY = newHomeY + offset.dy;
      const clampedX = Math.max(0, Math.min(curX, window.innerWidth - buttonSize));
      const clampedY = Math.max(0, Math.min(curY, window.innerHeight - buttonSize));
      setOffset({ dx: clampedX - newHomeX, dy: clampedY - newHomeY });
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [offset, homeRight, homeBottom, buttonSize]);

  const style: CSSProperties = offset !== null
    ? {
        position: 'fixed',
        left: homeX + offset.dx,
        top: homeY + offset.dy,
        right: 'auto',
        bottom: 'auto',
        transition: snapping ? 'left 200ms ease-out, top 200ms ease-out' : 'none',
        userSelect: 'none',
        touchAction: 'none',
      }
    : {
        position: 'fixed',
        right: homeRight,
        bottom: homeBottom,
        transition: snapping ? 'right 200ms ease-out, bottom 200ms ease-out' : 'none',
        userSelect: 'none',
        touchAction: 'none',
      };

  return { style, isDragging, isAtHome, onPointerDown, consumeDrag };
}
