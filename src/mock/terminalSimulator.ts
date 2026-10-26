import {
  TERMINAL_LINE_DELAY_MS,
  TERMINAL_SLOW_LINE_DELAY_MS,
} from "../constants/layout";
import type { TerminalLineKind } from "../types";
import { HOME_DIRS, MOCK_FS, type MockEntry } from "./mockFs";

/** ANSI 转义序列 */
const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
} as const;

/** 给文本包裹 ANSI 颜色 */
function paint(text: string, color: string): string {
  return `${color}${text}${ANSI.reset}`;
}

/** 模拟终端的执行上下文 */
export interface TerminalContext {
  serverId: string;
  serverName: string;
  host: string;
  username: string;
  /** 当前工作目录 */
  cwd: string;
  /** 终端列数 */
  cols: number;
  /** 终端行数 */
  rows: number;
  /** 已执行过的命令，供 `history` 使用 */
  commandHistory: string[];
}

/**
 * 模拟终端输出的一行。
 *
 * `clear` 为真时表示清屏；`nextCwd` 表示该命令改变了工作目录。
 */
export interface SimulatedLine {
  text: string;
  kind: TerminalLineKind;
  /** 该行输出前的等待时长 */
  delayMs?: number;
  clear?: boolean;
  nextCwd?: string;
}

/** 拆分命令行，支持引号包裹的参数 */
export function splitArgs(commandLine: string): string[] {
  const args: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  for (const char of commandLine) {
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) args.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current) args.push(current);
  return args;
}

/** 规范化路径：处理 `.`、`..`、重复斜杠与结尾斜杠 */
export function normalizePath(path: string): string {
  const isAbsolute = path.startsWith("/");
  const parts = path.split("/").filter((part) => part && part !== ".");
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === "..") {
      resolved.pop();
      continue;
    }
    resolved.push(part);
  }
  const joined = resolved.join("/");
  return isAbsolute ? `/${joined}` : joined;
}

/** 把用户输入的路径解析为绝对路径 */
export function resolvePath(
  cwd: string,
  input: string,
  username = "root",
): string {
  const home = HOME_DIRS[username] ?? HOME_DIRS.root ?? "/root";
  if (input === "~") return home;
  if (input.startsWith("~/")) {
    return normalizePath(`${home}/${input.slice(2)}`);
  }
  if (input.startsWith("/")) return normalizePath(input);
  return normalizePath(`${cwd}/${input}`);
}

/** 读取目录条目，目录不存在返回 undefined */
function listDir(path: string): Record<string, MockEntry> | undefined {
  return MOCK_FS[path];
}

/** 读取文件条目，文件不存在返回 undefined */
function readFile(path: string): MockEntry | undefined {
  const index = path.lastIndexOf("/");
  const dir = index <= 0 ? "/" : path.slice(0, index);
  const name = path.slice(index + 1);
  return listDir(dir)?.[name];
}

/** 判断路径是否为已存在的目录 */
function isDir(path: string): boolean {
  return listDir(path) !== undefined;
}

/** 按扩展名给 ls 输出着色 */
function paintEntryName(name: string, entry: MockEntry): string {
  if (entry.type === "dir") return paint(name, ANSI.blue + ANSI.bold);
  if (name.endsWith(".sh")) return paint(name, ANSI.green);
  if (name.endsWith(".log")) return paint(name, ANSI.yellow);
  if (name.endsWith(".md")) return paint(name, ANSI.cyan);
  if (name.endsWith(".json") || name.endsWith(".yml")) {
    return paint(name, ANSI.magenta);
  }
  return name;
}

/** 构造 ls -l 风格的长格式行 */
function longEntryLine(name: string, entry: MockEntry, owner: string): string {
  const permissions =
    entry.type === "dir" ? "drwxr-xr-x" : "-rw-r--r--";
  const size = String(entry.size).padStart(8, " ");
  const label = entry.type === "dir" ? paint(name, ANSI.blue + ANSI.bold) : name;
  return `${paint(permissions, ANSI.gray)} ${paint("1", ANSI.gray)} ${paint(
    owner,
    ANSI.gray,
  )} ${paint(owner, ANSI.gray)} ${paint(size, ANSI.gray)} ${paint(
    entry.modified,
    ANSI.gray,
  )} ${label}`;
}

