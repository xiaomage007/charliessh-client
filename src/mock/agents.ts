import type { AgentDefinition } from "../types";

/**
 * 预置智能体。
 *
 * 每个角色拥有独立的 system prompt 与默认模型；
 * `includeTerminalContext` 决定是否把当前终端输出附带进对话上下文。
 */
export const BUILTIN_AGENTS: AgentDefinition[] = [
  {
    id: "general",
    name: "通用助手",
    description: "回答各类通用问题，输出简洁结构化",
    systemPrompt:
      "你是一个通用助手。回答简洁、结构化，先给结论再给展开，避免冗余的客套话。",
    defaultModel: "claude-sonnet-4-6",
    includeTerminalContext: false,
    builtin: true,
  },
  {
    id: "ops",
    name: "运维助手",
    description: "关注系统状态、日志与故障排查，倾向给出可直接执行的命令",
    systemPrompt:
      "你是一名资深运维工程师。回答先给结论，再给出可直接执行的命令，并对高风险操作标注影响范围与回滚方式。",
    defaultModel: "claude-sonnet-4-6",
    includeTerminalContext: true,
    builtin: true,
  },
  {
    id: "dev",
    name: "开发助手",
    description: "关注代码实现与工程实践，习惯给出代码示例",
    systemPrompt:
      "你是一名资深软件工程师。回答包含可运行的代码示例与关键设计说明，指出潜在边界条件。",
    defaultModel: "claude-opus-4-7",
    includeTerminalContext: false,
    builtin: true,
  },
  {
    id: "analyst",
    name: "数据分析师",
    description: "关注指标口径、日志分析与报表输出",
    systemPrompt:
      "你是一名数据分析师。输出结论、指标表格与下一步动作，指标必须标注口径与时间范围。",
    defaultModel: "gpt-4o",
    includeTerminalContext: true,
    builtin: true,
  },
];

/** 兜底智能体 id，用于会话未绑定有效角色的情况 */
export const DEFAULT_AGENT_ID = "general";

/** 按 id 查找智能体，找不到时回退到通用助手 */
export function findAgent(agentId: string | undefined): AgentDefinition {
  return (
    BUILTIN_AGENTS.find((agent) => agent.id === agentId) ??
    (BUILTIN_AGENTS[0] as AgentDefinition)
  );
}
