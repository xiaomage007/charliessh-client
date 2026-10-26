import { useCallback, useEffect, useState } from "react";

import { ChatPanel } from "./components/chat/ChatPanel";
import { ActivityBar, type PanelView } from "./components/layout/ActivityBar";
import { StatusBar } from "./components/layout/StatusBar";
import { EditorArea } from "./components/terminal/EditorArea";
import { ServerPanel } from "./components/servers/ServerPanel";
import { useChatActions } from "./hooks/useChatActions";
import { ChatProvider } from "./state/ChatContext";
import { ServersProvider } from "./state/ServersContext";
import { TerminalsProvider } from "./state/TerminalsContext";

/** 三栏骨架与全局快捷键 */
function AppShell() {
  const [activeView, setActiveView] = useState<PanelView>("servers");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [terminalFocusRequest, setTerminalFocusRequest] = useState(0);
  const [chatFocusRequest, setChatFocusRequest] = useState(0);
  const { createConversation } = useChatActions();

  const handleSelectView = useCallback((view: PanelView): void => {
    setActiveView(view);
    if (view === "terminal") {
      setTerminalFocusRequest((count) => count + 1);
    }
    if (view === "chat") {
      setChatFocusRequest((count) => count + 1);
    }
  }, []);

  const handleNewConversation = useCallback((): void => {
    createConversation();
    setActiveView("chat");
    setChatFocusRequest((count) => count + 1);
  }, [createConversation]);

  // 全局快捷键：Ctrl+B 折叠侧栏、Ctrl+` 聚焦终端、Ctrl+N 新建对话
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!event.ctrlKey || event.altKey || event.shiftKey) return;

      if (event.key === "b" || event.key === "B") {
        event.preventDefault();
        setSidebarVisible((visible) => !visible);
        return;
      }
      if (event.key === "`") {
        event.preventDefault();
        setActiveView("terminal");
        setTerminalFocusRequest((count) => count + 1);
        return;
      }
      if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        handleNewConversation();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNewConversation]);

  return (
    <div
      className={`app-shell ${
        sidebarVisible ? "" : "app-shell--sidebar-hidden"
      }`.trim()}
    >
      <ActivityBar
        activeView={activeView}
        onSelect={handleSelectView}
        sidebarVisible={sidebarVisible}
        onToggleSidebar={() => setSidebarVisible((visible) => !visible)}
      />

      {sidebarVisible ? (
        <ServerPanel active={activeView === "servers"} />
      ) : (
        <div className="app-shell__sidebar-placeholder" />
      )}

      <EditorArea focusRequest={terminalFocusRequest} />

      <ChatPanel focusRequest={chatFocusRequest} />

      <StatusBar />
    </div>
  );
}

export default function App() {
  return (
    <ServersProvider>
      <TerminalsProvider>
        <ChatProvider>
          <AppShell />
        </ChatProvider>
      </TerminalsProvider>
    </ServersProvider>
  );
}
