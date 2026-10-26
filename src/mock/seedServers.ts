import { DEFAULT_SSH_PORT } from "../constants/layout";
import type { SshServer } from "../types";

/** 初始的示例服务器，仅存在于内存，刷新页面即丢失 */
const SEED_SERVERS: ReadonlyArray<
  Omit<SshServer, "id" | "createdAt" | "updatedAt">
> = [
  {
    name: "生产网关",
    host: "10.20.0.11",
    port: 22,
    username: "deploy",
    authType: "key",
    privateKeyPath: "~/.ssh/id_ed25519_prod",
    group: "生产环境",
    description: "对外网关，承载南北向流量",
  },
  {
    name: "生产数据库",
    host: "10.20.0.31",
    port: 22,
    username: "dba",
    authType: "password",
    password: "",
    group: "生产环境",
    description: "主库，只读账号用于日常巡检",
  },
  {
    name: "测试环境 Web",
    host: "10.30.1.12",
    port: 22,
    username: "app",
    authType: "key",
    privateKeyPath: "~/.ssh/id_ed25519_test",
    group: "测试环境",
    description: "预发布验证机",
  },
  {
    name: "跳板机",
    host: "bastion.corp.internal",
    port: 2222,
    username: "ops",
    authType: "password",
    password: "",
    group: "基础设施",
    description: "内网跳板，所有内网访问经此进入",
  },
  {
    name: "本地开发机",
    host: "127.0.0.1",
    port: DEFAULT_SSH_PORT,
    username: "root",
    authType: "password",
    password: "",
    group: "本地",
    description: "本机调试用",
  },
];

/** 生成初始服务器列表 */
export function seedServers(): SshServer[] {
  const now = Date.now();
  return SEED_SERVERS.map((server, index) => ({
    ...server,
    id: `srv_seed_${index + 1}`,
    createdAt: now,
    updatedAt: now,
  }));
}
