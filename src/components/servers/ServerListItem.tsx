import type { ServerStatus, SshServer } from "../../types";
import { IconButton } from "../common/Button";

export interface ServerListItemProps {
  server: SshServer;
  status: ServerStatus;
  active: boolean;
  onConnect: (serverId: string) => void;
  onEdit: (server: SshServer) => void;
  onDelete: (server: SshServer) => void;
}

/** 服务器列表中的单行 */
export function ServerListItem({
  server,
  status,
  active,
  onConnect,
  onEdit,
  onDelete,
}: ServerListItemProps) {
  return (
    <div
      className={`server-item ${active ? "server-item--active" : ""}`.trim()}
      role="button"
      tabIndex={0}
      title={`${server.username}@${server.host}:${server.port}`}
      onClick={() => onConnect(server.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onConnect(server.id);
        }
      }}
    >
      <span className={`status-dot status-dot--${status}`} />
      <span className="server-item__body">
        <span className="server-item__name">{server.name}</span>
        <span className="server-item__host">
          {server.username}@{server.host}:{server.port}
        </span>
      </span>
      <span className="server-item__actions">
        <IconButton
          icon="edit"
          label={`编辑 ${server.name}`}
          size={13}
          onClick={(event) => {
            event.stopPropagation();
            onEdit(server);
          }}
        />
        <IconButton
          icon="trash"
          label={`删除 ${server.name}`}
          size={13}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(server);
          }}
        />
      </span>
    </div>
  );
}
