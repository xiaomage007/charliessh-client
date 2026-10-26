import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";

import type { TerminalsState } from "../types";
import {
  terminalsInitialState,
  terminalsReducer,
  type TerminalsAction,
} from "./terminalsReducer";

/** 终端状态与操作方法的注入契约 */
export interface TerminalsContextValue {
  state: TerminalsState;
  dispatch: Dispatch<TerminalsAction>;
}

const TerminalsContext = createContext<TerminalsContextValue | null>(null);

export function TerminalsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(terminalsReducer, terminalsInitialState);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <TerminalsContext.Provider value={value}>{children}</TerminalsContext.Provider>
  );
}

/** 读取终端状态与操作方法 */
export function useTerminals(): TerminalsContextValue {
  const context = useContext(TerminalsContext);
  if (!context) {
    throw new Error("useTerminals 必须在 TerminalsProvider 内部使用");
  }
  return context;
}
