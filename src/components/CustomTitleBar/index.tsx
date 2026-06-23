import React, { useCallback } from 'react';
import { Minus, Square, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export const CustomTitleBar: React.FC = () => {
  const appWindow = getCurrentWindow();

  const handleMinimize = useCallback(() => {
    appWindow.minimize();
  }, [appWindow]);

  const handleMaximize = useCallback(() => {
    appWindow.toggleMaximize();
  }, [appWindow]);

  const handleClose = useCallback(() => {
    appWindow.close();
  }, [appWindow]);

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
