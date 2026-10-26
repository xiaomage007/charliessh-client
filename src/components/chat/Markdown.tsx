import { useMemo, type ReactNode } from "react";

/** 解析出的块类型 */
type Block =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; level: number; text: string }
  | { kind: "code"; language: string; code: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; lines: string[] }
  | { kind: "table"; header: string[]; rows: string[][] }
  | { kind: "divider" };

/** 行内标记：行内代码、加粗、斜体 */
const INLINE_PATTERN = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)/g;

/** 表格分隔行，例如 `|---|---|` */
const TABLE_SEPARATOR_PATTERN = /^\|?[\s:|-]+\|[\s:|-]*$/;

/** 判断某行是否开启一个新的块 */
function startsBlock(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) return true;
  if (trimmed.startsWith("```")) return true;
  if (trimmed.startsWith("|")) return true;
  if (trimmed.startsWith(">")) return true;
  if (/^#{1,6}\s/.test(trimmed)) return true;
  if (/^([-*+]|\d+[.)])\s/.test(trimmed)) return true;
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) return true;
  return false;
}

/** 是否为表格分隔行 */
function isTableSeparator(line: string | undefined): boolean {
  if (line === undefined) return false;
  const trimmed = line.trim();
  if (!trimmed.includes("-")) return false;
  return TABLE_SEPARATOR_PATTERN.test(trimmed);
}

/** 拆分表格行 */
function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/** 把 Markdown 文本切分成块 */
function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const trimmed = lines[index].trim();

    if (trimmed.length === 0) {
      index += 1;
      continue;
    }

    // 围栏代码块
    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push({ kind: "code", language, code: body.join("\n") });
      continue;
    }

    // 分隔线
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ kind: "divider" });
      index += 1;
      continue;
    }

    // 标题
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      blocks.push({
        kind: "heading",
        level: heading[1].length,
        text: heading[2],
      });
      index += 1;
      continue;
    }

    // 表格
    if (trimmed.startsWith("|") && isTableSeparator(lines[index + 1])) {
      const header = splitTableRow(trimmed);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      blocks.push({ kind: "table", header, rows });
      continue;
    }

    // 引用块
    if (trimmed.startsWith(">")) {
      const quoted: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith(">")) {
        quoted.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ kind: "quote", lines: quoted });
      continue;
    }

    // 列表
    const listItem = /^([-*+]|\d+[.)])\s+(.*)$/.exec(trimmed);
    if (listItem) {
      const ordered = /\d/.test(listItem[1]);
      const items: string[] = [];
      while (index < lines.length) {
        const item = /^([-*+]|\d+[.)])\s+(.*)$/.exec(lines[index].trim());
        if (!item) break;
        items.push(item[2]);
        index += 1;
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }

    // 段落
    const paragraph: string[] = [];
    while (index < lines.length && !startsBlock(lines[index])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    if (paragraph.length === 0) {
      index += 1;
      continue;
    }
    blocks.push({ kind: "paragraph", text: paragraph.join("\n") });
  }

  return blocks;
}

/** 解析行内标记 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  INLINE_PATTERN.lastIndex = 0;
  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-${match.index}`;
    if (token.startsWith("`")) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    cursor = match.index + token.length;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }
  return nodes;
}

/** 渲染单个块 */
function renderBlock(block: Block, index: number): ReactNode {
  const key = `b${index}`;

  switch (block.kind) {
    case "heading": {
      const Tag = `h${Math.min(block.level + 2, 6)}` as "h3";
      return (
        <Tag key={key} className="markdown__heading">
          {renderInline(block.text, key)}
        </Tag>
      );
    }
    case "code":
      return (
        <pre key={key} className="markdown__code" data-language={block.language}>
          <code>{block.code}</code>
        </pre>
      );
    case "list":
      return block.ordered ? (
        <ol key={key} className="markdown__list">
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item, `${key}-${itemIndex}`)}</li>
          ))}
        </ol>
      ) : (
        <ul key={key} className="markdown__list">
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item, `${key}-${itemIndex}`)}</li>
          ))}
        </ul>
      );
    case "quote":
      return (
        <blockquote key={key} className="markdown__quote">
          {block.lines.map((line, lineIndex) => (
            <p key={lineIndex}>{renderInline(line, `${key}-${lineIndex}`)}</p>
          ))}
        </blockquote>
      );
    case "table":
      return (
        <div key={key} className="markdown__table-wrapper">
          <table className="markdown__table">
            <thead>
              <tr>
                {block.header.map((cell, cellIndex) => (
                  <th key={cellIndex}>{renderInline(cell, `${key}-h${cellIndex}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>
                      {renderInline(cell, `${key}-${rowIndex}-${cellIndex}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "divider":
      return <hr key={key} className="markdown__divider" />;
    default:
      return (
        <p key={key} className="markdown__paragraph">
          {renderInline(block.text, key)}
        </p>
      );
  }
}

export interface MarkdownProps {
  source: string;
}

/**
 * 极简 Markdown 渲染器。
 *
 * 只支持标题、段落、加粗、斜体、行内代码、围栏代码块、
 * 有序/无序列表、引用块、表格与分隔线，足够覆盖本迭代的回复内容，
 * 同时避免引入 markdown 库带来的体积与 XSS 风险。
 */
export function Markdown({ source }: MarkdownProps) {
  const blocks = useMemo(() => parseBlocks(source), [source]);

  return (
    <div className="markdown">
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}
