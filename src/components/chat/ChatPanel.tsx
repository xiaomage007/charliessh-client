import { useCallback, useEffect, useRef } from "react";

import { AI_TERMINAL_CONTEXT_LINES } from "../../constants/layout";
import { useAiStream } from "../../hooks/useAiStream";
import { useChatActions } from "../../hooks/useChatActions";
import { BUILTIN_AGENTS, DEFAULT_AGENT_ID, findAgent } from "../../mock/agents";
import { useChat } from "../../state/ChatContext";
import { useTerminals } from "../../state/TerminalsContext";
import type { ChatMessage } from "../../types";
import { generateId } from "../../utils/id";
import { stripAnsi } from "../../utils/ansi";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";

export interface ChatPanelProps {
  /** 聚焦请求计数，变化时把键盘焦点交给输入框 */
  focusRequest?: number;
}

/** 右侧 AI 对话面板 */
export function ChatPanel({ focusRequest = 0 }: ChatPanelProps) {
  const { state: chatState, dispatch } = useChat();
  const { state: terminalState } = useTerminals();
  const { createConversation, removeConversation, setActiveConversation } =
    useChatActions();
  const {
    streamingMessageId,
    streamingText,
    streaming,
    start: startStream,
    stop: stopStream,
  } = useAiStream();

  const activeConversation =
    chatState.conversations.find(
      (conversation) => conversation.id === chatState.activeConversationId,
    ) ?? null;
  const agent = findAgent(activeConversation?.agentId);
  const messages = activeConversation
    ? (chatState.messages[activeConversation.id] ?? [])
    : [];

  /** 首次挂载时准备一个空会话，保证输入框立即可用 */
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    createConversation();
  }, [createConversation]);

  /** 切换会话时中止进行中的流，已生成的部分内容按完整消息落库 */
  const activeIdRef = useRef(chatState.activeConversationId);
  useEffect(() => {
    if (activeIdRef.current === chatState.activeConversationId) return;
    activeIdRef.current = chatState.activeConversationId;
    stopStream();
  }, [chatState.activeConversationId, stopStream]);

  /** 收集当前终端的最近输出，作为 AI 的上下文 */
  const collectTerminalContext = useCallback((): string | undefined => {
    const session = terminalState.sessions.find(
      (item) => item.id === terminalState.activeTerminalId,
    );
    if (!session) return undefined;
    const history = terminalState.histories[session.id] ?? [];
    const lines = history
      .map((line) => stripAnsi(line.text))
      .filter((text) => text.trim().length > 0)
      .slice(-AI_TERMINAL_CONTEXT_LINES);
    return lines.length > 0 ? lines.join("\n") : undefined;
  }, [terminalState]);

  const handleSend = useCallback(
    (text: string): void => {
      // 同一时刻只允许一条流，发送新消息前先把上一条收尾
      stopStream();

      const conversationId = activeConversation?.id ?? createConversation();
      const currentAgent = findAgent(activeConversation?.agentId);
      const now = Date.now();

      const userMessage: ChatMessage = {
        id: generateId("msg"),
        conversationId,
        role: "user",
        content: text,
        createdAt: now,
        status: "complete",
      };
      dispatch({ type: "message/add", message: userMessage });

      // 首条消息把会话标题改成问题摘要
      if (activeConversation && messages.length === 0) {
        dispatch({
          type: "conversation/rename",
          conversationId,
          title: text.length > 20 ? `${text.slice(0, 20)}…` : text,
        });
      }

      const assistantId = generateId("msg");
      dispatch({
        type: "message/add",
        message: {
          id: assistantId,
          conversationId,
          role: "assistant",
          content: "",
          model: currentAgent.defaultModel,
          createdAt: now,
          status: "streaming",
        },
      });

      startStream(assistantId, {
        agent: currentAgent,
        userMessage: text,
        terminalContext: currentAgent.includeTerminalContext
          ? collectTerminalContext()
          : undefined,
        onComplete: (finalText: string) => {
          dispatch({
            type: "message/update",
            messageId: assistantId,
            patch: { content: finalText, status: "complete" },
          });
        },
      });
    },
    [
      activeConversation,
      collectTerminalContext,
      createConversation,
      dispatch,
      messages.length,
      startStream,
      stopStream,
    ],
  );

  const handleAgentChange = useCallback(
    (agentId: string): void => {
      if (!activeConversation) return;
      stopStream();
      dispatch({
        type: "conversation/setAgent",
        conversationId: activeConversation.id,
        agentId,
      });
      const next = findAgent(agentId);
      dispatch({
        type: "message/add",
        message: {
          id: generateId("msg"),
          conversationId: activeConversation.id,
          role: "system",
          content: `已切换智能体为「${next.name}」`,
          createdAt: Date.now(),
          status: "complete",
        },
      });
    },
    [activeConversation, dispatch, stopStream],
  );

  const handleSelectConversation = useCallback(
    (conversationId: string): void => {
      setActiveConversation(conversationId);
    },
    [setActiveConversation],
  );

  const handleRemoveConversation = useCallback(
    (conversationId: string): void => {
      removeConversation(conversationId);
    },
    [removeConversation],
  );

  const handleNewConversation = useCallback((): void => {
    createConversation();
  }, [createConversation]);

  return (
    <section className="chat-panel" aria-label="AI 对话">
      <ChatHeader
        conversation={activeConversation}
        agent={agent}
        conversations={chatState.conversations}
        activeConversationId={chatState.activeConversationId}
        onSelectConversation={handleSelectConversation}
        onRemoveConversation={handleRemoveConversation}
        onNewConversation={handleNewConversation}
      />

      <MessageList
        messages={messages}
        agentName={agent.name}
        streamingMessageId={streamingMessageId}
        streamingText={streamingText}
      />

      <ChatInput
        agents={BUILTIN_AGENTS}
        agentId={activeConversation?.agentId ?? DEFAULT_AGENT_ID}
        onAgentChange={handleAgentChange}
        onSend={handleSend}
        onNewConversation={handleNewConversation}
        onStop={stopStream}
        streaming={streaming}
        focusRequest={focusRequest}
      />
    </section>
  );
}
