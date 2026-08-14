import { useCallback, useLayoutEffect, useRef, useState } from "react";

export interface PillRect {
  left: number;
  top: number;
  width: number;
  height: number;
  ready: boolean;
}

export type PillAxis = "x" | "y";

/** Measure the active child and drive an Apple-style sliding pill. */
export function useSlidingPill<T extends HTMLElement>(
  activeKey: string,
  axis: PillAxis = "x",
) {
  const trackRef = useRef<T | null>(null);
  const [pill, setPill] = useState<PillRect>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    ready: false,
  });

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const active = track.querySelector<HTMLElement>('[data-pill-active="true"]');
    if (!active) return;
    const trackBox = track.getBoundingClientRect();
    const activeBox = active.getBoundingClientRect();
    setPill({
      left: activeBox.left - trackBox.left + track.scrollLeft,
      top: activeBox.top - trackBox.top + track.scrollTop,
      width: activeBox.width,
      height: activeBox.height,
      ready: true,
    });
  }, []);

  useLayoutEffect(() => {
    measure();
    const track = trackRef.current;
    if (!track) return;

    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    observer?.observe(track);
    for (const child of Array.from(track.children)) {
      if (child instanceof HTMLElement) observer?.observe(child);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      observer?.disconnect();
    };
  }, [activeKey, axis, measure]);

  return { trackRef, pill, measure };
}
