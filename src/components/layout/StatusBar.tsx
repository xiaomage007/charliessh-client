import { useServers } from "../../state/ServersContext";
import { useTerminals } from "../../state/TerminalsContext";

/** 底部状态栏 */
export function StatusBar() {
  const { state: serverState } = useServers();
  const { state: terminalState } = useTerminals();

  const activeSession = terminalState.sessions.find(
    (session) => session.id === terminalState.activeTerminalId,
  );
  const activeServer = serverState.servers.find(
    (server) => server.id === activeSession?.serverId,
  );
  const connectedCount = Object.values(serverState.connections).filter(
    (connection) => connection.status === "connected",
  ).length;

  return (
    <footer className="status-bar">
      <span className="status-bar__item">
        <span
          className={`status-dot status-dot--${
            connectedCount > 0 ? "connected" : "disconnected"
          }`}
        />
        {connectedCount > 0 ? `${connectedCount} 台已连接` : "未连接"}
      </span>
      <span className="status-bar__item">
        {activeServer
          ? `${activeServer.username}@${activeServer.host}:${activeServer.port}`
          : "未选择服务器"}
      </span>
      <span className="status-bar__spacer" />
      <span className="status-bar__item">{activeSession?.cwd ?? "~"}</span>
      <span className="status-bar__item">UTF-8</span>
      <span className="status-bar__item">LF</span>
      <span className="status-bar__item">Mock 环境</span>
    </footer>
  );
}
