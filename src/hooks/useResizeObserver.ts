import { useEffect, useRef, type RefObject } from "react";

/**
 * 观察容器尺寸变化。
 *
 * 用 requestAnimationFrame 做节流，避免 ResizeObserver 回调过于频繁。
 * 回调里需自行判断容器尺寸是否为 0（隐藏状态下容器没有尺寸）。
 */
export function useResizeObserver(
  target: RefObject<HTMLElement | null>,
  onResize: () => void,
): void {
  const callbackRef = useRef(onResize);

  useEffect(() => {
    callbackRef.current = onResize;
  }, [onResize]);

  useEffect(() => {
    const element = target.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;

    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => callbackRef.current());
    });
    observer.observe(element);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [target]);
}
