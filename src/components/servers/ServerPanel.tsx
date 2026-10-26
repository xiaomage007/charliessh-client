import { useEffect, useMemo, useRef, useState } from "react";

import { useServerActions } from "../../hooks/useServerActions";
import { useServers } from "../../state/ServersContext";
import { useTerminals } from "../../state/TerminalsContext";
import type { ServerFormValues, SshServer } from "../../types";
import { Icon } from "../common/Icon";
import { Button, IconButton } from "../common/Button";
import { Modal } from "../common/Modal";
import { PanelHeader } from "../layout/PanelHeader";
import { ServerForm } from "./ServerForm";
import { ServerList } from "./ServerList";

export interface ServerPanelProps {
  /** 面板是否处于激活状态，用于配合快捷键聚焦 */
  active: boolean;
}

/** 左侧服务器配置面板 */
export function ServerPanel({ active }: ServerPanelProps) {
  const { state } = useServers();
  const { state: terminalState } = useTerminals();
  const { addServer, updateServer, removeServer, openTerminal } =
    useServerActions();

  const [keyword, setKeyword] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SshServer | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SshServer | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // 面板被激活时把焦点交给搜索框
  useEffect(() => {
    if (active) searchRef.current?.focus();
  }, [active]);

  const filtered = useMemo(() => {
    const trimmed = keyword.trim().toLowerCase();
    if (!trimmed) return state.servers;
    return state.servers.filter((server) =>
      [server.name, server.host, server.username, server.group ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(trimmed),
    );
  }, [keyword, state.servers]);

  const activeServerId =
    terminalState.sessions.find(
      (session) => session.id === terminalState.activeTerminalId,
    )?.serverId ?? null;

  const handleSubmit = (values: ServerFormValues) => {
    if (editing) {
      updateServer(editing.id, values);
    } else {
      addServer(values);
    }
    setFormOpen(false);
    setEditing(null);
  };

  return (
    <section className="server-panel" aria-label="服务器配置">
      <PanelHeader
        title="服务器"
        icon="server"
        actions={
          <IconButton
            icon="plus"
            label="添加服务器"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          />
        }
      />

      <div className="server-panel__toolbar">
        <div className="server-panel__search">
          <Icon name="search" size={13} />
          <input
            ref={searchRef}
            className="server-panel__search-input"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索服务器"
            aria-label="搜索服务器"
          />
        </div>
      </div>

      <div className="server-panel__list">
        <ServerList
          servers={filtered}
          connections={state.connections}
          activeServerId={activeServerId}
          onConnect={openTerminal}
          onEdit={(server) => {
            setEditing(server);
            setFormOpen(true);
          }}
          onDelete={(server) => setPendingDelete(server)}
        />
      </div>

      <ServerForm
        open={formOpen}
        server={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

      <Modal
        open={pendingDelete !== null}
        title="删除服务器"
        width={400}
        onClose={() => setPendingDelete(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (pendingDelete) removeServer(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              删除
            </Button>
          </>
        }
      >
        <p className="server-panel__delete-hint">
          确定要删除服务器「{pendingDelete?.name}」吗？
        </p>
        <p className="form__hint">
          该服务器已打开的终端会话会一并关闭。此操作不可撤销。
        </p>
      </Modal>
    </section>
  );
}
