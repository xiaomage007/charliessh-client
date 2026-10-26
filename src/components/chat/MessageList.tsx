import { useEffect, useRef } from "react";

import type { ChatMessage } from "../../types";
import { Icon } from "../common/Icon";
import { MessageBubble } from "./MessageBubble";

export interface MessageListProps {
  messages: ChatMessage[];
  /** 助手名称，用于气泡上的署名 */
  agentName: string;
  /** 正在流式输出的消息 id */
  streamingMessageId: string | null;
  /** 流式输出中的文本 */
  streamingText: string;
}

/** 消息列表，滚动到底部跟随最新消息 */
export function MessageList({
  messages,
  agentName,
  streamingMessageId,
  streamingText,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, streamingText]);

  if (messages.length === 0) {
    return (
      <div className="chat-messages chat-messages--empty">
        <Icon name="sparkle" size={32} />
        <p className="chat-messages__empty-title">开始一个新对话</p>
        <p className="chat-messages__empty-hint">
          在下方输入你的问题，AI 会结合当前终端上下文给出建议。
        </p>
      </div>
    );
  }

  return (
    <div className="chat-messages" ref={scrollRef}>
      {messages.map((message) => {
        const isStreaming = message.id === streamingMessageId;
        return (
          <MessageBubble
            key={message.id}
            message={message}
            agentName={agentName}
            streaming={isStreaming}
            streamingText={isStreaming ? streamingText : undefined}
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
