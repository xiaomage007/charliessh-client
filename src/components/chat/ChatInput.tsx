import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

import type { AgentDefinition } from "../../types";
import { Icon } from "../common/Icon";
import { AgentSelector } from "./AgentSelector";

/** 输入框的最大高度，超过后内部滚动 */
const MAX_TEXTAREA_HEIGHT = 160;

export interface ChatInputProps {
  agents: AgentDefinition[];
  /** 当前会话绑定的智能体 id */
  agentId: string;
  onAgentChange: (agentId: string) => void;
  onSend: (text: string) => void;
  onNewConversation: () => void;
  /** 打断当前正在生成的回复 */
  onStop?: () => void;
  /** 是否正在流式输出 */
  streaming?: boolean;
  /** 聚焦请求计数，变化时把焦点交给输入框 */
  focusRequest?: number;
}

/** AI 对话输入区：智能体选择、输入框与发送按钮 */
export function ChatInput({
  agents,
  agentId,
  onAgentChange,
  onSend,
  onNewConversation,
  onStop,
  streaming = false,
  focusRequest = 0,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 收到聚焦请求时把焦点交给输入框
  const lastFocusRequestRef = useRef(focusRequest);
  useEffect(() => {
    if (focusRequest === lastFocusRequestRef.current) return;
    lastFocusRequestRef.current = focusRequest;
    textareaRef.current?.focus();
  }, [focusRequest]);

  /** 随内容高度自适应，超过上限后改为内部滚动 */
  const resize = useCallback((element: HTMLTextAreaElement | null): void => {
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, []);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setValue(event.target.value);
    resize(event.target);
  };

  const submit = useCallback((): void => {
    const text = value.trim();
    if (text.length === 0) return;
    setValue("");
    resize(textareaRef.current);
    onSend(text);
  }, [onSend, resize, value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== "Enter") return;
    // Shift+Enter 换行
    if (event.shiftKey) return;
    // 中文输入法组合态下的 Enter 只用于选词，不能触发发送
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    submit();
  };

  return (
    <div className="chat-input">
      <div className="chat-input__toolbar">
        <AgentSelector
          agents={agents}
          value={agentId}
          onChange={onAgentChange}
          disabled={streaming}
        />
        <span className="chat-input__spacer" />
        <button
          type="button"
          className="chat-input__new"
          title="新建对话"
          onClick={onNewConversation}
        >
          <Icon name="plus" size={13} />
          <span>新建对话</span>
        </button>
      </div>

      <textarea
        ref={textareaRef}
        className="chat-input__textarea"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="输入你的问题，Enter 发送，Shift+Enter 换行"
        aria-label="对话输入框"
        rows={2}
      />

      <div className="chat-input__footer">
        <span className="chat-input__hint">
          Enter 发送 · Shift+Enter 换行
        </span>
        {streaming ? (
          <button
            type="button"
            className="chat-input__send chat-input__send--stop"
            onClick={onStop}
          >
            <Icon name="stop" size={13} />
            <span>停止</span>
          </button>
        ) : (
          <button
            type="button"
            className="chat-input__send"
            onClick={submit}
            disabled={value.trim().length === 0}
          >
            <Icon name="send" size={13} />
            <span>发送</span>
          </button>
        )}
      </div>
    </div>
  );
}
