import { useTerminals } from "../../state/TerminalsContext";
import { Icon } from "../common/Icon";
import { TerminalTabs } from "./TerminalTabs";
import { TerminalView } from "./TerminalView";

export interface EditorAreaProps {
  /** 聚焦请求计数，变化时把键盘焦点交给当前终端 */
  focusRequest?: number;
}

/**
 * 中间区域的编辑器区。
 *
 * 所有终端会话保持挂载，切换标签时只改变可见性，
 * 这样 xterm 的回滚缓冲与光标位置不会因切换而丢失。
 */
export function EditorArea({ focusRequest = 0 }: EditorAreaProps) {
  const { state, dispatch } = useTerminals();

  return (
    <section className="editor-area" aria-label="终端">
      <TerminalTabs
        sessions={state.sessions}
        activeTerminalId={state.activeTerminalId}
        onSelect={(terminalId) =>
          dispatch({ type: "terminal/setActive", terminalId })
        }
        onClose={(terminalId) =>
          dispatch({ type: "terminal/close", terminalId })
        }
      />

      <div className="editor-area__body">
        {state.sessions.length === 0 ? (
          <div className="editor-area__empty">
            <Icon name="terminal" size={40} />
            <p className="editor-area__empty-title">没有打开的终端</p>
            <p className="editor-area__empty-hint">
              在左侧服务器列表中点击一台服务器，即可打开它的终端。
            </p>
          </div>
        ) : (
          state.sessions.map((session) => (
            <TerminalView
              key={session.id}
              session={session}
              active={session.id === state.activeTerminalId}
              focusRequest={focusRequest}
            />
          ))
        )}
      </div>
    </section>
  );
}
