import type { ReactNode } from "react";

import { Icon, type IconName } from "../common/Icon";

export interface PanelHeaderProps {
  title: string;
  icon?: IconName;
  /** 标题右侧的操作区 */
  actions?: ReactNode;
}

/** 面板标题栏，VS Code 风格 */
export function PanelHeader({ title, icon, actions }: PanelHeaderProps) {
  return (
    <div className="panel-header">
      <span className="panel-header__title">
        {icon ? <Icon name={icon} size={14} /> : null}
        {title}
      </span>
      {actions ? <div className="panel-header__actions">{actions}</div> : null}
    </div>
  );
}
