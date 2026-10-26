import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";

import type { ChatState } from "../types";
import {
  chatInitialState,
  chatReducer,
  type ChatAction,
} from "./chatReducer";

/** 对话状态与操作方法的注入契约 */
export interface ChatContextValue {
  state: ChatState;
  dispatch: Dispatch<ChatAction>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, chatInitialState);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/** 读取对话状态与操作方法 */
export function useChat(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat 必须在 ChatProvider 内部使用");
  }
  return context;
}
