import { useCallback, useEffect, useRef, useState } from "react";

import {
  AI_PARAGRAPH_PAUSE_MS,
  AI_TYPING_CHARS_PER_SECOND,
  AI_TYPING_CHUNK_SIZE,
} from "../constants/layout";
import { generateAiResponse } from "../mock/aiGenerator";
import type { AgentDefinition } from "../types";

/** 一次流式请求的输入 */
export interface AiStreamParams {
  agent: AgentDefinition;
  userMessage: string;
  terminalContext?: string;
  /** 流结束时回调，用于把最终文本落库 */
  onComplete: (text: string) => void;
}

/** 流式输出的控制句柄 */
export interface AiStreamController {
  /** 正在流式输出的消息 id，未流式时为 null */
  streamingMessageId: string | null;
  /** 流式输出中的文本 */
  streamingText: string;
  /** 是否正在流式输出 */
  streaming: boolean;
  /** 启动一次流式输出 */
  start: (messageId: string, params: AiStreamParams) => void;
  /** 中止当前流式输出，已生成的部分内容会作为完整消息落库 */
  stop: () => void;
}

/**
 * AI 回复的打字机流式输出。
 *
 * 用递归 setTimeout 按时间推进（掉帧不掉速），
 * 并用请求令牌屏蔽过期回调：切换会话或智能体时旧流的回调会被丢弃，
 * 不会把文本写进已经切换掉的消息。
 */
export function useAiStream(): AiStreamController {
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null,
  );
  const [streamingText, setStreamingText] = useState("");

  /** 请求令牌，每次启动或中止都自增，令牌不匹配的回调直接丢弃 */
  const tokenRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  /** 已生成文本的同步副本，避免闭包读到旧值 */
  const textRef = useRef("");
  const completeRef = useRef<((text: string) => void) | null>(null);

  const clearTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stop = useCallback((): void => {
    tokenRef.current += 1;
    clearTimer();
    const partial = textRef.current;
    const onComplete = completeRef.current;
    textRef.current = "";
    completeRef.current = null;
    setStreamingMessageId(null);
    setStreamingText("");
    // 已生成的部分内容不丢弃，按完整消息落库
    if (partial.length > 0) onComplete?.(partial);
  }, [clearTimer]);

  const start = useCallback(
    (messageId: string, params: AiStreamParams): void => {
      tokenRef.current += 1;
      const token = tokenRef.current;
      clearTimer();

      textRef.current = "";
      completeRef.current = params.onComplete;
      setStreamingText("");
      setStreamingMessageId(messageId);

      const paragraphs = generateAiResponse({
        agent: params.agent,
        userMessage: params.userMessage,
        terminalContext: params.terminalContext,
      });

      const finish = (): void => {
        if (token !== tokenRef.current) return;
        clearTimer();
        const full = textRef.current;
        const onComplete = completeRef.current;
        textRef.current = "";
        completeRef.current = null;
        setStreamingMessageId(null);
        setStreamingText("");
        onComplete?.(full);
      };

      const typeParagraph = (first: boolean): void => {
        if (token !== tokenRef.current) return;
        const next = paragraphs.next();
        if (next.done) {
          finish();
          return;
        }

        const paragraph = next.value;
        const prefix = first ? "" : "\n\n";
        let index = 0;

        const step = (): void => {
          if (token !== tokenRef.current) return;
          if (index >= paragraph.length) {
            timerRef.current = window.setTimeout(
              () => typeParagraph(false),
              AI_PARAGRAPH_PAUSE_MS,
            );
            return;
          }
          const size = Math.min(AI_TYPING_CHUNK_SIZE, paragraph.length - index);
          const chunk = paragraph.slice(index, index + size);
          textRef.current += index === 0 ? prefix + chunk : chunk;
          index += size;
          setStreamingText(textRef.current);
          timerRef.current = window.setTimeout(
            step,
            (size / AI_TYPING_CHARS_PER_SECOND) * 1000,
          );
        };

        step();
      };

      typeParagraph(true);
    },
    [clearTimer],
  );

  // 组件卸载时只清理定时器，不再回调落库
  useEffect(() => {
    return () => {
      tokenRef.current += 1;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return {
    streamingMessageId,
    streamingText,
    streaming: streamingMessageId !== null,
    start,
    stop,
  };
}
