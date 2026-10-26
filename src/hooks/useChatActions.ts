import { useCallback } from "react";

import { DEFAULT_CONVERSATION_TITLE } from "../constants/layout";
import { DEFAULT_AGENT_ID } from "../mock/agents";
import { useChat } from "../state/ChatContext";
import type { Conversation } from "../types";
import { generateId } from "../utils/id";

/** 对话相关的复合操作 */
export interface ChatActions {
  /** 新建会话，返回会话 id */
  createConversation: (agentId?: string) => string;
  /** 删除会话 */
  removeConversation: (conversationId: string) => void;
  /** 切换当前会话 */
  setActiveConversation: (conversationId: string | null) => void;
}

/**
 * 会话操作集合。
 *
 * 抽成独立 hook 是因为"新建对话"既要在面板里触发，
 * 也要能被全局快捷键 Ctrl+N 触发，二者必须共用同一套逻辑。
 */
export function useChatActions(): ChatActions {
  const { dispatch } = useChat();

  const createConversation = useCallback(
    (agentId: string = DEFAULT_AGENT_ID): string => {
      const now = Date.now();
      const conversation: Conversation = {
        id: generateId("conv"),
        title: DEFAULT_CONVERSATION_TITLE,
        agentId,
        createdAt: now,
        updatedAt: now,
      };
      dispatch({ type: "conversation/create", conversation });
      return conversation.id;
    },
    [dispatch],
  );

  const removeConversation = useCallback(
    (conversationId: string): void => {
      dispatch({ type: "conversation/remove", conversationId });
    },
    [dispatch],
  );

  const setActiveConversation = useCallback(
    (conversationId: string | null): void => {
      dispatch({ type: "conversation/setActive", conversationId });
    },
    [dispatch],
  );

  return { createConversation, removeConversation, setActiveConversation };
}
