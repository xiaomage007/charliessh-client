import type { AgentDefinition } from "../types";

/** 一次 AI 请求的输入 */
export interface AiRequest {
  agent: AgentDefinition;
  /** 用户本轮输入 */
  userMessage: string;
  /** 当前终端输出的最近若干行，agent 开启上下文时附带 */
  terminalContext?: string;
}

/** 知识库条目 */
interface KnowledgeEntry {
  /** 命中关键词 */
  keywords: string[];
  /** 运维助手视角的回答 */
  ops: string;
  /** 开发助手视角的回答 */
  dev: string;
  /** 通用助手视角的回答 */
  general: string;
  /** 数据分析师视角的回答 */
  analyst: string;
}

/** 关键词知识库 */
const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    keywords: ["nginx", "502", "504", "网关", "gateway"],
    ops: `先说结论：502/504 基本都是**上游应用没有及时响应**，而不是 nginx 本身挂了。

按下面顺序排查，命中率从高到低：

\`\`\`bash
# 1. 看 nginx 自己是否还活着
systemctl status nginx

# 2. 看上游应用是否在跑、端口是否监听
systemctl status charlie-api
ss -lntp | grep 8080

# 3. 直接打上游，绕过 nginx 判断问题在哪一层
curl -v --max-time 5 http://127.0.0.1:8080/api/v1/orders

# 4. 看错误日志里的真实原因
tail -n 200 /var/log/nginx/error.log
\`\`\`

风险提示：重启 nginx 会中断所有长连接，执行前确认当前没有大流量导入任务。

如果第 3 步也超时，说明问题在应用侧，优先看应用日志：

\`\`\`bash
journalctl -u charlie-api -n 200 --no-pager
\`\`\``,
    dev: `502 与 504 在应用侧通常对应同一个问题：**上游处理超时**。可以从三个层面收敛。

\`\`\`ts
// 1. 给上游调用加超时，避免无限等待
const upstream = await fetch("http://127.0.0.1:8080/api/v1/orders", {
  signal: AbortSignal.timeout(5_000),
});

// 2. 对超时做降级，返回缓存或默认值而不是直接抛错
try {
  return await upstream.json();
} catch (error) {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return { items: [], degraded: true };
  }
  throw error;
}
\`\`\`

nginx 侧的对应配置是 \`proxy_read_timeout\`，建议与应用的超时时间保持一致并且**应用的略小**，这样超时由应用判定并返回降级结果，而不是由 nginx 粗暴切断。`,
    general: `502 和 504 的含义不同：502 表示上游返回了无效响应，504 表示上游在超时时间内没有返回任何响应。

实际排查中两者经常指向同一个根源——**上游服务处理过慢或已经不可用**。建议先确认上游服务自身状态，再看反向代理层的超时配置是否过短。

如果你能提供上游服务的日志和代理配置，可以进一步定位。`,
    analyst: `先给结论：502/504 的出现率是当前最需要关注的服务质量指标。

| 指标 | 当前值 | 阈值 | 状态 |
|---|---|---|---|
| 5xx 错误率 | 3.2% | < 0.5% | 异常 |
| P95 响应耗时 | 4.8s | < 1.0s | 异常 |
| 网关请求量 | 12,480/min | - | 正常 |

口径说明：错误率统计窗口为最近 15 分钟，来源为 nginx access.log；耗时为网关侧观测值。

下一步动作：按请求路径拆分 5xx 分布，确认是否集中在单一上游接口。`,
  },
  {
    keywords: ["磁盘", "disk", "df", "空间", "inode"],
    ops: `先说结论：磁盘打满通常不是数据涨上来的，而是**日志没有被轮转**。

\`\`\`bash
# 1. 确认是哪个分区满了，注意 inode 也可能先耗尽
df -h
df -i

# 2. 找出占用最大的目录
du -sh /var/log/* 2>/dev/null | sort -h | tail -n 10

# 3. 定位大文件
find / -xdev -type f -size +500M -exec ls -lh {} \\; 2>/dev/null
\`\`\`

清理时注意：

- \`rm\` 正在被进程写入的文件不会释放空间，需要先重启对应服务或用 \`truncate -s 0\`
- 直接删 \`/var/log\` 下的文件会丢失审计日志，优先配置 logrotate

长期方案是给 journald 加上 \`SystemMaxUse=2G\`，避免日志无上限增长。`,
    dev: `磁盘占用问题在服务端通常有三种成因，处理方式不同：

\`\`\`ts
// 1. 日志无限增长 —— 给写入加轮转，而不是在磁盘满了才处理
const logger = pino({
  transport: {
    targets: [
      { target: "pino/file", options: { path: "/var/log/app.log" } },
    ],
  },
});
\`\`\`

\`\`\`bash
# 2. 临时文件泄漏 —— 定期清理并设置上限
find /tmp -type f -mtime +7 -delete
\`\`\`

\`\`\`bash
# 3. 运行时缓存无上限 —— 配置淘汰策略
maxmemory 512mb
maxmemory-policy allkeys-lru
\`\`\`

关键点：磁盘类问题的正确解法是**在写入侧限制增长**，事后清理只能止血。`,
    general: `磁盘空间不足通常有三个来源：日志无限增长、临时文件未清理、运行时缓存没有淘汰策略。

建议先确认是空间耗尽还是 inode 耗尽（\`df -h\` 与 \`df -i\`），两者的排查方向完全不同：前者找大文件，后者找小文件数量的异常增长。`,
    analyst: `结论：磁盘使用率已越过告警线，增长趋势来自日志目录。

| 挂载点 | 容量 | 已用 | 使用率 | 周环比 |
|---|---|---|---|---|
| / | 80G | 37G | 50% | +4% |
| /data | 200G | 128G | 68% | +9% |
| /var/log | 40G | 31G | 82% | +11% |

口径说明：使用率为 \`df\` 快照值，周环比基于上周同期的定时采集。

下一步动作：确认 \`/var/log\` 的周增量是否线性，若持续线性增长则应改为按天归档。`,
  },
  {
    keywords: ["内存", "memory", "oom", "free", "泄漏", "leak"],
    ops: `先说结论：内存问题要区分**真的泄漏**和**缓存占用**，两者的处理方式完全不同。

\`\`\`bash
# 1. 看整体使用情况，重点关注 available 而非 free
free -h

# 2. 找出内存占用最高的进程
ps aux --sort=-%mem | head -n 10

# 3. 确认是否有 OOM 记录
dmesg -T | grep -i "killed process"
\`\`\`

如果 \`available\` 充足但进程 RSS 持续上涨，那才是泄漏；这时候需要：

\`\`\`bash
# 观察进程内存随时间的变化趋势
while true; do
  ps -o pid,rss,etime,cmd -p 2481
  sleep 60
done
\`\`\`

临时缓解可以调整 \`vm.swappiness\` 或限制单进程内存，但**不要用 swap 掩盖泄漏**，那只会把崩溃推迟。`,
    dev: `内存占用高不一定是泄漏，Linux 的 page cache 会把空闲内存吃掉，\`free\` 低但 \`available\` 高是正常现象。

真正的泄漏通常表现为进程 RSS 单调上涨且不回落：

\`\`\`ts
// 常见泄漏点：全局 Map / 事件监听未解绑 / 闭包持有大对象
const cache = new Map<string, Buffer>(); // 只写不清，内存持续增长

export function subscribe(socket: Socket) {
  socket.on("data", (chunk) => {
    cache.set(socket.id, Buffer.concat([cache.get(socket.id)!, chunk]));
  });
}
\`\`\`

排查手段：Node 可以用 \`process.memoryUsage()\` 打点，或在压测中观察 \`heapUsed\` 的斜率。修复的关键是**给缓存加上界**（LRU / TTL）并解绑监听器。`,
    general: `内存问题排查的第一步是区分"缓存占用"和"内存泄漏"。

Linux 会把空闲内存用于 page cache，所以 \`free\` 命令显示的可用内存低并不一定是问题，应该看 \`available\` 这一列。如果 \`available\` 也不足，再去排查进程的常驻内存是否持续增长。

需要更多细节的话，可以提供进程的内存使用曲线和 \`dmesg\` 中的 OOM 记录。`,
    analyst: `结论：内存使用率在业务高峰达到 94%，已触发过 2 次 OOM。

| 指标 | 当前值 | 峰值 | 阈值 | 状态 |
|---|---|---|---|---|
| 内存使用率 | 71% | 94% | < 85% | 关注 |
| Swap 使用 | 128Mi | 512Mi | - | 正常 |
| OOM 次数(24h) | 0 | 2 | 0 | 异常 |
| 主要占用进程 | node (2481) | - | - | - |

口径说明：使用率取自节点 exporter 的 \`node_memory_MemAvailable_bytes\` 反算。

下一步动作：采集 heap profile，确认增长来自业务对象还是外部缓存。`,
  },
  {
    keywords: ["部署", "deploy", "发布", "回滚", "rollback", "流水线", "ci"],
    ops: `先说结论：部署脚本要保证**任何一步失败都不会留下半成品状态**。

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/app"
SERVICE="charlie-api"
BACKUP="\${APP_DIR}.bak.\$(date +%s)"

# 1. 先备份当前版本，出问题可秒回滚
cp -a "\${APP_DIR}" "\${BACKUP}"

# 2. 部署新版本
cd "\${APP_DIR}"
git fetch --all --tags
git checkout "\${GIT_TAG:-main}"
npm ci --omit=dev
npm run build

# 3. 重启并验证，失败自动回滚
if ! systemctl restart "\${SERVICE}" || ! systemctl is-active --quiet "\${SERVICE}"; then
  echo "发布失败，回滚到 \${BACKUP}"
  rm -rf "\${APP_DIR}"
  cp -a "\${BACKUP}" "\${APP_DIR}"
  systemctl restart "\${SERVICE}"
  exit 1
fi

rm -rf "\${BACKUP}"
\`\`\`

关键点：备份必须在部署**之前**做，验证必须在重启**之后**做，缺一不可。`,
    dev: `部署脚本的核心是**可回滚**。我建议把发布过程拆成三段，每段都有明确的验证点：

\`\`\`ts
// deploy.ts —— 用代码代替 shell，便于编排与错误处理
async function deploy(tag: string): Promise<void> {
  const backup = await backupCurrent();
  try {
    await checkout(tag);
    await run("npm ci --omit=dev");
    await run("npm run build");

    await restart("charlie-api");
    await waitForHealthy("http://127.0.0.1:8080/healthz", { timeout: 30_000 });
  } catch (error) {
    await restore(backup);
    await restart("charlie-api");
    throw new Error(\`部署 \${tag} 失败，已回滚: \${error}\`);
  } finally {
    await cleanup(backup);
  }
}
\`\`\`

要点：

- 健康检查用探针而不是 \`systemctl is-active\`，后者只说明进程活着，不代表能服务
- 回滚路径要独立于部署路径，否则部署脚本本身出错时无法自救`,
    general: `部署流程建议围绕"可回滚"来设计，核心是三个动作：**部署前备份、部署后验证、失败自动回滚**。

另外建议把版本号写进产物里，这样线上出问题能立刻确认跑的是哪个版本。`,
    analyst: `结论：本迭代发布 17 次，成功率 94.1%，失败集中在依赖安装阶段。

| 指标 | 数值 | 环比 | 状态 |
|---|---|---|---|
| 发布次数 | 17 | +5 | - |
| 成功率 | 94.1% | -2.3% | 下降 |
| 平均耗时 | 4m12s | +38s | 上升 |
| 回滚次数 | 1 | +1 | 关注 |
| 平均故障恢复时长 | 3m40s | -20s | 改善 |

口径说明：成功率按"流水线全部阶段绿灯"计；耗时为触发到健康检查通过。

下一步动作：排查失败的三次是否都由 \`npm ci\` 的 lock 文件冲突引起。`,
  },
  {
    keywords: ["docker", "容器", "container", "镜像", "image"],
    ops: `先说结论：容器问题先看**状态与退出码**，再看日志。

\`\`\`bash
# 1. 确认容器状态与退出码
docker ps -a --filter name=charlie-api

# 2. 看退出日志（容器已停止时用 logs 更直接）
docker logs --tail 200 charlie-api

# 3. 进入容器排查环境变量与挂载
docker exec -it charlie-api env | sort
docker inspect charlie-api --format '{{json .Mounts}}'

# 4. 资源占用
docker stats --no-stream
\`\`\`

常见结论对照：

| 现象 | 原因 |
|---|---|
| 退出码 137 | 被 OOM Killer 杀掉，需调高内存限制 |
| 退出码 127 | 入口命令不存在，多为路径写错 |
| 退出码 1 | 应用自身抛错，看 logs |
| 一直 restarting | 健康检查配置与实际端口不一致 |`,
    dev: `容器化部署最常见的问题是**镜像与配置不一致**。写 Dockerfile 时注意：

\`\`\`dockerfile
# 多阶段构建：构建产物与运行镜像分离
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
USER node
CMD ["node", "dist/main.js"]
\`\`\`

要点：\`.dockerignore\` 必须包含 \`node_modules\`、\`.git\`、\`dist\`，否则构建上下文会暴涨；运行阶段用 \`--omit=dev\` 并显式切到非 root 用户。`,
    general: `排查容器问题建议按这个顺序：状态与退出码 → 日志 → 容器内环境 → 资源占用。

退出码是最快的线索：137 是内存不足，127 是命令路径不对，1 通常是应用自身报错。`,
    analyst: `结论：容器运行时长与重启次数分布如下，重启集中在发布窗口。

| 容器 | 运行时长 | 重启次数 | CPU 均值 | 内存均值 |
|---|---|---|---|---|
| charlie-api | 3h12m | 0 | 22% | 41% |
| charlie-api-redis | 3h12m | 0 | 4% | 12% |

口径说明：统计窗口为最近 24 小时；重启次数不含发布触发的一次。

下一步动作：把 CPU 均值与请求量做相关性分析，确认是否存在资源不足导致的响应变慢。`,
  },
];

