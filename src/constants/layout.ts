/**
 * 行为参数常量。
 *
 * 颜色与尺寸类配置集中在 `src/styles/tokens.css`（CSS 变量），
 * 这里只放需要在 JS 逻辑中参与计算的行为参数。
 */

/** 终端输出每行的流式间隔（毫秒） */
export const TERMINAL_LINE_DELAY_MS = 45;

/** 长命令（如 tail -f）逐行输出的间隔（毫秒） */
export const TERMINAL_SLOW_LINE_DELAY_MS = 260;

/** 终端单条命令回显前等待服务器响应的间隔（毫秒） */
export const TERMINAL_COMMAND_DELAY_MS = 180;

/** 每个终端保留的最大输出行数，超出丢弃最旧的 */
export const TERMINAL_HISTORY_LIMIT = 500;

/** AI 打字机速度（字符/秒） */
export const AI_TYPING_CHARS_PER_SECOND = 40;

/** AI 打字机单次追加的字符数上限 */
export const AI_TYPING_CHUNK_SIZE = 3;

/** AI 回复段落之间的停顿（毫秒），模拟换行处的思考 */
export const AI_PARAGRAPH_PAUSE_MS = 180;

/** 附带到 AI 上下文中的终端历史行数 */
export const AI_TERMINAL_CONTEXT_LINES = 20;

/** 发送快捷键之外，命令历史最多保留的条数 */
export const TERMINAL_COMMAND_HISTORY_LIMIT = 100;

/** SSH 默认端口 */
export const DEFAULT_SSH_PORT = 22;

/** 服务器表单允许的端口范围 */
export const SSH_PORT_MIN = 1;
export const SSH_PORT_MAX = 65535;

/** 新会话默认标题 */
export const DEFAULT_CONVERSATION_TITLE = "新对话";
