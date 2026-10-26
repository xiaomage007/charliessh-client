import type { ServerConnectionState, ServersState, SshServer } from "../types";

/** 服务器状态的变更动作 */
export type ServersAction =
  | { type: "server/add"; server: SshServer }
  | { type: "server/update"; server: SshServer }
  | { type: "server/remove"; serverId: string }
  | { type: "server/setConnection"; connection: ServerConnectionState };

export const serversInitialState: ServersState = {
  servers: [],
  connections: {},
};

/** 纯函数 reducer，便于单元测试与后续替换为异步数据源 */
export function serversReducer(
  state: ServersState,
  action: ServersAction,
): ServersState {
  switch (action.type) {
    case "server/add":
      return {
        ...state,
        servers: [...state.servers, action.server],
      };

    case "server/update":
      return {
        ...state,
        servers: state.servers.map((server) =>
          server.id === action.server.id ? action.server : server,
        ),
      };

    case "server/remove": {
      const { [action.serverId]: _removedConnection, ...restConnections } =
        state.connections;
      return {
        servers: state.servers.filter((server) => server.id !== action.serverId),
        connections: restConnections,
      };
    }

    case "server/setConnection":
      return {
        ...state,
        connections: {
          ...state.connections,
          [action.connection.serverId]: action.connection,
        },
      };

    default:
      return state;
  }
}