/** 兜底的通用回答 */
function buildFallback(agentId: string, userMessage: string): string {
  const topic = userMessage.trim().slice(0, 40) || "这个问题";
  switch (agentId) {
    case "ops":
      return `先说结论：针对「${topic}」，建议先收集事实再动手。

\`\`\`bash
# 先看当前系统状态
uptime
free -h
df -h
systemctl --failed
\`\`\`

把上面的输出贴给我，可以进一步判断问题范围。`;
    case "dev":
      return `关于「${topic}」，我建议从下面这个骨架开始：

\`\`\`ts
// 明确输入输出契约，再补实现
interface HandlerOptions {
  timeoutMs: number;
  retries: number;
}

async function handle(input: Input, options: HandlerOptions): Promise<Result> {
  // 1. 参数校验
  // 2. 主流程
  // 3. 错误兜底
}
\`\`\`

需要更具体的实现的话，把相关代码贴过来。`;
    case "analyst":
      return `针对「${topic}」，目前缺少可量化的口径，先确认三件事：

| 待确认项 | 说明 |
|---|---|
| 统计口径 | 按请求、按用户还是按资源维度 |
| 时间范围 | 实时、小时级还是日级 |
| 对比基准 | 与上周同期还是与目标值比 |

口径确定后我可以给出对应的分析框架。`;
    default:
      return `关于「${topic}」，我的理解是：

${
  userMessage.trim().length > 60
    ? "你提到的场景包含的信息比较多"
    : "你提到的场景"
}，通常可以拆成几个部分来看：先明确目标是什么，再看当前状态与目标之间的差距，最后决定是调整目标还是补齐手段。

可以再多说一些上下文，我给你更具体的建议。`;
  }
}

