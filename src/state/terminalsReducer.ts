import { TERMINAL_HISTORY_LIMIT } from "../constants/layout";
import type {
  ServerStatus,
  TerminalOutputLine,
  TerminalSession,
  TerminalsState,
} from "../types";

/** 终端状态的变更动作 */
export type TerminalsAction =
  | { type: "terminal/open"; session: TerminalSession }
  | { type: "terminal/close"; terminalId: string }
  | { type: "terminal/setActive"; terminalId: string | null }
  | { type: "terminal/setStatus"; terminalId: string; status: ServerStatus }
  | { type: "terminal/setCwd"; terminalId: string; cwd: string }
  | { type: "terminal/updateSize"; terminalId: string; cols: number; rows: number }
  | { type: "terminal/appendOutput"; terminalId: string; line: Omit<TerminalOutputLine, "seq"> }
  | { type: "terminal/clearOutput"; terminalId: string };

export const terminalsInitialState: TerminalsState = {
  sessions: [],
  activeTerminalId: null,
  histories: {},
  seqCounter: 0,
};

/** 纯函数 reducer，便于单元测试与后续替换为异步数据源 */
export function terminalsReducer(
  state: TerminalsState,
  action: TerminalsAction,
): TerminalsState {
  switch (action.type) {
    case "terminal/open": {
      const { session } = action;
      return {
        ...state,
        sessions: [...state.sessions, session],
        activeTerminalId: session.id,
      };
    }

    case "terminal/close": {
      const { [action.terminalId]: _removedHistory, ...restHistories } =
        state.histories;
      const sessions = state.sessions.filter(
        (session) => session.id !== action.terminalId,
      );
      const activeTerminalId =
        state.activeTerminalId === action.terminalId
          ? (sessions.at(-1)?.id ?? null)
          : state.activeTerminalId;
      return {
        ...state,
        sessions,
        activeTerminalId,
        histories: restHistories,
      };
    }

    case "terminal/setActive":
      return {
        ...state,
        activeTerminalId: action.terminalId,
        sessions: state.sessions.map((session) =>
          session.id === action.terminalId
            ? { ...session, lastActiveAt: Date.now() }
            : session,
        ),
      };

    case "terminal/setStatus":
      return {
        ...state,
        sessions: state.sessions.map((session) =>
          session.id === action.terminalId
            ? { ...session, status: action.status }
            : session,
        ),
      };

    case "terminal/setCwd":
      return {
        ...state,
        sessions: state.sessions.map((session) =>
          session.id === action.terminalId
            ? { ...session, cwd: action.cwd }
            : session,
        ),
      };

    case "terminal/updateSize":
      return {
        ...state,
        sessions: state.sessions.map((session) =>
          session.id === action.terminalId
            ? { ...session, size: { cols: action.cols, rows: action.rows } }
            : session,
        ),
      };

    case "terminal/appendOutput": {
      const existing = state.histories[action.terminalId] ?? [];
      const line: TerminalOutputLine = {
        ...action.line,
        seq: state.seqCounter,
      };
      const appended = [...existing, line];
      return {
        ...state,
        seqCounter: state.seqCounter + 1,
        histories: {
          ...state.histories,
          [action.terminalId]:
            appended.length > TERMINAL_HISTORY_LIMIT
              ? appended.slice(appended.length - TERMINAL_HISTORY_LIMIT)
              : appended,
        },
      };
    }

    case "terminal/clearOutput":
      return {
        ...state,
        histories: { ...state.histories, [action.terminalId]: [] },
      };

    default:
      return state;
  }
}
