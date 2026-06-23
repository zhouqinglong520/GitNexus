import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';

interface CommandPaletteProps {
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const commands = useUIStore((s) => s.commands);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const lower = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lower) ||
        cmd.category.toLowerCase().includes(lower)
    );
  }, [commands, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filteredCommands[selectedIndex];
        if (cmd) {
          cmd.action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [filteredCommands, selectedIndex, onClose]
  );

  // Group commands by category
  const grouped = useMemo(() => {
    const groups: Record<string, typeof commands> = {};
    for (const cmd of filteredCommands) {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    }
    return groups;
  }, [filteredCommands]);

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-overlay)',
          borderColor: 'var(--border-color)',
          boxShadow: '0 16px 64px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-2 px-3 py-2 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <Search size={16} style={{ color: 'var(--text-subtle)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-transparent border-none outline-none text-sm"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>

        {/* Command list */}
        <div className="max-h-80 overflow-y-auto py-1">
          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category}>
              <div
                className="px-3 py-1 text-xs font-medium uppercase"
                style={{ color: 'var(--text-subtle)' }}
              >
                {category}
              </div>
              {cmds.map((cmd) => {
                flatIndex++;
                const idx = flatIndex;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      cmd.action();
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                    style={{
                      backgroundColor: isSelected ? 'var(--accent-blue)' : 'transparent',
                      color: isSelected ? 'var(--bg-base)' : 'var(--text-primary)',
                    }}
                  >
                    {cmd.icon && <span>{cmd.icon}</span>}
                    <span className="flex-1 text-left">{cmd.label}</span>
                    {cmd.shortcut && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: isSelected ? 'rgba(0,0,0,0.2)' : 'var(--bg-surface)',
                          color: isSelected ? 'var(--bg-base)' : 'var(--text-subtle)',
                        }}
                      >
                        {cmd.shortcut}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {filteredCommands.length === 0 && (
            <div
              className="px-3 py-8 text-center text-sm"
              style={{ color: 'var(--text-subtle)' }}
            >
              No commands found
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center justify-between px-3 py-1.5 border-t text-xs"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-subtle)' }}
        >
          <span>Navigate with arrow keys</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
};