/** 生成 `ls` 的输出行 */
function buildLsOutput(
  entries: Record<string, MockEntry>,
  long: boolean,
  owner: string,
): SimulatedLine[] {
  const names = Object.keys(entries).sort((a, b) => a.localeCompare(b));
  if (names.length === 0) {
    return [{ text: "", kind: "output", delayMs: TERMINAL_LINE_DELAY_MS }];
  }
  if (!long) {
    return names.map((name) => ({
      text: paintEntryName(name, entries[name] as MockEntry),
      kind: "output" as const,
      delayMs: TERMINAL_LINE_DELAY_MS,
    }));
  }
  return [
    {
      text: `total ${names.length * 4}`,
      kind: "output" as const,
      delayMs: TERMINAL_LINE_DELAY_MS,
    },
    ...names.map((name) => ({
      text: longEntryLine(name, entries[name] as MockEntry, owner),
      kind: "output" as const,
      delayMs: TERMINAL_LINE_DELAY_MS,
    })),
  ];
}

/** 生成表格类命令的输出 */
function buildTable(
  header: string[],
  rows: string[][],
  colorizeColumn?: number,
): SimulatedLine[] {
  const lines: SimulatedLine[] = [
    {
      text: paint(header.join("  "), ANSI.bold),
      kind: "output",
      delayMs: TERMINAL_LINE_DELAY_MS,
    },
  ];
  for (const row of rows) {
    lines.push({
      text: row
        .map((cell, index) =>
          index === colorizeColumn ? paint(cell, ANSI.cyan) : cell,
        )
        .join("  "),
      kind: "output",
      delayMs: TERMINAL_LINE_DELAY_MS,
    });
  }
  return lines;
}

/** Mock 的进程列表 */
function buildPsOutput(): SimulatedLine[] {
  return buildTable(
    ["PID", "TTY", "TIME", "CMD"],
    [
      ["1", "?", "0:03", "/sbin/init splash"],
      ["812", "?", "0:00", "sshd: /usr/sbin/sshd -D"],
      ["1182", "pts/0", "0:00", "nginx: worker process"],
      ["1190", "pts/0", "0:01", "nginx: master process /usr/sbin/nginx"],
      ["2481", "pts/0", "1:42", "node /opt/app/dist/main.js"],
      ["3092", "pts/1", "0:00", "bash"],
      ["3110", "pts/1", "0:00", "ps"],
    ],
    3,
  );
}

/** Mock 的磁盘使用 */
function buildDfOutput(): SimulatedLine[] {
  return buildTable(
    ["Filesystem", "Size", "Used", "Avail", "Use%", "Mounted on"],
    [
      ["/dev/vda1", "80G", "37G", "39G", "50%", "/"],
      ["/dev/vdb1", "200G", "128G", "61G", "68%", "/data"],
      ["tmpfs", "7.8G", "1.2G", "6.6G", "16%", "/dev/shm"],
    ],
  );
}

/** Mock 的内存使用 */
function buildFreeOutput(): SimulatedLine[] {
  return buildTable(
    ["", "total", "used", "free", "shared", "buff/cache", "available"],
    [
      ["Mem:", "15Gi", "6.2Gi", "1.4Gi", "512Mi", "7.4Gi", "8.1Gi"],
      ["Swap:", "2.0Gi", "128Mi", "1.9Gi", "", "", "1.9Gi"],
    ],
  );
}