/** 截取终端上下文里的关键行 */
function summarizeTerminalContext(context: string): string {
  const lines = context
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(-8);
  if (lines.length === 0) return "";
  return lines.map((line) => `> ${line}`).join("\n");
}

/** 组装完整回复文本 */
export function buildAiResponse(request: AiRequest): string {
  const { agent, userMessage, terminalContext } = request;
  const matched = KNOWLEDGE_BASE.find((entry) =>
    entry.keywords.some((keyword) =>
      userMessage.toLowerCase().includes(keyword.toLowerCase()),
    ),
  );

  let body: string;
  if (matched) {
    switch (agent.id) {
      case "ops":
        body = matched.ops;
        break;
      case "dev":
        body = matched.dev;
        break;
      case "analyst":
        body = matched.analyst;
        break;
      default:
        body = matched.general;
    }
  } else {
    body = buildFallback(agent.id, userMessage);
  }

  const footer = `\n\n---\n\n*由 **${agent.name}**（${agent.defaultModel}）生成，当前为 Mock 回复。*`;

  if (!agent.includeTerminalContext || !terminalContext) {
    return `${body}${footer}`;
  }

  const contextBlock = summarizeTerminalContext(terminalContext);
  if (!contextBlock) {
    return `${body}${footer}`;
  }
  return `> 已读取当前终端的最近输出作为上下文：\n>\n${contextBlock}\n\n${body}${footer}`;
}

/**
 * 流式生成 AI 回复。
 *
 * 下期接入真实模型时，把本函数替换为 `invoke("ai_chat")` + SSE 分片解析，
 * 调用方只需消费同样的字符串片段即可。
 */
export function* generateAiResponse(request: AiRequest): Generator<string> {
  const text = buildAiResponse(request);
  // 按段落切分，段落之间由调用方插入更长的停顿
  for (const paragraph of text.split("\n\n")) {
    yield paragraph;
  }
}
