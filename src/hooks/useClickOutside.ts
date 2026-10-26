import { useEffect, type RefObject } from "react";

/**
 * 点击元素外部时触发回调。
 *
 * 用于下拉菜单的失焦关闭，`active` 为假时不注册监听，
 * 避免常驻的全局事件。
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return undefined;

    const handlePointerDown = (event: MouseEvent): void => {
      const element = ref.current;
      if (!element) return;
      if (!element.contains(event.target as Node)) onOutside();
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [ref, onOutside, active]);
}
