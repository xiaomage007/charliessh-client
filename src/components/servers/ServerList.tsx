import { useMemo } from "react";

import type { ServerStatus, SshServer } from "../../types";
import { ServerListItem } from "./ServerListItem";

export interface ServerListProps {
  servers: SshServer[];
  /** 服务器 id 到连接状态的映射 */
  connections: Record<string, { status: ServerStatus }>;
  /** 当前打开终端的服务器 id */
  activeServerId: string | null;
  onConnect: (serverId: string) => void;
  onEdit: (server: SshServer) => void;
  onDelete: (server: SshServer) => void;
}

/** 未分组的分组名 */
const UNGROUPED = "未分组";

/** 服务器列表，按分组折叠展示 */
export function ServerList({
  servers,
  connections,
  activeServerId,
  onConnect,
  onEdit,
  onDelete,
}: ServerListProps) {
  const groups = useMemo(() => {
    const map = new Map<string, SshServer[]>();
    for (const server of servers) {
      const key = server.group ?? UNGROUPED;
      const bucket = map.get(key);
      if (bucket) bucket.push(server);
      else map.set(key, [server]);
    }
    return [...map.entries()];
  }, [servers]);

  if (servers.length === 0) {
    return (
      <div className="server-list__empty">
        <p>还没有配置服务器</p>
        <p className="server-list__empty-hint">
          点击上方「添加服务器」创建第一条连接配置
        </p>
      </div>
    );
  }

  return (
    <div className="server-list">
      {groups.map(([group, items]) => (
        <div key={group} className="server-group">
          <div className="server-group__header">
            <IconChevron />
            <span>{group}</span>
            <span className="server-group__count">{items.length}</span>
          </div>
          {items.map((server) => (
            <ServerListItem
              key={server.id}
              server={server}
              status={connections[server.id]?.status ?? "disconnected"}
              active={server.id === activeServerId}
              onConnect={onConnect}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** 分组标题前的折叠箭头 */
function IconChevron() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.5 6.5 8 10l3.5-3.5" />
    </svg>
  );
}
