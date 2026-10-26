/** ESC 控制字符 */
const ESC = String.fromCharCode(27);

/** ANSI 转义序列（CSI 形式） */
const ANSI_PATTERN = new RegExp(`${ESC}\\[[0-9;?]*[a-zA-Z]`, "g");

/** 去除 ANSI 转义序列，用于把终端原始输出转成纯文本 */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}
