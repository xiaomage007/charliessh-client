import { useEffect, type ReactNode } from "react";

import { IconButton } from "./Button";

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** 底部操作区 */
  footer?: ReactNode;
  /** 宽度像素 */
  width?: number;
}

/** 模态弹层 */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  width = 460,
}: ModalProps) {
  // Esc 关闭
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal"
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <span className="modal__title">{title}</span>
          <IconButton icon="close" label="关闭" onClick={onClose} />
        </div>
        <div className="modal__body">{children}</div>
        {footer ? <div className="modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