/** Mock 的容器列表 */
function buildDockerPsOutput(): SimulatedLine[] {
  return buildTable(
    ["CONTAINER ID", "IMAGE", "STATUS", "PORTS", "NAMES"],
    [
      [
        "9f3c1a2b7d40",
        "registry.corp.internal/charlie-api:2.4.1",
        "Up 3 hours",
        "0.0.0.0:8080->8080/tcp",
        "charlie-api",
      ],
      [
        "c81de04f6a92",
        "redis:7-alpine",
        "Up 3 hours",
        "6379/tcp",
        "charlie-api-redis",
      ],
    ],
    1,
  );
}

/** Mock 的 systemd 服务状态 */
function buildSystemctlOutput(service: string): SimulatedLine[] {
  const name = `${service}.service`;
  const failed = service.includes("nginx");
  const statusText = failed
    ? paint("failed (Result: exit-code)", ANSI.red)
    : paint("active (running)", ANSI.green);
  return [
    {
      text: paint(`● ${name}`, ANSI.bold),
      kind: "output",
      delayMs: TERMINAL_LINE_DELAY_MS,
    },
    {
      text: `   Loaded: loaded (/lib/systemd/system/${name}; enabled)`,
      kind: "output",
      delayMs: TERMINAL_LINE_DELAY_MS,
    },
    {
      text: `   Active: ${statusText} since Tue 2026-10-21 16:02:11 CST`,
      kind: "output",
      delayMs: TERMINAL_LINE_DELAY_MS,
    },
    {
      text: "  Process: 2481 ExecStart=/usr/bin/node /opt/app/dist/main.js",
      kind: "output",
      delayMs: TERMINAL_LINE_DELAY_MS,
    },
    {
      text: `   ${paint(failed ? "Main PID: 0 (dead)" : "Main PID: 2481", ANSI.gray)}`,
      kind: "output",
      delayMs: TERMINAL_LINE_DELAY_MS,
    },
  ];
}

/** Mock 的 tail 持续输出 */
function buildTailOutput(fileName: string, follow: boolean): SimulatedLine[] {
  const lines: SimulatedLine[] = [];
  const templates = [
    "2026/10/21 16:41:02 [info] heartbeat ok, latency=12ms",
    "2026/10/21 16:41:12 [info] heartbeat ok, latency=9ms",
    "2026/10/21 16:41:22 [warn] heartbeat slow, latency=486ms",
    "2026/10/21 16:41:32 [info] heartbeat ok, latency=11ms",
    "2026/10/21 16:41:42 [error] upstream timeout after 5000ms",
  ];
  const count = follow ? 6 : 3;
  for (let index = 0; index < count; index += 1) {
    const template = templates[index % templates.length] as string;
    lines.push({
      text:
        template.includes("[warn]")
          ? paint(template, ANSI.yellow)
          : template.includes("[error]")
            ? paint(template, ANSI.red)
            : template,
      kind: template.includes("[error]") ? "error" : "output",
      delayMs: follow ? TERMINAL_SLOW_LINE_DELAY_MS : TERMINAL_LINE_DELAY_MS,
    });
  }
  if (follow) {
    lines.push({
      text: paint(`^C  (已中断 ${fileName} 的持续输出)`, ANSI.gray),
      kind: "info",
      delayMs: TERMINAL_LINE_DELAY_MS,
    });
  }
  return lines;
}

/** `help` 命令的输出 */
function buildHelpOutput(): SimulatedLine[] {
  const groups: Array<[string, string[]]> = [
    [
      "文件与目录",
      ["ls [-l] [路径]", "cd [路径]", "pwd", "cat <文件>", "tail [-n N] <文件>", "echo <文本>"],
    ],
    [
      "系统状态",
      ["whoami", "hostname", "uname [-a]", "ps", "df [-h]", "free [-h]", "date"],
    ],
    [
      "服务与容器",
      ["systemctl status <服务>", "docker ps"],
    ],
    ["其他", ["history", "clear", "exit", "help"]],
  ];
  const lines: SimulatedLine[] = [
    {
      text: paint("可用的 Mock 命令：", ANSI.bold),
      kind: "output",
      delayMs: TERMINAL_LINE_DELAY_MS,
    },
  ];
  for (const [group, commands] of groups) {
    lines.push({
      text: paint(`  ${group}`, ANSI.cyan),
      kind: "output",
      delayMs: TERMINAL_LINE_DELAY_MS,
    });
    for (const command of commands) {
      lines.push({
        text: `    ${paint(command, ANSI.green)}`,
        kind: "output",
        delayMs: TERMINAL_LINE_DELAY_MS,
      });
    }
  }
  lines.push({
    text: paint("  （当前为 Mock 环境，输出均为模拟数据）", ANSI.gray),
    kind: "info",
    delayMs: TERMINAL_LINE_DELAY_MS,
  });
  return lines;
}

