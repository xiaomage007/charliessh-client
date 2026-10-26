/** 全局类型定义 —— 各模块之间的数据契约 */

/* -------------------------------------------------------------------------- */
/* 服务器                                                                     */
/* -------------------------------------------------------------------------- */

/** 认证方式 */
export type AuthType = "password" | "key";

/** SSH 服务器连接配置 */
export interface SshServer {
  id: string;
  /** 列表展示名称 */
  name: string;
  host: string;
  port: number;
  username: string;
  authType: AuthType;
  /** 仅存在于内存，本迭代不落盘 */
  password?: string;
  privateKeyPath?: string;
  /** 所属分组，为空则归入"未分组" */
  group?: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

/** 服务器连接状态 */
export type ServerStatus = "disconnected" | "connecting" | "connected" | "error";

/** 单台服务器的连接运行时状态 */
export interface ServerConnectionState {
  serverId: string;
  status: ServerStatus;
  errorMessage?: string;
  connectedAt?: number;
}

/** 服务器表单的输入值 */
export interface ServerFormValues {
  name: string;
  host: string;
  port: number;
  username: string;
  authType: AuthType;
  password: string;
  privateKeyPath: string;
  group: string;
  description: string;
}

/* -------------------------------------------------------------------------- */
/* 终端                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * 终端会话。
 *
 * 刻意与服务器解耦：`id` 是终端自身的标识，`serverId` 指向服务器，
 * 因此同一台服务器可以开启多个独立终端，各自有各自的 cwd 与输出历史。
 */
export interface TerminalSession {
  id: string;
  serverId: string;
  /** 标签标题 */
  title: string;
  /** Mock shell 的当前工作目录 */
  cwd: string;
  status: ServerStatus;
  /** xterm 上报的终端尺寸，下期作为 SSH pty 请求参数 */
  size?: { cols: number; rows: number };
  createdAt: number;
  lastActiveAt: number;
}

/** 输出行的语义分类，决定日志统计与样式 */
export type TerminalLineKind = "input" | "output" | "error" | "info";

/** 终端输出行，`text` 保存含 ANSI 转义序列的原始串 */
export interface TerminalOutputLine {
  id: string;
  kind: TerminalLineKind;
  text: string;
  /** 单调递增序号，用于排序与去重 */
  seq: number;
}

/* -------------------------------------------------------------------------- */
/* 智能体                                                                     */
/* -------------------------------------------------------------------------- */

/** 智能体定义 */
export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  /** 角色人设，下期作为 system prompt 发送给模型 */
  systemPrompt: string;
  /** 默认模型标识 */
  defaultModel: string;
  /** 是否把当前终端输出作为上下文附带进对话 */
  includeTerminalContext: boolean;
  /** 是否为内置角色（内置角色不可删除） */
  builtin: boolean;
}

/* -------------------------------------------------------------------------- */
/* 对话                                                                       */
/* -------------------------------------------------------------------------- */

/** 会话 */
export interface Conversation {
  id: string;
  title: string;
  /** 会话绑定的智能体，切换智能体在本会话内立即生效 */
  agentId: string;
  createdAt: number;
  updatedAt: number;
}

/** 消息角色 */
export type MessageRole = "user" | "assistant" | "system";

/** 消息生成状态 */
export type MessageStatus = "complete" | "streaming" | "error";

/** 一条对话消息 */
export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  /** assistant 消息实际使用的模型 */
  model?: string;
  createdAt: number;
  status: MessageStatus;
  errorMessage?: string;
}

/* -------------------------------------------------------------------------- */
/* 状态容器                                                                   */
/* -------------------------------------------------------------------------- */

/** 服务器状态切片 */
export interface ServersState {
  servers: SshServer[];
  connections: Record<string, ServerConnectionState>;
}

/** 终端状态切片 */
export interface TerminalsState {
  sessions: TerminalSession[];
  activeTerminalId: string | null;
  /** 按终端 id 分桶的输出历史 */
  histories: Record<string, TerminalOutputLine[]>;
  /** 输出行的全局单调序号发号器 */
  seqCounter: number;
}

/** 对话状态切片 */
export interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  /** 按会话 id 分桶的消息列表 */
  messages: Record<string, ChatMessage[]>;
}
