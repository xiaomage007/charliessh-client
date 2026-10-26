import type { ChatMessage, ChatState, Conversation } from "../types";

/** 对话状态的变更动作 */
export type ChatAction =
  | { type: "conversation/create"; conversation: Conversation }
  | { type: "conversation/remove"; conversationId: string }
  | { type: "conversation/rename"; conversationId: string; title: string }
  | { type: "conversation/setAgent"; conversationId: string; agentId: string }
  | { type: "conversation/setActive"; conversationId: string | null }
  | { type: "message/add"; message: ChatMessage }
  | { type: "message/update"; messageId: string; patch: Partial<ChatMessage> }
  | { type: "message/remove"; messageId: string };

export const chatInitialState: ChatState = {
  conversations: [],
  activeConversationId: null,
  messages: {},
};

/** 纯函数 reducer，便于单元测试与后续替换为异步数据源 */
export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "conversation/create":
      return {
        ...state,
        conversations: [action.conversation, ...state.conversations],
        activeConversationId: action.conversation.id,
      };

    case "conversation/remove": {
      const { [action.conversationId]: _removedMessages, ...restMessages } =
        state.messages;
      const conversations = state.conversations.filter(
        (conversation) => conversation.id !== action.conversationId,
      );
      const activeConversationId =
        state.activeConversationId === action.conversationId
          ? (conversations[0]?.id ?? null)
          : state.activeConversationId;
      return {
        ...state,
        conversations,
        activeConversationId,
        messages: restMessages,
      };
    }

    case "conversation/rename":
      return {
        ...state,
        conversations: state.conversations.map((conversation) =>
          conversation.id === action.conversationId
            ? {
                ...conversation,
                title: action.title,
                updatedAt: Date.now(),
              }
            : conversation,
        ),
      };

    case "conversation/setAgent":
      return {
        ...state,
        conversations: state.conversations.map((conversation) =>
          conversation.id === action.conversationId
            ? {
                ...conversation,
                agentId: action.agentId,
                updatedAt: Date.now(),
              }
            : conversation,
        ),
      };

    case "conversation/setActive":
      return { ...state, activeConversationId: action.conversationId };

    case "message/add": {
      const { message } = action;
      const existing = state.messages[message.conversationId] ?? [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [message.conversationId]: [...existing, message],
        },
        conversations: state.conversations.map((conversation) =>
          conversation.id === message.conversationId
            ? { ...conversation, updatedAt: Date.now() }
            : conversation,
        ),
      };
    }

    case "message/update": {
      let targetConversationId: string | null = null;
      let updated: Record<string, ChatMessage[]> = state.messages;
      for (const [conversationId, list] of Object.entries(state.messages)) {
        if (!list.some((message) => message.id === action.messageId)) continue;
        targetConversationId = conversationId;
        updated = {
          ...state.messages,
          [conversationId]: list.map((message) =>
            message.id === action.messageId
              ? { ...message, ...action.patch }
              : message,
          ),
        };
        break;
      }
      if (!targetConversationId) return state;
      return { ...state, messages: updated };
    }

    case "message/remove": {
      let updated: Record<string, ChatMessage[]> = state.messages;
      let found = false;
      for (const [conversationId, list] of Object.entries(state.messages)) {
        if (!list.some((message) => message.id === action.messageId)) continue;
        found = true;
        updated = {
          ...state.messages,
          [conversationId]: list.filter(
            (message) => message.id !== action.messageId,
          ),
        };
        break;
      }
      if (!found) return state;
      return { ...state, messages: updated };
    }

    default:
      return state;
  }
}
