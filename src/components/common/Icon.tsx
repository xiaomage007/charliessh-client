import type { ReactElement } from "react";

/** 可用图标名 */
export type IconName =
  | "server"
  | "terminal"
  | "plus"
  | "send"
  | "trash"
  | "edit"
  | "robot"
  | "chevron-down"
  | "chevron-up"
  | "chevron-right"
  | "close"
  | "search"
  | "connect"
  | "sidebar"
  | "chat"
  | "warning"
  | "copy"
  | "check"
  | "folder"
  | "refresh"
  | "stop"
  | "history"
  | "settings"
  | "user"
  | "sparkle"
  | "more";

/**
 * 图标路径表。
 *
 * 统一 16x16 视框、描边风格（stroke=currentColor），继承父级文字颜色。
 */
const ICON_PATHS: Record<IconName, ReactElement> = {
  server: (
    <>
      <rect x="2" y="2.5" width="12" height="4" rx="1" />
      <rect x="2" y="9.5" width="12" height="4" rx="1" />
      <circle cx="4.4" cy="4.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="4.4" cy="11.5" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  terminal: (
    <>
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <path d="M4.5 6.5 7 8.5 4.5 10.5" />
      <path d="M8.5 11H12" />
    </>
  ),
  plus: <path d="M8 3.5v9M3.5 8h9" />,
  send: <path d="M1.8 8 14 2.2 8.4 14.2 6.4 9.4 1.8 8z" />,
  trash: (
    <>
      <path d="M3 4.5h10" />
      <path d="M6.5 4.5V3h3v1.5" />
      <path d="M4.5 4.5 5.2 13.5h5.6l0.7-9" />
    </>
  ),
  edit: (
    <>
      <path d="M11.3 2.4 13.6 4.7 5.6 12.7 2.6 13.4 3.3 10.4 11.3 2.4z" />
      <path d="M9.9 3.8 12.2 6.1" />
    </>
  ),
  robot: (
    <>
      <rect x="3" y="5" width="10" height="7" rx="1.5" />
      <path d="M8 2.5V5" />
      <circle cx="6" cy="8.5" r="0.8" />
      <circle cx="10" cy="8.5" r="0.8" />
      <path d="M6 12.5v1.5M10 12.5v1.5" />
    </>
  ),
  "chevron-down": <path d="M4 6.5 8 10.5l4-4" />,
  "chevron-up": <path d="M4 9.5 8 5.5l4 4" />,
  "chevron-right": <path d="M6.5 4 10.5 8l-4 4" />,
  close: <path d="M4 4l8 8M12 4l-8 8" />,
  search: (
    <>
      <circle cx="7" cy="7" r="4.2" />
      <path d="M10.2 10.2 14 14" />
    </>
  ),
  connect: (
    <>
      <path d="M6 2v3.5M10 2v3.5" />
      <path d="M4 5.5h8V8a4 4 0 0 1-8 0V5.5z" />
      <path d="M8 12v2.5" />
    </>
  ),
  sidebar: (
    <>
      <rect x="1.5" y="2.5" width="13" height="11" rx="1" />
      <path d="M6.5 2.5v11" />
    </>
  ),
  chat: (
    <>
      <path d="M2 3.5h12v8H8.2L4.5 14.5v-3H2v-8z" />
      <path d="M5 6.5h6M5 9h4" />
    </>
  ),
  warning: (
    <>
      <path d="M8 2.2 15 13.6H1L8 2.2z" />
      <path d="M8 6.4v3.4M8 11.4v.8" />
    </>
  ),
  copy: (
    <>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1" />
      <path d="M10.5 3.5h-7a1 1 0 0 0-1 1v7" />
    </>
  ),
  check: <path d="M3 8.5 6.4 12 13 4" />,
  folder: <path d="M2 4.5h4l1.3 1.6H14v7.4H2V4.5z" />,
  refresh: (
    <>
      <path d="M13.5 8a5.5 5.5 0 1 1-1.8-4.1" />
      <path d="M13.6 2.2v3.6H10" />
    </>
  ),
  stop: <rect x="4" y="4" width="8" height="8" rx="1" />,
  history: (
    <>
      <circle cx="8" cy="8" r="5.6" />
      <path d="M8 4.4V8l2.6 1.6" />
    </>
  ),
  settings: (
    <>
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 1.4v2M8 12.6v2M1.4 8h2M12.6 8h2M3.3 3.3l1.4 1.4M11.3 11.3l1.4 1.4M12.7 3.3l-1.4 1.4M4.7 11.3l-1.4 1.4" />
    </>
  ),
  user: (
    <>
      <circle cx="8" cy="5.4" r="2.6" />
      <path d="M3 13.6a5 5 0 0 1 10 0" />
    </>
  ),
  sparkle: (
    <>
      <path d="M6.2 1.8 7.3 5.1 10.6 6.2 7.3 7.3 6.2 10.6 5.1 7.3 1.8 6.2 5.1 5.1 6.2 1.8z" />
      <path d="M11.6 9.2l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
    </>
  ),
  more: (
    <>
      <circle cx="3.5" cy="8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="8" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
};

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

/** 内联 SVG 图标，颜色继承父级 */
export function Icon({ name, size = 16, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}
