import { useCallback } from "react";

import { homeDirFor } from "../mock/mockFs";
import { useServers } from "../state/ServersContext";
import { useTerminals } from "../state/TerminalsContext";
import type { ServerFormValues, SshServer, TerminalSession } from "../types";
import { generateId } from "../utils/id";

/** 跨服务器与终端两个状态切片的操作集合 */
export interface ServerActions {
  addServer: (values: ServerFormValues) => SshServer;
  updateServer: (serverId: string, values: ServerFormValues) => void;
  removeServer: (serverId: string) => void;
  /** 打开服务器对应的终端，已存在则激活 */
  openTerminal: (serverId: string) => void;
}

/** 把表单值转换为服务器实体 */
function toServer(values: ServerFormValues, previous?: SshServer): SshServer {
  const now = Date.now();
  return {
    id: previous?.id ?? generateId("srv"),
    name: values.name.trim(),
    host: values.host.trim(),
    port: values.port,
    username: values.username.trim(),
    authType: values.authType,
    password: values.authType === "password" ? values.password : undefined,
    privateKeyPath:
      values.authType === "key" ? values.privateKeyPath.trim() : undefined,
    group: values.group.trim() || undefined,
    description: values.description.trim() || undefined,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
}

/**
 * 服务器相关的复合操作。
 *
 * 之所以单独抽一个 hook，是因为"删除服务器要连带清理它的终端会话"、
 * "连接服务器要在中间区域开终端"这类操作同时跨越了两个状态切片。
 */
export function useServerActions(): ServerActions {
  const {
    state: serverState,
    dispatch: serverDispatch,
  } = useServers();
  const {
    state: terminalState,
    dispatch: terminalDispatch,
  } = useTerminals();

  const addServer = useCallback(
    (values: ServerFormValues): SshServer => {
      const server = toServer(values);
      serverDispatch({ type: "server/add", server });
      return server;
    },
    [serverDispatch],
  );

  const updateServer = useCallback(
    (serverId: string, values: ServerFormValues): void => {
      const previous = serverState.servers.find(
        (server) => server.id === serverId,
      );
      if (!previous) return;
      serverDispatch({
        type: "server/update",
        server: toServer(values, previous),
      });
    },
    [serverDispatch, serverState.servers],
  );

  const removeServer = useCallback(
    (serverId: string): void => {
      // 连带清理该服务器下的所有终端会话与输出历史
      const related = terminalState.sessions.filter(
        (session) => session.serverId === serverId,
      );
      for (const session of related) {
        terminalDispatch({ type: "terminal/close", terminalId: session.id });
      }
      serverDispatch({ type: "server/remove", serverId });
    },
    [serverDispatch, terminalDispatch, terminalState.sessions],
  );

  const openTerminal = useCallback(
    (serverId: string): void => {
      const server = serverState.servers.find(
        (item) => item.id === serverId,
      );
      if (!server) return;

      const existing = terminalState.sessions.find(
        (session) => session.serverId === serverId,
      );
      if (existing) {
        terminalDispatch({
          type: "terminal/setActive",
          terminalId: existing.id,
        });
        return;
      }

      const now = Date.now();
      const session: TerminalSession = {
        id: generateId("term"),
        serverId,
        title: server.name,
        cwd: homeDirFor(server.username),
        status: "connected",
        createdAt: now,
        lastActiveAt: now,
      };
      terminalDispatch({ type: "terminal/open", session });
      serverDispatch({
        type: "server/setConnection",
        connection: {
          serverId,
          status: "connected",
          connectedAt: now,
        },
      });
    },
    [serverDispatch, serverState.servers, terminalDispatch, terminalState.sessions],
  );

  return { addServer, updateServer, removeServer, openTerminal };
}
