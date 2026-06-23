import React, { useEffect, useRef, useCallback } from 'react';
import type { ContextMenuItem } from '@/types';

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  const adjustPosition = useCallback(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const menu = menuRef.current;

    if (rect.right > window.innerWidth) {
      menu.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${y - rect.height}px`;
    }
  }, [x, y]);

  useEffect(() => {
    adjustPosition();
  }, [adjustPosition]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled) return;
    if (item.action) item.action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-48 py-1 rounded shadow-xl border"
      style={{
        left: x,
        top: y,
        backgroundColor: 'var(--bg-overlay)',
        borderColor: 'var(--border-color)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {items.map((item, idx) => {
        if (item.separator) {
          return (
            <div
              key={`sep-${idx}`}
              className="my-1 mx-2 border-t"
              style={{ borderColor: 'var(--border-color)' }}
            />
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            disabled={item.disabled}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors"
            style={{
              color: item.disabled ? 'var(--text-subtle)' : 'var(--text-primary)',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent-blue)';
                (e.currentTarget as HTMLElement).style.color = 'var(--bg-base)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLElement).style.color = item.disabled ? 'var(--text-subtle)' : 'var(--text-primary)';
            }}
          >
            {item.icon && <span>{item.icon}</span>}
            <span className="flex-1 text-left">{item.label}</span>
            {item.shortcut && (
              <span style={{ color: 'var(--text-subtle)', fontSize: 10 }}>{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
