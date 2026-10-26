import type { TerminalSession } from "../../types";
import { IconButton } from "../common/Button";

export interface TerminalTabsProps {
  sessions: TerminalSession[];
  activeTerminalId: string | null;
  onSelect: (terminalId: string) => void;
  onClose: (terminalId: string) => void;
}

/** 中间区域的终端标签栏 */
export function TerminalTabs({
  sessions,
  activeTerminalId,
  onSelect,
  onClose,
}: TerminalTabsProps) {
  if (sessions.length === 0) {
    return <div className="terminal-tabs terminal-tabs--empty" />;
  }

  return (
    <div className="terminal-tabs" role="tablist" aria-label="终端标签页">
      {sessions.map((session) => {
        const isActive = session.id === activeTerminalId;
        return (
          <div
            key={session.id}
            className={`terminal-tab ${isActive ? "terminal-tab--active" : ""}`.trim()}
            role="tab"
            aria-selected={isActive}
            tabIndex={0}
            onClick={() => onSelect(session.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(session.id);
              }
            }}
          >
            <span className={`status-dot status-dot--${session.status}`} />
            <span className="terminal-tab__title">{session.title}</span>
            <IconButton
              icon="close"
              label={`关闭 ${session.title}`}
              size={12}
              className="terminal-tab__close"
              onClick={(event) => {
                event.stopPropagation();
                onClose(session.id);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
