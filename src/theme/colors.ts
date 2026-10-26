/**
 * JS 侧颜色常量。
 *
 * xterm 的主题对象在实例构造时读取一次，无法由 CSS 变量驱动，
 * 因此需要把与 `src/styles/tokens.css` 一致的颜色在这里再表达一次。
 * 修改主题时两处需同步。
 */

/** 与 tokens.css 中的颜色保持一致的原始值 */
export const VSCODE_COLORS = {
  editorBackground: "#1f1f1f",
  foreground: "#cccccc",
  cursor: "#aeafad",
  cursorAccent: "#1f1f1f",
  selectionBackground: "#264f78",
  black: "#000000",
  red: "#cd3131",
  green: "#0dbc79",
  yellow: "#e5e510",
  blue: "#2472c8",
  magenta: "#bc3fbc",
  cyan: "#11a8cd",
  white: "#e5e5e5",
  brightBlack: "#666666",
  brightRed: "#f14c4c",
  brightGreen: "#23d18b",
  brightYellow: "#f5f543",
  brightBlue: "#3b8eea",
  brightMagenta: "#d670d6",
  brightCyan: "#29b8db",
  brightWhite: "#e5e5e5",
} as const;

/** xterm 的 ITheme 结构 */
export const XTERM_THEME = {
  background: VSCODE_COLORS.editorBackground,
  foreground: VSCODE_COLORS.foreground,
  cursor: VSCODE_COLORS.cursor,
  cursorAccent: VSCODE_COLORS.cursorAccent,
  selectionBackground: VSCODE_COLORS.selectionBackground,
  black: VSCODE_COLORS.black,
  red: VSCODE_COLORS.red,
  green: VSCODE_COLORS.green,
  yellow: VSCODE_COLORS.yellow,
  blue: VSCODE_COLORS.blue,
  magenta: VSCODE_COLORS.magenta,
  cyan: VSCODE_COLORS.cyan,
  white: VSCODE_COLORS.white,
  brightBlack: VSCODE_COLORS.brightBlack,
  brightRed: VSCODE_COLORS.brightRed,
  brightGreen: VSCODE_COLORS.brightGreen,
  brightYellow: VSCODE_COLORS.brightYellow,
  brightBlue: VSCODE_COLORS.brightBlue,
  brightMagenta: VSCODE_COLORS.brightMagenta,
  brightCyan: VSCODE_COLORS.brightCyan,
  brightWhite: VSCODE_COLORS.brightWhite,
} as const;

/** xterm 字体设置，与 tokens.css 的 --font-mono / --terminal-font-size 对齐 */
export const XTERM_FONT = {
  fontFamily:
    '"Cascadia Code", "Cascadia Mono", Consolas, "Courier New", "Microsoft YaHei", monospace',
  fontSize: 14,
  lineHeight: 1.3,
} as const;
