import React, { useEffect, useCallback } from 'react';
import { useGitStore } from '@/stores/git-store';
import { useUIStore } from '@/stores/ui-store';
import { Clock, RotateCcw, Trash2, Eye } from 'lucide-react';
import type { ContextMenuItem } from '@/types';

export const Stashes: React.FC = () => {
  const stashes = useGitStore((s) => s.stashes);
  const loading = useGitStore((s) => s.loading.stashes);
  const fetchStashes = useGitStore((s) => s.fetchStashes);
  const stashPop = useGitStore((s) => s.stashPop);
  const stashDrop = useGitStore((s) => s.stashDrop);
  const applyStash = useGitStore((s) => s.applyStash);
  const showContextMenu = useUIStore((s) => s.showContextMenu);
  const addNotification = useUIStore((s) => s.addNotification);

  useEffect(() => {
    fetchStashes();
  }, [fetchStashes]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.preventDefault();
      const items: ContextMenuItem[] = [
        {
          id: 'apply',
          label: 'Apply stash',
          icon: <Eye size={12} />,
          action: () => {
            applyStash(index).catch((err) => {
              addNotification({ type: 'error', title: 'Apply stash failed', message: String(err) });
            });
            addNotification({ type: 'info', title: 'Applying stash...' });
          },
        },
        {
          id: 'pop',
          label: 'Pop stash (apply & drop)',
          icon: <RotateCcw size={12} />,
          action: () => {
            stashPop({ index }).catch((err) => {
              addNotification({ type: 'error', title: 'Pop stash failed', message: String(err) });
            });
            addNotification({ type: 'info', title: 'Popping stash...' });
          },
        },
        { id: 'sep', label: '', separator: true },
        {
          id: 'drop',
          label: 'Drop stash',
          icon: <Trash2 size={12} />,
          action: () => {
            stashDrop({ index }).catch((err) => {
              addNotification({ type: 'error', title: 'Drop stash failed', message: String(err) });
            });
            addNotification({ type: 'warning', title: 'Stash dropped' });
          },
        },
      ];
      showContextMenu(e.clientX, e.clientY, items);
    },
    [showContextMenu, stashPop, stashDrop, applyStash, addNotification]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-subtle)' }}>
        <div className="animate-spin w-5 h-5 border-2 rounded-full" style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (stashes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--text-subtle)' }}>
        <Clock size={48} className="mb-3" />
        <p className="text-sm">No stashes</p>
        <p className="text-xs mt-1">Stashed changes will appear here</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      {stashes.map((stash) => (
        <div
          key={stash.index}
          onContextMenu={(e) => handleContextMenu(e, stash.index)}
          className="flex items-start gap-3 px-4 py-3 border-b transition-colors hover:bg-overlay cursor-pointer"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mt-0.5"
            style={{ backgroundColor: 'rgba(249, 226, 175, 0.15)', color: 'var(--accent-yellow)' }}
          >
            <Clock size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
              {stash.message}
            </div>
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-subtle)' }}>
              {stash.branch && <span>{stash.branch}</span>}
              <span className="font-mono" style={{ color: 'var(--accent-yellow)' }}>
                {stash.sha.slice(0, 7)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                applyStash(stash.index).catch((err) => {
                  addNotification({ type: 'error', title: 'Apply stash failed', message: String(err) });
                });
                addNotification({ type: 'info', title: 'Applying stash...' });
              }}
              className="p-1.5 rounded transition-colors hover:bg-overlay"
              style={{ color: 'var(--accent-green)' }}
              title="Apply stash"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={() => {
                stashDrop({ index: stash.index }).catch((err) => {
                  addNotification({ type: 'error', title: 'Drop stash failed', message: String(err) });
                });
                addNotification({ type: 'warning', title: 'Stash dropped' });
              }}
              className="p-1.5 rounded transition-colors hover:bg-overlay"
              style={{ color: 'var(--accent-red)' }}
              title="Drop stash"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
