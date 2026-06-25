import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useGitStore } from '@/stores/git-store';
import { useUIStore } from '@/stores/ui-store';
import { usePreferencesStore, densityConfig } from '@/stores/preferences-store';
import { useTranslation } from '@/i18n';
import { DiffView } from '@/components/DiffView';
import {
  FilePlus,
  FileMinus,
  FileEdit,
  ArrowRight,
  GitCommit,
  Plus,
  Minus,
} from 'lucide-react';
import type { StatusEntry, FileStatus, ContextMenuItem } from '@/types';
import { parseDiff } from '@/utils/diff-parser';

const STATUS_ICONS: Record<FileStatus, React.ReactNode> = {
  Modified: <FileEdit size={14} />,
  Added: <FilePlus size={14} />,
  Deleted: <FileMinus size={14} />,
  Renamed: <ArrowRight size={14} />,
  Copied: <FilePlus size={14} />,
  Untracked: <FilePlus size={14} />,
  Conflicted: <FileMinus size={14} />,
  Unmerged: <FileMinus size={14} />,
  Ignored: <FileMinus size={14} />,
  Broken: <FileMinus size={14} />,
};

const STATUS_COLORS: Record<FileStatus, string> = {
  Modified: 'var(--accent-yellow)',
  Added: 'var(--accent-green)',
  Deleted: 'var(--accent-red)',
  Renamed: 'var(--accent-mauve)',
  Copied: 'var(--accent-teal)',
  Untracked: 'var(--accent-peach)',
  Conflicted: 'var(--accent-red)',
  Unmerged: 'var(--accent-red)',
  Ignored: 'var(--text-subtle)',
  Broken: 'var(--accent-red)',
};

const STATUS_LABELS: Record<FileStatus, string> = {
  Modified: 'M',
  Added: 'A',
  Deleted: 'D',
  Renamed: 'R',
  Copied: 'C',
  Untracked: 'U',
  Conflicted: '!',
  Unmerged: '!',
  Ignored: 'I',
  Broken: 'B',
};

