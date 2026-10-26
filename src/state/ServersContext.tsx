import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";

import { seedServers } from "../mock/seedServers";
import type { ServersState } from "../types";
import {
  serversInitialState,
  serversReducer,
  type ServersAction,
} from "./serversReducer";

/** 服务器状态与操作方法的注入契约 */
export interface ServersContextValue {
  state: ServersState;
  dispatch: Dispatch<ServersAction>;
}

const ServersContext = createContext<ServersContextValue | null>(null);

export function ServersProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    serversReducer,
    { ...serversInitialState, servers: seedServers() },
  );

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <ServersContext.Provider value={value}>{children}</ServersContext.Provider>
  );
}

/** 读取服务器状态与操作方法 */
export function useServers(): ServersContextValue {
  const context = useContext(ServersContext);
  if (!context) {
    throw new Error("useServers 必须在 ServersProvider 内部使用");
  }
  return context;
}
