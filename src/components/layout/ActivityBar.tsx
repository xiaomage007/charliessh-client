import { Icon, type IconName } from "../common/Icon";

/** 面板标识 */
export type PanelView = "servers" | "terminal" | "chat";

export interface ActivityBarProps {
  activeView: PanelView;
  onSelect: (view: PanelView) => void;
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
}

interface ActivityItem {
  view: PanelView;
  icon: IconName;
  label: string;
}

/** 活动栏条目 */
const ACTIVITY_ITEMS: ActivityItem[] = [
  { view: "servers", icon: "server", label: "服务器" },
  { view: "terminal", icon: "terminal", label: "终端" },
  { view: "chat", icon: "chat", label: "AI 对话" },
];

/** 最左侧的图标导航条 */
export function ActivityBar({
  activeView,
  onSelect,
  sidebarVisible,
  onToggleSidebar,
}: ActivityBarProps) {
  return (
    <nav className="activity-bar" aria-label="主导航">
      <div className="activity-bar__top">
        {ACTIVITY_ITEMS.map((item) => {
          const isActive =
            activeView === item.view && (item.view !== "servers" || sidebarVisible);
          return (
            <button
              key={item.view}
              type="button"
              className={`activity-bar__item ${isActive ? "activity-bar__item--active" : ""}`.trim()}
              title={item.label}
              aria-label={item.label}
              aria-pressed={isActive}
              onClick={() => {
                if (item.view === "servers") {
                  onToggleSidebar();
                }
                onSelect(item.view);
              }}
            >
              <Icon name={item.icon} size={24} />
            </button>
          );
        })}
      </div>
      <div className="activity-bar__bottom">
        <button
          type="button"
          className="activity-bar__item"
          title="设置"
          aria-label="设置"
        >
          <Icon name="settings" size={24} />
        </button>
      </div>
    </nav>
  );
}
