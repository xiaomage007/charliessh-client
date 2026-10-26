import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Icon, type IconName } from "./Icon";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  /** 无障碍标签，同时作为默认 title */
  label: string;
  size?: number;
}

/** 纯图标按钮 */
export function IconButton({
  icon,
  label,
  size = 16,
  className = "",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`.trim()}
      title={label}
      aria-label={label}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
}

/** 文字按钮 */
export function Button({
  children,
  variant = "secondary",
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`button button--${variant} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
