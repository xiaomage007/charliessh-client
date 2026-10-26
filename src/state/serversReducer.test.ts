import { describe, expect, it } from "vitest";

import {
  serversInitialState,
  serversReducer,
  type ServersAction,
} from "./serversReducer";
import type { SshServer } from "../types";

/** 构造一台测试用服务器 */
function makeServer(id: string, overrides: Partial<SshServer> = {}): SshServer {
  return {
    id,
    name: "测试服务器",
    host: "10.0.0.1",
    port: 22,
    username: "root",
    authType: "password",
    password: "",
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

/** 按顺序派发动作 */
function reduce(
  state = serversInitialState,
  actions: ServersAction[],
): typeof serversInitialState {
  return actions.reduce(
    (current, action) => serversReducer(current, action),
    state,
  );
}

describe("serversReducer", () => {
  it("添加服务器后写入列表", () => {
    const server = makeServer("srv_1");
    const state = reduce(serversInitialState, [{ type: "server/add", server }]);

    expect(state.servers).toHaveLength(1);
    expect(state.servers[0]?.name).toBe("测试服务器");
  });

  it("更新服务器时保留 id 与创建时间", () => {
    const server = makeServer("srv_1");
    const added = reduce(serversInitialState, [{ type: "server/add", server }]);
    const updated = serversReducer(added, {
      type: "server/update",
      server: { ...server, name: "改名后", updatedAt: 2000 },
    });

    expect(updated.servers).toHaveLength(1);
    expect(updated.servers[0]?.name).toBe("改名后");
    expect(updated.servers[0]?.id).toBe("srv_1");
    expect(updated.servers[0]?.createdAt).toBe(1000);
    expect(updated.servers[0]?.updatedAt).toBe(2000);
  });

  it("删除服务器同时清掉连接状态", () => {
    const server = makeServer("srv_1");
    const state = reduce(serversInitialState, [
      { type: "server/add", server },
      {
        type: "server/setConnection",
        connection: { serverId: "srv_1", status: "connected" },
      },
      { type: "server/remove", serverId: "srv_1" },
    ]);

    expect(state.servers).toHaveLength(0);
    expect(state.connections.srv_1).toBeUndefined();
  });

  it("更新连接状态时按 serverId 建立索引", () => {
    const state = reduce(serversInitialState, [
      {
        type: "server/setConnection",
        connection: { serverId: "srv_1", status: "connecting" },
      },
      {
        type: "server/setConnection",
        connection: { serverId: "srv_1", status: "connected", connectedAt: 9 },
      },
    ]);

    expect(state.connections.srv_1?.status).toBe("connected");
    expect(state.connections.srv_1?.connectedAt).toBe(9);
  });
});
