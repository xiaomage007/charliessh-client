import { describe, expect, it } from "vitest";

import {
  terminalsInitialState,
  terminalsReducer,
  type TerminalsAction,
} from "./terminalsReducer";
import type { TerminalSession } from "../types";

/** 构造一个测试用终端会话 */
function makeSession(id: string, serverId = "srv_1"): TerminalSession {
  return {
    id,
    serverId,
    title: "测试终端",
    cwd: "/root",
    status: "connected",
    createdAt: 1000,
    lastActiveAt: 1000,
  };
}

/** 按顺序派发动作 */
function reduce(
  state = terminalsInitialState,
  actions: TerminalsAction[],
): typeof terminalsInitialState {
  return actions.reduce(
    (current, action) => terminalsReducer(current, action),
    state,
  );
}

describe("terminalsReducer", () => {
  it("打开终端时把新会话设为激活", () => {
    const state = reduce(terminalsInitialState, [
      { type: "terminal/open", session: makeSession("term_1") },
    ]);

    expect(state.sessions).toHaveLength(1);
    expect(state.activeTerminalId).toBe("term_1");
  });

  it("关闭非激活终端时保持当前激活项不变", () => {
    const state = reduce(terminalsInitialState, [
      { type: "terminal/open", session: makeSession("term_1") },
      { type: "terminal/open", session: makeSession("term_2") },
      { type: "terminal/setActive", terminalId: "term_2" },
      { type: "terminal/close", terminalId: "term_1" },
    ]);

    expect(state.sessions.map((session) => session.id)).toEqual(["term_2"]);
    expect(state.activeTerminalId).toBe("term_2");
  });

  it("关闭激活终端时回落到最后一个会话", () => {
    const state = reduce(terminalsInitialState, [
      { type: "terminal/open", session: makeSession("term_1") },
      { type: "terminal/open", session: makeSession("term_2") },
      { type: "terminal/close", terminalId: "term_2" },
    ]);

    expect(state.activeTerminalId).toBe("term_1");
  });

  it("关闭终端时一并清理输出历史", () => {
    const state = reduce(terminalsInitialState, [
      { type: "terminal/open", session: makeSession("term_1") },
      {
        type: "terminal/appendOutput",
        terminalId: "term_1",
        line: { id: "line_1", kind: "output", text: "hello" },
      },
      { type: "terminal/close", terminalId: "term_1" },
    ]);

    expect(state.histories.term_1).toBeUndefined();
  });

  it("追加输出时由 reducer 分配单调递增的 seq", () => {
    const state = reduce(terminalsInitialState, [
      {
        type: "terminal/appendOutput",
        terminalId: "term_1",
        line: { id: "line_1", kind: "output", text: "第一行" },
      },
      {
        type: "terminal/appendOutput",
        terminalId: "term_1",
        line: { id: "line_2", kind: "output", text: "第二行" },
      },
    ]);

    const history = state.histories.term_1 ?? [];
    expect(history).toHaveLength(2);
    expect(history[0]?.seq).toBe(0);
    expect(history[1]?.seq).toBe(1);
    expect(state.seqCounter).toBe(2);
  });

  it("更新 cwd 与尺寸只影响对应会话", () => {
    const state = reduce(terminalsInitialState, [
      { type: "terminal/open", session: makeSession("term_1") },
      { type: "terminal/open", session: makeSession("term_2") },
      { type: "terminal/setCwd", terminalId: "term_1", cwd: "/var/log" },
      { type: "terminal/updateSize", terminalId: "term_1", cols: 100, rows: 30 },
    ]);

    expect(state.sessions[0]?.cwd).toBe("/var/log");
    expect(state.sessions[0]?.size).toEqual({ cols: 100, rows: 30 });
    expect(state.sessions[1]?.cwd).toBe("/root");
    expect(state.sessions[1]?.size).toBeUndefined();
  });

  it("清屏时清空指定终端的历史但保留其他终端", () => {
    const state = reduce(terminalsInitialState, [
      {
        type: "terminal/appendOutput",
        terminalId: "term_1",
        line: { id: "line_1", kind: "output", text: "第一行" },
      },
      {
        type: "terminal/appendOutput",
        terminalId: "term_2",
        line: { id: "line_2", kind: "output", text: "第二行" },
      },
      { type: "terminal/clearOutput", terminalId: "term_1" },
    ]);

    expect(state.histories.term_1).toEqual([]);
    expect(state.histories.term_2).toHaveLength(1);
  });
});
