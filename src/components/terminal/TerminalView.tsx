import { useCallback, useEffect, useRef } from "react";
import type { Terminal } from "@xterm/xterm";

import { useTerminal } from "../../hooks/useTerminal";
import { useResizeObserver } from "../../hooks/useResizeObserver";
import {
  TERMINAL_COMMAND_HISTORY_LIMIT,
  TERMINAL_COMMAND_DELAY_MS,
} from "../../constants/layout";
import { homeDirFor } from "../../mock/mockFs";
import { simulateCommand, type TerminalContext } from "../../mock/terminalSimulator";
import { useServers } from "../../state/ServersContext";
import { useTerminals } from "../../state/TerminalsContext";
import type { SshServer, TerminalSession } from "../../types";
import { generateId } from "../../utils/id";

/** 控制字符 */
const KEY = {
  enter: "\r",
  backspace: "\x7f",
  interrupt: "\x03",
  arrowUp: "\x1b[A",
  arrowDown: "\x1b[B",
} as const;

/** 是否为控制字符（不可直接回显） */
const CONTROL_CHAR = /[\x00-\x1f\x7f]/;

/** 把绝对路径转成 `~` 开头的展示形式 */
function displayPath(cwd: string, username: string): string {
  const home = homeDirFor(username);
  if (cwd === home) return "~";
  if (cwd.startsWith(`${home}/`)) return `~${cwd.slice(home.length)}`;
  return cwd;
}

/** 生成提示符 */
function buildPrompt(server: SshServer, cwd: string): string {
  const shown = displayPath(cwd, server.username);
  return `\x1b[32m${server.username}@${server.host}\x1b[0m:\x1b[34m${shown}\x1b[0m$ `;
}

/** 生成连接成功的欢迎信息 */
function buildBanner(server: SshServer): string {
  return [
    `\x1b[1;32mCharlieSSH\x1b[0m 已连接到 \x1b[1m${server.name}\x1b[0m (${server.username}@${server.host}:${server.port})`,
    "\x1b[90m当前为 Mock 环境，输入 help 查看可用的模拟命令。\x1b[0m",
    "\r\n",
  ].join("\r\n");
}

/** 等待指定毫秒 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface TerminalViewProps {
  session: TerminalSession;
  /** 该终端是否为当前激活的标签页 */
  active: boolean;
  /** 聚焦请求计数，变化时把键盘焦点交给该终端 */
  focusRequest?: number;
}

/**
 * 单个终端视图。
 *
 * 注意：xterm.js 本身不做本地回显，敲下的字符只会通过 `onData` 送出，
 * 因此回显、换行、退格擦除、历史命令回填都需要在这里自行写入。
 */
