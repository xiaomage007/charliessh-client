import { useCallback, useEffect, useRef, type RefObject } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";

import { XTERM_FONT, XTERM_THEME } from "../theme/colors";

export interface TerminalSize {
  cols: number;
  rows: number;
}

export interface UseTerminalOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  /** 用户输入的原始数据 */
  onData: (data: string) => void;
  /** 终端尺寸变化 */
  onResize?: (size: TerminalSize) => void;
  /** 实例创建完成、可写入内容时回调 */
  onReady?: (terminal: Terminal) => void;
}

export interface UseTerminalResult {
  termRef: RefObject<Terminal | null>;
  /** 按容器尺寸重新适配，容器不可见时会跳过 */
  fit: () => void;
  focus: () => void;
  /** 向终端写入内容 */
  write: (data: string) => void;
}

/**
 * 管理 xterm 实例的生命周期。
 *
 * 注意：实例必须在 effect 内部创建，且 cleanup 必须调用 `dispose()`，
 * 否则 React StrictMode 的双次挂载会泄漏实例。
 */
export function useTerminal(options: UseTerminalOptions): UseTerminalResult {
  const { containerRef, onData, onResize, onReady } = options;

  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // 用 ref 保存最新回调，避免因回调变化而重建终端实例
  const onDataRef = useRef(onData);
  const onResizeRef = useRef(onResize);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onDataRef.current = onData;
  }, [onData]);
  useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const terminal = new Terminal({
      theme: XTERM_THEME,
      fontFamily: XTERM_FONT.fontFamily,
      fontSize: XTERM_FONT.fontSize,
      lineHeight: XTERM_FONT.lineHeight,
      cursorBlink: true,
      convertEol: false,
      scrollback: 0,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(container);

    termRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const dataDisposable = terminal.onData((data) => onDataRef.current(data));
    const resizeDisposable = terminal.onResize(({ cols, rows }) =>
      onResizeRef.current?.({ cols, rows }),
    );

    // 容器不可见时尺寸为 0，此时 fit 会算出 1x1，必须跳过
    const fit = () => {
      const element = containerRef.current;
      if (!element || element.clientWidth === 0 || element.clientHeight === 0) {
        return;
      }
      fitAddon.fit();
    };

    fit();
    // WebView2 里字体加载完成前测不准字符宽度，字体就绪后补一次
    void document.fonts?.ready.then(() => fit());
    onReadyRef.current?.(terminal);

    return () => {
      dataDisposable.dispose();
      resizeDisposable.dispose();
      terminal.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [containerRef]);

  const fit = useCallback(() => {
    const element = containerRef.current;
    if (!element || element.clientWidth === 0 || element.clientHeight === 0) {
      return;
    }
    fitAddonRef.current?.fit();
  }, [containerRef]);

  const focus = useCallback(() => {
    termRef.current?.focus();
  }, []);

  const write = useCallback((data: string) => {
    termRef.current?.write(data);
  }, []);

  return { termRef, fit, focus, write };
}