export const WorkingCopy: React.FC = () => {
  const status = useGitStore((s) => s.status);
  const diff = useGitStore((s) => s.diff);
  const diffLoading = useGitStore((s) => s.loading.diff);
  const fetchStatus = useGitStore((s) => s.fetchStatus);
  const fetchDiffStaged = useGitStore((s) => s.fetchDiffStaged);
  const fetchDiffUnstaged = useGitStore((s) => s.fetchDiffUnstaged);
  const stage = useGitStore((s) => s.stage);
  const unstage = useGitStore((s) => s.unstage);
  const stageAll = useGitStore((s) => s.stageAll);
  const unstageAll = useGitStore((s) => s.unstageAll);
  const stageHunk = useGitStore((s) => s.stageHunk);
  const unstageHunk = useGitStore((s) => s.unstageHunk);
  const commit = useGitStore((s) => s.commit);
  const discard = useGitStore((s) => s.discard);
  const showContextMenu = useUIStore((s) => s.showContextMenu);
  const addNotification = useUIStore((s) => s.addNotification);
  const { t } = useTranslation();

  // Density settings
  const density = usePreferencesStore((s) => s.preferences.appearance.density);
  const densityStyle = densityConfig[density];

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileStaged, setSelectedFileStaged] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [showStaged, setShowStaged] = useState(true);
  const [showUnstaged, setShowUnstaged] = useState(true);

  const parsedDiffFiles = useMemo(() => {
    if (!diff) return [];
    return parseDiff(diff);
  }, [diff]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Categorize changes into staged, unstaged, and conflicts
  const { staged, unstaged, untracked, conflicts } = useMemo(() => {
    if (!status) return { staged: [], unstaged: [], untracked: [], conflicts: [] };
    const staged: StatusEntry[] = [];
    const unstaged: StatusEntry[] = [];
    const conflicts: StatusEntry[] = [];

    for (const change of status.changes) {
      if (change.status === 'Conflicted' || change.status === 'Unmerged') {
        conflicts.push(change);
      } else if (change.staged) {
        staged.push(change);
      } else {
        unstaged.push(change);
      }
    }

    const untracked: StatusEntry[] = status.untracked_files.map((path) => ({
      path,
      status: 'Untracked' as FileStatus,
      staged: false,
    }));

    return { staged, unstaged, untracked, conflicts };
  }, [status]);

  const handleFileClick = useCallback(
    (entry: StatusEntry) => {
      setSelectedFile(entry.path);
      setSelectedFileStaged(entry.staged);
      if (entry.staged) {
        fetchDiffStaged(entry.path);
      } else {
        fetchDiffUnstaged(entry.path);
      }
    },
    [fetchDiffStaged, fetchDiffUnstaged]
  );

  const handleStageAll = useCallback(() => {
    stageAll().catch((err) => {
      addNotification({ type: 'error', title: t('workingCopy.stageAllFailed'), message: String(err) });
    });
  }, [stageAll, addNotification]);

  const handleUnstageAll = useCallback(() => {
    unstageAll().catch((err) => {
      addNotification({ type: 'error', title: t('workingCopy.unstageAllFailed'), message: String(err) });
    });
  }, [unstageAll, addNotification]);

  const handleCommit = useCallback(async () => {
    if (!commitMessage.trim()) {
      addNotification({ type: 'warning', title: t('workingCopy.noCommitMessage') });
      return;
    }
    try {
      await commit({ message: commitMessage, amend: false });
      setCommitMessage('');
      addNotification({ type: 'success', title: t('workingCopy.commitSuccess') });
    } catch (error) {
      addNotification({ type: 'error', title: 'Commit failed', message: String(error) });
    }
  }, [commitMessage, commit, addNotification]);

  const handleStageHunk = useCallback(
    (file: string, patch: string) => {
      stageHunk(file, patch).catch((err) => {
        addNotification({ type: 'error', title: t('workingCopy.stageHunkFailed'), message: String(err) });
      });
    },
    [stageHunk, addNotification]
  );

  const handleUnstageHunk = useCallback(
    (file: string, patch: string) => {
      unstageHunk(file, patch).catch((err) => {
        addNotification({ type: 'error', title: t('workingCopy.unstageHunkFailed'), message: String(err) });
      });
    },
    [unstageHunk, addNotification]
  );

  const handleFileContextMenu = useCallback(
    (e: React.MouseEvent, entry: StatusEntry) => {
      e.preventDefault();
      const items: ContextMenuItem[] = [
        {
          id: 'stage',
          label: entry.staged ? t('workingCopy.unstage') : t('workingCopy.stage'),
          action: () => {
            if (entry.staged) {
              unstage({ paths: [entry.path] });
            } else {
              stage({ paths: [entry.path] });
            }
          },
        },
        {
          id: 'discard',
          label: t('workingCopy.discardChanges'),
          action: () => discard([entry.path]),
          disabled: entry.staged,
        },
        { id: 'sep', label: '', separator: true },
        {
          id: 'copy-path',
          label: t('workingCopy.copyFilePath'),
          action: () => navigator.clipboard.writeText(entry.path),
        },
      ];
      showContextMenu(e.clientX, e.clientY, items);
    },
    [showContextMenu, stage, unstage, discard]
  );

  return (
    <div className="flex h-full">
      {/* Left panel - File changes */}
      <div
        className="flex flex-col border-r shrink-0"
        style={{
          width: 300,
          borderColor: 'var(--border-color)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        {/* Staged section */}
        <div className="flex-1 overflow-y-auto">
          {staged.length > 0 && (
            <div>
              <div
                className="flex items-center justify-between px-3 py-1.5 border-b cursor-pointer"
                style={{ borderColor: 'var(--border-color)' }}
                onClick={() => setShowStaged(!showStaged)}
              >
                <span className="text-xs font-medium" style={{ color: 'var(--accent-green)' }}>
                  {t('workingCopy.staged')} ({staged.length})
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnstageAll();
                  }}
                  className="text-xs px-1.5 py-0.5 rounded transition-colors hover:bg-overlay"
                  style={{ color: 'var(--text-subtle)' }}
                  title="Unstage all"
                >
                  <Minus size={12} />
                </button>
              </div>
              {showStaged && (
                <div>
                  {staged.map((entry) => (
                    <FileEntry
                      key={`staged-${entry.path}`}
                      entry={entry}
                      selected={selectedFile === entry.path}
                      onClick={() => handleFileClick(entry)}
                      onContextMenu={(e) => handleFileContextMenu(e, entry)}
                      densityStyle={densityStyle}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Unstaged section */}
          {(unstaged.length > 0 || untracked.length > 0) && (
            <div>
              <div
                className="flex items-center justify-between px-3 py-1.5 border-b cursor-pointer"
                style={{ borderColor: 'var(--border-color)' }}
                onClick={() => setShowUnstaged(!showUnstaged)}
              >
                <span className="text-xs font-medium" style={{ color: 'var(--accent-yellow)' }}>
                  {t('workingCopy.unstaged')} ({unstaged.length + untracked.length})
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStageAll();
                  }}
                  className="text-xs px-1.5 py-0.5 rounded transition-colors hover:bg-overlay"
                  style={{ color: 'var(--text-subtle)' }}
                  title="Stage all"
                >
                  <Plus size={12} />
                </button>
              </div>
              {showUnstaged && (
                <div>
                  {unstaged.map((entry) => (
                    <FileEntry
                      key={`unstaged-${entry.path}`}
                      entry={entry}
                      selected={selectedFile === entry.path}
                      onClick={() => handleFileClick(entry)}
                      onContextMenu={(e) => handleFileContextMenu(e, entry)}
                      densityStyle={densityStyle}
                    />
                  ))}
                  {untracked.map((entry) => (
                    <FileEntry
                      key={`untracked-${entry.path}`}
                      entry={entry}
                      selected={selectedFile === entry.path}
                      onClick={() => handleFileClick(entry)}
                      onContextMenu={(e) => handleFileContextMenu(e, entry)}
                      densityStyle={densityStyle}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Conflicts */}
          {conflicts.length > 0 && (
            <div>
              <div className="px-3 py-1.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <span className="text-xs font-medium" style={{ color: 'var(--accent-red)' }}>
                  {t('workingCopy.conflicts')} ({conflicts.length})
                </span>
              </div>
              {conflicts.map((entry) => (
                <FileEntry
                  key={`conflict-${entry.path}`}
                  entry={entry}
                  selected={selectedFile === entry.path}
                  onClick={() => handleFileClick(entry)}
                  onContextMenu={(e) => handleFileContextMenu(e, entry)}
                  densityStyle={densityStyle}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {staged.length === 0 && unstaged.length === 0 && untracked.length === 0 && conflicts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-xs" style={{ color: 'var(--text-subtle)' }}>
              <GitCommit size={24} className="mb-2" />
              <span>{t('workingCopy.clean')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right panel - Diff + Commit */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Diff view */}
        <div className="flex-1 overflow-auto">
          {diffLoading ? (
            <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-subtle)' }}>
              {t('workingCopy.loadingDiff')}
            </div>
          ) : parsedDiffFiles.length > 0 ? (
            <DiffView
              files={parsedDiffFiles}
              filePath={selectedFile ?? undefined}
              onStageHunk={selectedFileStaged ? undefined : handleStageHunk}
              onUnstageHunk={selectedFileStaged ? handleUnstageHunk : undefined}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--text-subtle)' }}>
              {t('workingCopy.selectFile')}
            </div>
          )}
        </div>

        {/* Commit area */}
        <div
          className="border-t shrink-0"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
        >
          {/* Commit message editor */}
          <textarea
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder={t('workingCopy.commitMessage')}
            rows={3}
            className="w-full px-3 py-2 text-sm resize-none border-none outline-none"
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              lineHeight: 1.5,
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleCommit();
              }
            }}
          />

          {/* Commit actions */}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
              {staged.length} {t('workingCopy.stagedCount')}, {unstaged.length + untracked.length} {t('workingCopy.unstagedCount')}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCommit}
                disabled={!commitMessage.trim() || staged.length === 0}
                className="px-4 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: commitMessage.trim() && staged.length > 0 ? 'var(--accent-green)' : 'var(--bg-overlay)',
                  color: commitMessage.trim() && staged.length > 0 ? 'var(--bg-base)' : 'var(--text-subtle)',
                }}
              >
                {t('workingCopy.commit')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FileEntry: React.FC<{
  entry: StatusEntry;
  selected: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  densityStyle: { rowHeight: string; listGap: string; fontSize: string; padding: string };
}> = ({ entry, selected, onClick, onContextMenu, densityStyle }) => (
  <div
    onClick={onClick}
    onContextMenu={onContextMenu}
    className="flex items-center gap-2 cursor-pointer transition-colors text-xs"
    style={{
      backgroundColor: selected ? 'rgba(137, 180, 250, 0.1)' : 'transparent',
      color: 'var(--text-primary)',
      padding: densityStyle.padding,
      minHeight: densityStyle.rowHeight,
      fontSize: densityStyle.fontSize,
    }}
  >
    <span style={{ color: STATUS_COLORS[entry.status] }}>
      {STATUS_ICONS[entry.status]}
    </span>
    <span
      className="px-1 py-0.5 rounded font-mono font-bold"
      style={{
        backgroundColor: `${STATUS_COLORS[entry.status]}20`,
        color: STATUS_COLORS[entry.status],
        fontSize: 10,
      }}
    >
      {STATUS_LABELS[entry.status]}
    </span>
    <span className="truncate flex-1">{entry.path}</span>
  </div>
);
