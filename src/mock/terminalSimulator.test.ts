import { describe, expect, it } from "vitest";

import {
  normalizePath,
  resolvePath,
  simulateCommand,
  splitArgs,
  type TerminalContext,
} from "./terminalSimulator";

/** 构造一个测试用终端上下文 */
function makeContext(overrides: Partial<TerminalContext> = {}): TerminalContext {
  return {
    serverId: "srv_1",
    serverName: "测试服务器",
    host: "10.0.0.1",
    username: "root",
    cwd: "/root",
    cols: 80,
    rows: 24,
    commandHistory: [],
    ...overrides,
  };
}

/** 收集一条命令的全部输出行 */
function run(command: string, ctx: TerminalContext = makeContext()) {
  return [...simulateCommand(command, ctx)];
}

describe("splitArgs", () => {
  it("按空白拆分参数", () => {
    expect(splitArgs("docker ps -a")).toEqual(["docker", "ps", "-a"]);
  });

  it("保留引号包裹的内容并去掉引号", () => {
    expect(splitArgs('echo "hello world"')).toEqual(["echo", "hello world"]);
  });

  it("忽略连续空白", () => {
    expect(splitArgs("  ls   -l  ")).toEqual(["ls", "-l"]);
  });
});

describe("normalizePath", () => {
  it("保持相对路径为相对路径", () => {
    expect(normalizePath("var/log")).toBe("var/log");
  });

  it("解析 . 与 ..", () => {
    expect(normalizePath("/a/b/../c")).toBe("/a/c");
    expect(normalizePath("/a/./b")).toBe("/a/b");
  });

  it("去掉结尾斜杠与重复斜杠", () => {
    expect(normalizePath("/a/b/")).toBe("/a/b");
    expect(normalizePath("/a//b")).toBe("/a/b");
  });
});

describe("resolvePath", () => {
  it("把 ~ 展开为当前用户家目录", () => {
    expect(resolvePath("/root", "~", "root")).toBe("/root");
    expect(resolvePath("/root", "~/logs", "root")).toBe("/root/logs");
  });

  it("绝对路径不受当前目录影响", () => {
    expect(resolvePath("/root", "/etc/nginx", "root")).toBe("/etc/nginx");
  });

  it("相对路径基于当前目录拼接", () => {
    expect(resolvePath("/var/log", "nginx", "root")).toBe("/var/log/nginx");
  });
});

describe("simulateCommand", () => {
  it("空命令不产生任何输出", () => {
    expect(run("   ")).toHaveLength(0);
  });

  it("pwd 输出当前工作目录", () => {
    const lines = run("pwd", makeContext({ cwd: "/var/log" }));
    expect(lines[0]?.text).toBe("/var/log");
  });

  it("whoami 输出用户名", () => {
    const lines = run("whoami", makeContext({ username: "deploy" }));
    expect(lines[0]?.text).toBe("deploy");
  });

  it("ls 列出目录下的条目", () => {
    const lines = run("ls", makeContext({ cwd: "/home" }));
    const text = lines.map((line) => line.text).join("\n");
    expect(text).toContain("deploy");
    expect(text).toContain("ops");
  });

  it("ls 不存在的目录给出红色错误", () => {
    const lines = run("ls /not-exist");
    expect(lines).toHaveLength(1);
    expect(lines[0]?.kind).toBe("error");
    expect(lines[0]?.text).toContain("No such file or directory");
  });

  it("cd 到存在的目录时通过 nextCwd 汇报新位置", () => {
    const lines = run("cd /etc", makeContext({ cwd: "/root" }));
    expect(lines[0]?.nextCwd).toBe("/etc");
  });

  it("cd 到不存在的目录时返回错误且不改变位置", () => {
    const lines = run("cd /not-exist", makeContext({ cwd: "/root" }));
    expect(lines[0]?.kind).toBe("error");
    expect(lines[0]?.nextCwd).toBeUndefined();
  });

  it("cat 输出文件正文", () => {
    const lines = run("cat /home/deploy/.bashrc");
    const text = lines.map((line) => line.text).join("\n");
    expect(text).toContain("alias ll=");
  });

  it("clear 标记清屏", () => {
    const lines = run("clear");
    expect(lines[0]?.clear).toBe(true);
  });

  it("未知命令返回 command not found", () => {
    const lines = run("notacommand");
    expect(lines[0]?.kind).toBe("error");
    expect(lines[0]?.text).toContain("command not found");
  });

  it("history 列出执行过的命令", () => {
    const lines = run("history", makeContext({ commandHistory: ["ls -l", "pwd"] }));
    const text = lines.map((line) => line.text).join("\n");
    expect(text).toContain("ls -l");
    expect(text).toContain("pwd");
  });

  it("help 列出可用命令", () => {
    const text = run("help")
      .map((line) => line.text)
      .join("\n");
    expect(text).toContain("pwd");
    expect(text).toContain("ls");
  });
});
