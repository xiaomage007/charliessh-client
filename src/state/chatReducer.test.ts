import { describe, expect, it } from "vitest";

import {
  chatInitialState,
  chatReducer,
  type ChatAction,
} from "./chatReducer";
import type { ChatMessage, Conversation } from "../types";

/** 构造一个测试用会话 */
function makeConversation(id: string): Conversation {
  return {
    id,
    title: "新对话",
    agentId: "general",
    createdAt: 1000,
    updatedAt: 1000,
  };
}

/** 构造一条测试用消息 */
function makeMessage(
  id: string,
  conversationId: string,
  role: ChatMessage["role"] = "user",
): ChatMessage {
  return {
    id,
    conversationId,
    role,
    content: "内容",
    createdAt: 1000,
    status: "complete",
  };
}

/** 按顺序派发动作 */
function reduce(
  state = chatInitialState,
  actions: ChatAction[],
): typeof chatInitialState {
  return actions.reduce((current, action) => chatReducer(current, action), state);
}

describe("chatReducer", () => {
  it("创建会话时把新会话设为激活", () => {
    const state = reduce(chatInitialState, [
      { type: "conversation/create", conversation: makeConversation("conv_1") },
    ]);

    expect(state.conversations).toHaveLength(1);
    expect(state.activeConversationId).toBe("conv_1");
  });

  it("消息按会话分桶，互不干扰", () => {
    const state = reduce(chatInitialState, [
      { type: "conversation/create", conversation: makeConversation("conv_1") },
      { type: "conversation/create", conversation: makeConversation("conv_2") },
      {
        type: "message/add",
        message: makeMessage("msg_1", "conv_1", "user"),
      },
      {
        type: "message/add",
        message: makeMessage("msg_2", "conv_2", "assistant"),
      },
    ]);

    expect(state.messages.conv_1).toHaveLength(1);
    expect(state.messages.conv_2).toHaveLength(1);
    expect(state.messages.conv_1?.[0]?.id).toBe("msg_1");
  });

  it("更新消息时按 id 定位并合并补丁", () => {
    const state = reduce(chatInitialState, [
      { type: "conversation/create", conversation: makeConversation("conv_1") },
      {
        type: "message/add",
        message: makeMessage("msg_1", "conv_1", "assistant"),
      },
      {
        type: "message/update",
        messageId: "msg_1",
        patch: { content: "生成完成", status: "complete" },
      },
    ]);

    expect(state.messages.conv_1?.[0]?.content).toBe("生成完成");
  });

  it("更新不存在的消息时状态保持不变", () => {
    const state = reduce(chatInitialState, [
      {
        type: "message/update",
        messageId: "missing",
        patch: { content: "x" },
      },
    ]);

    expect(state).toBe(chatInitialState);
  });

  it("切换智能体只改当前会话的 agentId", () => {
    const state = reduce(chatInitialState, [
      { type: "conversation/create", conversation: makeConversation("conv_1") },
      { type: "conversation/create", conversation: makeConversation("conv_2") },
      { type: "conversation/setAgent", conversationId: "conv_1", agentId: "ops" },
    ]);

    const first = state.conversations.find(
      (conversation) => conversation.id === "conv_1",
    );
    const second = state.conversations.find(
      (conversation) => conversation.id === "conv_2",
    );
    expect(first?.agentId).toBe("ops");
    expect(second?.agentId).toBe("general");
  });

  it("删除会话时连同消息一起清理", () => {
    const state = reduce(chatInitialState, [
      { type: "conversation/create", conversation: makeConversation("conv_1") },
      { type: "conversation/create", conversation: makeConversation("conv_2") },
      {
        type: "message/add",
        message: makeMessage("msg_1", "conv_1", "user"),
      },
      { type: "conversation/remove", conversationId: "conv_1" },
    ]);

    expect(state.conversations).toHaveLength(1);
    expect(state.messages.conv_1).toBeUndefined();
    expect(state.activeConversationId).toBe("conv_2");
  });

  it("重命名会话后标题更新", () => {
    const state = reduce(chatInitialState, [
      { type: "conversation/create", conversation: makeConversation("conv_1") },
      {
        type: "conversation/rename",
        conversationId: "conv_1",
        title: "磁盘告警排查",
      },
    ]);

    expect(state.conversations[0]?.title).toBe("磁盘告警排查");
  });
});
