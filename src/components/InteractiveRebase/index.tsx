import React, { useState, useCallback, useMemo } from 'react';
import { ChevronUp, ChevronDown, X, Play } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { Commit } from '@/types';

// ============================================================
// Types
// ============================================================

export type RebaseAction = 'pick' | 'reword' | 'edit' | 'squash' | 'fixup' | 'drop';

export interface RebaseTodoItem {
  hash: string;
  shortHash: string;
  subject: string;
  action: RebaseAction;
  originalAction: RebaseAction;
}

interface InteractiveRebaseProps {
  commits: Commit[];
  /** The commit SHA that is the base (parent of the first selected commit).
   *  The rebase will be `git rebase -i <baseSha>`.
   *  If not provided, the parent of the last commit in the list is used. */
  baseSha: string;
  onStart: (baseSha: string, todos: RebaseTodoItem[]) => void;
  onCancel: () => void;
}

// ============================================================
// Action color mapping
// ============================================================

const ACTION_COLORS: Record<RebaseAction, string> = {
  pick: 'var(--accent-blue)',
  reword: 'var(--accent-mauve)',
  edit: 'var(--accent-peach)',
  squash: 'var(--accent-green)',
  fixup: 'var(--accent-teal)',
  drop: 'var(--accent-red)',
};

const ALL_ACTIONS: RebaseAction[] = ['pick', 'reword', 'edit', 'squash', 'fixup', 'drop'];

// ============================================================
// Component
// ============================================================

export const InteractiveRebase: React.FC<InteractiveRebaseProps> = ({
  commits,
  baseSha,
  onStart,
  onCancel,
}) => {
  const { t } = useTranslation();

  // Initialize todo items from the commits list
  const [items, setItems] = useState<RebaseTodoItem[]>(() =>
    commits.map((c) => ({
      hash: c.sha,
      shortHash: c.sha.slice(0, 7),
      subject: c.subject,
      action: 'pick' as RebaseAction,
      originalAction: 'pick' as RebaseAction,
    }))
  );

  // ---- Action change handler ----
  const handleActionChange = useCallback((index: number, newAction: RebaseAction) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], action: newAction };
      return next;
    });
  }, []);

  // ---- Move up / down ----
  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    setItems((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setItems((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  // ---- Build todo text ----
  const todoText = useMemo(() => {
    return items
      .map((item) => `${item.action} ${item.hash} ${item.subject}`)
      .join('\n');
  }, [items]);

  // ---- Start rebase ----
  const handleStart = useCallback(() => {
    onStart(baseSha, items);
  }, [baseSha, items, onStart]);

  // ---- Reset to original ----
  const handleReset = useCallback(() => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        action: item.originalAction,
      }))
    );
  }, []);

  // ---- Drop all items with 'drop' action ----
  const nonDroppedCount = items.filter((i) => i.action !== 'drop').length;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000 }}
      onClick={onCancel}
    >
      <div
        className="rounded-lg shadow-lg flex flex-col"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          width: 640,
          maxHeight: '80vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('interactiveRebase.title')}
          </span>
          <button
            onClick={onCancel}
            className="p-1 rounded transition-colors hover:bg-overlay"
            style={{ color: 'var(--text-subtle)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Info bar */}
        <div
          className="px-4 py-2 border-b text-xs shrink-0"
          style={{
            borderColor: 'var(--border-color)',
            color: 'var(--text-subtle)',
            backgroundColor: 'var(--bg-overlay)',
          }}
        >
          {t('interactiveRebase.info', String(items.length), baseSha.slice(0, 7))}
        </div>

        {/* Todo list */}
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 200 }}>
          {items.map((item, index) => (
            <div
              key={item.hash}
              className="flex items-center gap-2 px-4 py-1.5 border-b transition-colors"
              style={{
                borderColor: 'var(--border-color)',
                backgroundColor:
                  item.action === 'drop'
                    ? 'rgba(243, 139, 168, 0.05)'
                    : 'transparent',
              }}
            >
              {/* Move buttons */}
              <span className="flex flex-col shrink-0" style={{ gap: 0 }}>
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="p-0.5 rounded transition-colors hover:bg-overlay disabled:opacity-20"
                  style={{ color: 'var(--text-subtle)' }}
                  title={t('interactiveRebase.moveUp')}
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === items.length - 1}
                  className="p-0.5 rounded transition-colors hover:bg-overlay disabled:opacity-20"
                  style={{ color: 'var(--text-subtle)' }}
                  title={t('interactiveRebase.moveDown')}
                >
                  <ChevronDown size={12} />
                </button>
              </span>

              {/* Action dropdown */}
              <select
                value={item.action}
                onChange={(e) => handleActionChange(index, e.target.value as RebaseAction)}
                className="px-1.5 py-0.5 rounded border text-xs font-medium shrink-0"
                style={{
                  backgroundColor: `${ACTION_COLORS[item.action]}20`,
                  borderColor: `${ACTION_COLORS[item.action]}40`,
                  color: ACTION_COLORS[item.action],
                  width: 70,
                  outline: 'none',
                }}
              >
                {ALL_ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>

              {/* SHA */}
              <span
                className="text-xs font-mono shrink-0"
                style={{
                  color: 'var(--accent-yellow)',
                  width: 52,
                }}
              >
                {item.shortHash}
              </span>

              {/* Subject */}
              <span
                className="text-xs truncate flex-1"
                style={{
                  color:
                    item.action === 'drop'
                      ? 'var(--text-subtle)'
                      : 'var(--text-primary)',
                  textDecoration: item.action === 'drop' ? 'line-through' : 'none',
                }}
              >
                {item.subject}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-3 border-t shrink-0"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
            {nonDroppedCount} / {items.length} {t('interactiveRebase.activeItems')}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded text-xs transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('interactiveRebase.reset')}
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1.5 rounded text-xs transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleStart}
              disabled={nonDroppedCount === 0}
              className="px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
              style={{
                backgroundColor: nonDroppedCount > 0 ? 'var(--accent-green)' : 'var(--bg-overlay)',
                color: nonDroppedCount > 0 ? 'var(--bg-base)' : 'var(--text-subtle)',
              }}
            >
              <Play size={12} />
              {t('interactiveRebase.startRebase')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
