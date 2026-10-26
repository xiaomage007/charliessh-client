import type { ChatMessage } from "../../types";
import { Icon } from "../common/Icon";
import { Markdown } from "./Markdown";

export interface MessageBubbleProps {
  message: ChatMessage;
  /** 助手消息所属的智能体名称 */
  agentName?: string;
  /** 流式输出中的文本，存在时覆盖消息本体内容 */
  streamingText?: string;
  /** 是否处于流式输出中 */
  streaming?: boolean;
}

/** 单条消息气泡，AI 在左、用户在右 */
export function MessageBubble({
  message,
  agentName,
  streamingText,
  streaming = false,
}: MessageBubbleProps) {
  if (message.role === "system") {
    return (
      <div className="chat-message chat-message--system">
        <span>{message.content}</span>
      </div>
    );
  }

  const isUser = message.role === "user";
  const content = streamingText ?? message.content;

  return (
    <div className={`chat-message ${isUser ? "chat-message--user" : "chat-message--assistant"}`}>
      <div className="chat-message__avatar" aria-hidden="true">
        <Icon name={isUser ? "user" : "robot"} size={16} />
      </div>
      <div className="chat-message__body">
        <div className="chat-message__meta">
          <span className="chat-message__name">
            {isUser ? "我" : (agentName ?? "助手")}
          </span>
          {message.model ? (
            <span className="chat-message__model">{message.model}</span>
          ) : null}
        </div>
        <div className="chat-message__bubble">
          {isUser ? (
            <p className="chat-message__plain">{content}</p>
          ) : (
            <Markdown source={content} />
          )}
          {streaming ? <span className="chat-message__cursor" /> : null}
        </div>
        {message.status === "error" && message.errorMessage ? (
          <p className="chat-message__error">{message.errorMessage}</p>
        ) : null}
      </div>
    </div>
  );
}
