import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Minus, Square, X } from 'lucide-react';

/**
 * 自定义标题栏组件（仅 Tauri 桌面环境渲染）
 *
 * 在非 Tauri 环境（如浏览器预览）中，getCurrentWindow() 返回 undefined，
 * 直接调用其方法会导致运行时崩溃。由于该组件在 App.tsx 中被无条件渲染，
 * 一旦崩溃将导致整个应用白屏，因此必须添加运行时保护。
 */
export const CustomTitleBar: React.FC = () => {
  const appWindowRef = useRef<any>(null);
  // 用于跟踪 Tauri API 是否已成功初始化，决定是否渲染标题栏 DOM
  const [isTauriEnv, setIsTauriEnv] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        if (win) {
          appWindowRef.current = win;
          setIsTauriEnv(true);
        }
      } catch {
        // 非 Tauri 环境，保持 isTauriEnv = false，不渲染标题栏
        console.debug('[CustomTitleBar] 非 Tauri 环境，跳过自定义标题栏渲染');
      }
    };
    init();
  }, []);

  const handleMinimize = useCallback(() => {
    appWindowRef.current?.minimize();
  }, []);

  const handleMaximize = useCallback(() => {
    appWindowRef.current?.toggleMaximize();
  }, []);

  const handleClose = useCallback(() => {
    appWindowRef.current?.close();
  }, []);

  // 非 Tauri 环境不渲染任何内容
  if (!isTauriEnv) return null;

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-9 bg-surface select-none border-b border-themed shrink-0"
      style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)' }}
    >
      <div className="flex items-center gap-2 px-3">
        <div
          className="w-4 h-4 rounded flex items-center justify-center text-xs font-bold"
          style={{ backgroundColor: 'var(--accent-mauve)', color: 'var(--bg-base)' }}
        >
          G
        </div>
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          GitNexus
        </span>
      </div>

      <div className="flex items-center h-full">
        <button
          onClick={handleMinimize}
          className="flex items-center justify-center w-12 h-full transition-colors hover:bg-overlay"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Minimize"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={handleMaximize}
          className="flex items-center justify-center w-12 h-full transition-colors hover:bg-overlay"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Maximize"
        >
          <Square size={12} />
        </button>
        <button
          onClick={handleClose}
          className="flex items-center justify-center w-12 h-full transition-colors hover:bg-red"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