/**
 * 执行一条命令并逐行产出模拟输出。
 *
 * 这是一个生成器：调用方负责在每次 yield 之间等待 `delayMs`，
 * 从而实现流式逐行出现的效果。
 *
 * 下期接入真实 SSH 时，替换本函数的实现为 `invoke("ssh_exec")` 的流式读取，
 * 调用方 `TerminalView` 无需改动。
 */
export function* simulateCommand(
  rawCommand: string,
  ctx: TerminalContext,
): Generator<SimulatedLine> {
  const commandLine = rawCommand.trim();
  if (!commandLine) return;

  const args = splitArgs(commandLine);
  const command = (args[0] ?? "").toLowerCase();
  const rest = args.slice(1);

  switch (command) {
    case "help": {
      yield* buildHelpOutput();
      return;
    }

    case "pwd": {
      yield {
        text: ctx.cwd,
        kind: "output",
        delayMs: TERMINAL_LINE_DELAY_MS,
      };
      return;
    }

    case "whoami": {
      yield {
        text: ctx.username,
        kind: "output",
        delayMs: TERMINAL_LINE_DELAY_MS,
      };
      return;
    }

    case "hostname": {
      yield {
        text: ctx.host,
        kind: "output",
        delayMs: TERMINAL_LINE_DELAY_MS,
      };
      return;
    }

    case "uname": {
      yield {
        text: rest.includes("-a")
          ? `Linux ${ctx.host} 5.15.0-91-generic #101-Ubuntu SMP Tue Oct 21 12:04:11 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux`
          : "Linux",
        kind: "output",
        delayMs: TERMINAL_LINE_DELAY_MS,
      };
      return;
    }

    case "date": {
      yield {
        text: new Date().toString(),
        kind: "output",
        delayMs: TERMINAL_LINE_DELAY_MS,
      };
      return;
    }

    case "echo": {
      yield {
        text: rest.join(" "),
        kind: "output",
        delayMs: TERMINAL_LINE_DELAY_MS,
      };
      return;
    }

    case "ls": {
      const long = rest.includes("-l");
      const targetArg = rest.find((arg) => !arg.startsWith("-"));
      const target = resolvePath(ctx.cwd, targetArg ?? ".", ctx.username);
      const entries = listDir(target);
      if (!entries) {
        yield {
          text: paint(`ls: 无法访问 '${targetArg ?? "."}': No such file or directory`, ANSI.red),
          kind: "error",
          delayMs: TERMINAL_LINE_DELAY_MS,
        };
        return;
      }
      yield* buildLsOutput(entries, long, ctx.username);
      return;
    }

    case "cd": {
      const targetArg = rest[0] ?? "~";
      const target = resolvePath(ctx.cwd, targetArg, ctx.username);
      if (!isDir(target)) {
        yield {
          text: paint(`cd: ${targetArg}: No such file or directory`, ANSI.red),
          kind: "error",
          delayMs: TERMINAL_LINE_DELAY_MS,
        };
        return;
      }
      yield {
        text: "",
        kind: "output",
        delayMs: 0,
        nextCwd: target,
      };
      return;
    }

    case "cat": {
      const targetArg = rest[0];
      if (!targetArg) {
        yield {
          text: paint("cat: 缺少文件参数", ANSI.red),
          kind: "error",
          delayMs: TERMINAL_LINE_DELAY_MS,
        };
        return;
      }
      const target = resolvePath(ctx.cwd, targetArg, ctx.username);
      const entry = readFile(target);
      if (!entry) {
        yield {
          text: paint(`cat: ${targetArg}: No such file or directory`, ANSI.red),
          kind: "error",
          delayMs: TERMINAL_LINE_DELAY_MS,
        };
        return;
      }
      if (entry.type === "dir") {
        yield {
          text: paint(`cat: ${targetArg}: Is a directory`, ANSI.red),
          kind: "error",
          delayMs: TERMINAL_LINE_DELAY_MS,
        };
        return;
      }
      for (const line of (entry.content ?? "").split("\n")) {
        yield {
          text: line,
          kind: "output" as const,
          delayMs: TERMINAL_LINE_DELAY_MS,
        };
      }
      return;
    }

    case "tail": {
      const targetArg = rest.find((arg) => !arg.startsWith("-"));
      const follow = rest.includes("-f");
      if (!targetArg) {
        yield {
          text: paint("tail: 缺少文件参数", ANSI.red),
          kind: "error",
          delayMs: TERMINAL_LINE_DELAY_MS,
        };
        return;
      }
      const target = resolvePath(ctx.cwd, targetArg, ctx.username);
      if (!readFile(target)) {
        yield {
          text: paint(`tail: ${targetArg}: No such file or directory`, ANSI.red),
          kind: "error",
          delayMs: TERMINAL_LINE_DELAY_MS,
        };
        return;
      }
      yield* buildTailOutput(targetArg, follow);
      return;
    }

    case "ps": {
      yield* buildPsOutput();
      return;
    }

    case "df": {
      yield* buildDfOutput();
      return;
    }

    case "free": {
      yield* buildFreeOutput();
      return;
    }

    case "docker": {
      if (rest[0] === "ps") {
        yield* buildDockerPsOutput();
        return;
      }
      yield {
        text: paint(`docker: 未知子命令 '${rest[0] ?? ""}'`, ANSI.red),
        kind: "error",
        delayMs: TERMINAL_LINE_DELAY_MS,
      };
      return;
    }

    case "systemctl": {
      if (rest[0] === "status" && rest[1]) {
        yield* buildSystemctlOutput(rest[1]);
        return;
      }
      if (rest[0] === "restart" && rest[1]) {
        yield {
          text: paint(`已重启 ${rest[1]}.service`, ANSI.green),
          kind: "output",
          delayMs: TERMINAL_LINE_DELAY_MS,
        };
        return;
      }
      yield {
        text: paint("systemctl: 未知参数，试试 'systemctl status <服务>'", ANSI.red),
        kind: "error",
        delayMs: TERMINAL_LINE_DELAY_MS,
      };
      return;
    }

    case "history": {
      if (ctx.commandHistory.length === 0) {
        yield {
          text: paint("暂无历史命令", ANSI.gray),
          kind: "output",
          delayMs: TERMINAL_LINE_DELAY_MS,
        };
        return;
      }
      for (const [index, entry] of ctx.commandHistory.entries()) {
        yield {
          text: `${paint(String(index + 1).padStart(4, " "), ANSI.gray)}  ${entry}`,
          kind: "output",
          delayMs: TERMINAL_LINE_DELAY_MS,
        };
      }
      return;
    }

    case "clear": {
      yield { text: "", kind: "info", clear: true, delayMs: 0 };
      return;
    }

    case "exit": {
      yield {
        text: paint("logout", ANSI.gray),
        kind: "info",
        delayMs: TERMINAL_LINE_DELAY_MS,
      };
      return;
    }

    default: {
      yield {
        text: paint(
          `bash: ${command}: command not found`,
          ANSI.red,
        ),
        kind: "error",
        delayMs: TERMINAL_LINE_DELAY_MS,
      };
      yield {
        text: paint("输入 'help' 查看可用的 Mock 命令。", ANSI.gray),
        kind: "info",
        delayMs: TERMINAL_LINE_DELAY_MS,
      };
      return;
    }
  }
}