export function TerminalView({ session, active, focusRequest = 0 }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { state: serverState } = useServers();
  const { dispatch } = useTerminals();

  const server = serverState.servers.find(
    (item) => item.id === session.serverId,
  );

  // 以下状态全部用 ref 保存，避免它们变化导致终端实例重建
  const terminalRef = useRef<Terminal | null>(null);
  const serverRef = useRef<SshServer | undefined>(server);
  const inputRef = useRef("");
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const cwdRef = useRef(session.cwd);
  const interruptRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    serverRef.current = server;
  }, [server]);

  /** 向终端写入内容，实例就绪前调用会被忽略 */
  const writeLocal = useCallback((data: string): void => {
    terminalRef.current?.write(data);
  }, []);

  /** 执行一条命令并逐行输出模拟结果 */
  const runCommand = useCallback(
    async (rawCommand: string): Promise<void> => {
      const terminal = terminalRef.current;
      const current = serverRef.current;
      if (!terminal || !current) return;

      const command = rawCommand.trim();
      if (!command) {
        writeLocal(buildPrompt(current, cwdRef.current));
        return;
      }

      historyRef.current = [...historyRef.current, command].slice(
        -TERMINAL_COMMAND_HISTORY_LIMIT,
      );
      historyIndexRef.current = -1;

      interruptRef.current = false;

      const context: TerminalContext = {
        serverId: current.id,
        serverName: current.name,
        host: current.host,
        username: current.username,
        cwd: cwdRef.current,
        cols: terminal.cols,
        rows: terminal.rows,
        commandHistory: historyRef.current,
      };

      await sleep(TERMINAL_COMMAND_DELAY_MS);

      for (const line of simulateCommand(command, context)) {
        if (!aliveRef.current || interruptRef.current) break;
        if (line.delayMs) await sleep(line.delayMs);
        if (!aliveRef.current || interruptRef.current) break;

        if (line.clear) {
          terminal.clear();
          dispatch({ type: "terminal/clearOutput", terminalId: session.id });
          continue;
        }

        terminal.write(`${line.text}\r\n`);
        dispatch({
          type: "terminal/appendOutput",
          terminalId: session.id,
          line: {
            id: generateId("line"),
            kind: line.kind,
            text: line.text,
          },
        });

        if (line.nextCwd) {
          cwdRef.current = line.nextCwd;
          dispatch({
            type: "terminal/setCwd",
            terminalId: session.id,
            cwd: line.nextCwd,
          });
        }
      }

      if (!aliveRef.current) return;
      if (interruptRef.current) {
        terminal.write("^C\r\n");
      }
      terminal.write(buildPrompt(current, cwdRef.current));
    },
    [dispatch, session.id, writeLocal],
  );

  /** 重绘当前输入行，用于方向键切换历史命令 */
  const redrawInput = useCallback(
    (value: string): void => {
      const current = serverRef.current;
      if (!current) return;
      writeLocal(`\r\x1b[2K${buildPrompt(current, cwdRef.current)}${value}`);
    },
    [writeLocal],
  );

  const handleData = useCallback(
    (data: string): void => {
      const current = serverRef.current;
      if (!current) return;

      if (data === KEY.enter) {
        writeLocal("\r\n");
        const command = inputRef.current;
        inputRef.current = "";
        void runCommand(command);
        return;
      }

      if (data === KEY.backspace) {
        if (inputRef.current.length === 0) return;
        inputRef.current = inputRef.current.slice(0, -1);
        writeLocal("\b \b");
        return;
      }

      if (data === KEY.interrupt) {
        interruptRef.current = true;
        inputRef.current = "";
        writeLocal("^C\r\n");
        writeLocal(buildPrompt(current, cwdRef.current));
        return;
      }

      if (data === KEY.arrowUp || data === KEY.arrowDown) {
        const history = historyRef.current;
        if (history.length === 0) return;
        if (historyIndexRef.current === -1) {
          historyIndexRef.current =
            data === KEY.arrowUp ? history.length - 1 : 0;
        } else {
          historyIndexRef.current += data === KEY.arrowUp ? -1 : 1;
          historyIndexRef.current = Math.max(
            0,
            Math.min(history.length - 1, historyIndexRef.current),
          );
        }
        inputRef.current = history[historyIndexRef.current] ?? "";
        redrawInput(inputRef.current);
        return;
      }

      if (CONTROL_CHAR.test(data)) return;

      // 普通可打印字符：xterm 不做本地回显，需要自行写入
      inputRef.current += data;
      writeLocal(data);
    },
    [redrawInput, runCommand, writeLocal],
  );

  // 用 ref 持有最新的处理函数，保证终端实例只创建一次
  const handleDataRef = useRef(handleData);
  useEffect(() => {
    handleDataRef.current = handleData;
  }, [handleData]);

  const { fit, focus } = useTerminal({
    containerRef,
    onData: (data) => handleDataRef.current(data),
    onResize: ({ cols, rows }) =>
      dispatch({
        type: "terminal/updateSize",
        terminalId: session.id,
        cols,
        rows,
      }),
    onReady: (terminal) => {
      terminalRef.current = terminal;
      const current = serverRef.current;
      if (!current) return;
      terminal.write(buildBanner(current));
      terminal.write(buildPrompt(current, cwdRef.current));
    },
  });

  // 容器尺寸变化时重新适配
  useResizeObserver(containerRef, fit);

  // 激活时重新适配并聚焦（隐藏状态下容器尺寸为 0，必须此时再 fit 一次）
  useEffect(() => {
    if (!active) return;
    fit();
    focus();
  }, [active, fit, focus]);

  // 收到聚焦请求时把键盘焦点交给当前终端
  const lastFocusRequestRef = useRef(focusRequest);
  useEffect(() => {
    if (focusRequest === lastFocusRequestRef.current) return;
    lastFocusRequestRef.current = focusRequest;
    if (active) focus();
  }, [active, focus, focusRequest]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      terminalRef.current = null;
    };
  }, []);

  return (
    <div
      className={`terminal-view ${active ? "terminal-view--active" : ""}`.trim()}
      aria-hidden={!active}
    >
      <div className="terminal-view__host" ref={containerRef} />
    </div>
  );
}
