import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  EyeOff,
  FolderOpen,
  ExternalLink,
  FileOutput,
  Trash2,
  Bot,
  Loader2,
  Search,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Check,
  Send,
  Upload,
  RotateCcw,
} from 'lucide-react';
import type { StatusEntry, FileStatus, ContextMenuItem } from '@/types';
import { parseDiff } from '@/utils/diff-parser';

// ============================================================
// 文件状态图标、颜色、标签常量
// ============================================================

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

// ============================================================
// FileEntry 组件 - 文件列表条目 (React.memo)
// ============================================================

const FileEntry: React.FC<{
  entry: StatusEntry;
  selected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  densityStyle: { rowHeight: string; listGap: string; fontSize: string; padding: string };
}> = React.memo(({ entry, selected, onClick, onDoubleClick, onContextMenu, densityStyle }) => (
  <div
    onClick={onClick}
    onDoubleClick={onDoubleClick}
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
      className="px-1 py-0.5 rounded font-mono font-bold shrink-0"
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
));

FileEntry.displayName = 'FileEntry';

// ============================================================
// 工具栏按钮组件
// ============================================================

const ToolButton: React.FC<{
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}> = React.memo(({ icon, title, onClick, disabled, active }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className="flex items-center justify-center rounded transition-colors"
    style={{
      width: 24,
      height: 24,
      color: active ? 'var(--accent-blue)' : disabled ? 'var(--text-disabled, var(--text-subtle))' : 'var(--text-subtle)',
      opacity: disabled ? 0.4 : 1,
      backgroundColor: active ? 'rgba(137, 180, 250, 0.15)' : 'transparent',
    }}
    onMouseEnter={(e) => {
      if (!disabled) e.currentTarget.style.backgroundColor = 'var(--bg-overlay, rgba(255,255,255,0.05))';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = active ? 'rgba(137, 180, 250, 0.15)' : 'transparent';
    }}
  >
    {icon}
  </button>
));

ToolButton.displayName = 'ToolButton';

// ============================================================
// 复选框按钮组件 (用于 SignOff, NoVerify, Amend)
// ============================================================

const CheckButton: React.FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = React.memo(({ label, checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className="flex items-center gap-1.5 text-xs rounded px-1.5 py-0.5 transition-colors"
    style={{
      color: checked ? 'var(--accent-blue)' : 'var(--text-subtle)',
      backgroundColor: checked ? 'rgba(137, 180, 250, 0.1)' : 'transparent',
      border: 'none',
      cursor: 'pointer',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = checked ? 'rgba(137, 180, 250, 0.15)' : 'var(--bg-overlay, rgba(255,255,255,0.05))';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = checked ? 'rgba(137, 180, 250, 0.1)' : 'transparent';
    }}
  >
    <span
      className="flex items-center justify-center rounded-sm"
      style={{
        width: 14,
        height: 14,
        border: checked ? '1.5px solid var(--accent-blue)' : '1.5px solid var(--text-subtle)',
        backgroundColor: checked ? 'var(--accent-blue)' : 'transparent',
        color: checked ? 'var(--bg-base)' : 'transparent',
        fontSize: 10,
      }}
    >
      {checked && <Check size={10} strokeWidth={3} />}
    </span>
    <span>{label}</span>
  </button>
));

CheckButton.displayName = 'CheckButton';

// ============================================================
// WorkingCopy 主组件
// ============================================================

export const WorkingCopy: React.FC = () => {
  // ---- Store 订阅 ----
  const status = useGitStore((s) => s.status);
  const diff = useGitStore((s) => s.diff);
  const diffLoading = useGitStore((s) => s.loading.diff);
  const inProgress = useGitStore((s) => s.inProgress);
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
  const assumeUnchanged = useGitStore((s) => s.assumeUnchanged);
  const skipWorktree = useGitStore((s) => s.skipWorktree);
  const addToGitignore = useGitStore((s) => s.addToGitignore);
  const deleteFiles = useGitStore((s) => s.deleteFiles);
  const openInFileManager = useGitStore((s) => s.openInFileManager);
  const openInTerminal = useGitStore((s) => s.openInTerminal);
  const savePatch = useGitStore((s) => s.savePatch);
  const repoPath = useGitStore((s) => s.repoPath);
  const aiGenerateCommitMessage = useGitStore((s) => s.aiGenerateCommitMessage);
  const showContextMenu = useUIStore((s) => s.showContextMenu);
  const addNotification = useUIStore((s) => s.addNotification);
  const showDialog = useUIStore((s) => s.showDialog);
  const aiPreferences = usePreferencesStore((s) => s.preferences.ai);
  const { t } = useTranslation();

  // Density 配置
  const density = usePreferencesStore((s) => s.preferences.appearance.density);
  const densityStyle = densityConfig[density];

  // ---- 本地状态 ----
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileStaged, setSelectedFileStaged] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [showStaged, setShowStaged] = useState(true);
  const [showUnstaged, setShowUnstaged] = useState(true);
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [signOff, setSignOff] = useState(false);
  const [noVerify, setNoVerify] = useState(false);
  const [amend, setAmend] = useState(false);
  const [resetAuthor, setResetAuthor] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ---- 解析 diff ----
  const parsedDiffFiles = useMemo(() => {
    if (!diff) return [];
    return parseDiff(diff);
  }, [diff]);

  // ---- 初始化加载状态 ----
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ---- 文件分类: staged, unstaged, untracked, conflicts ----
  const { staged, unstaged, untracked, conflicts } = useMemo(() => {
    if (!status) return { staged: [], unstaged: [], untracked: [], conflicts: [] };
    const _staged: StatusEntry[] = [];
    const _unstaged: StatusEntry[] = [];
    const _conflicts: StatusEntry[] = [];

    for (const change of status.changes) {
      if (change.status === 'Conflicted' || change.status === 'Unmerged') {
        _conflicts.push(change);
      } else if (change.staged) {
        _staged.push(change);
      } else {
        _unstaged.push(change);
      }
    }

    const _untracked: StatusEntry[] = status.untracked_files.map((path) => ({
      path,
      status: 'Untracked' as FileStatus,
      staged: false,
    }));

    return { staged: _staged, unstaged: _unstaged, untracked: _untracked, conflicts: _conflicts };
  }, [status]);

  // ---- 搜索过滤 ----
  const filteredUnstaged = useMemo(() => {
    if (!searchQuery.trim()) return [...unstaged, ...untracked];
    const q = searchQuery.toLowerCase();
    return [...unstaged, ...untracked].filter((e) => e.path.toLowerCase().includes(q));
  }, [unstaged, untracked, searchQuery]);

  const filteredStaged = useMemo(() => {
    if (!searchQuery.trim()) return staged;
    const q = searchQuery.toLowerCase();
    return staged.filter((e) => e.path.toLowerCase().includes(q));
  }, [staged, searchQuery]);

  const filteredConflicts = useMemo(() => {
    if (!searchQuery.trim()) return conflicts;
    const q = searchQuery.toLowerCase();
    return conflicts.filter((e) => e.path.toLowerCase().includes(q));
  }, [conflicts, searchQuery]);

  // ---- 处理文件点击 (选中并获取 diff) ----
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

  // ---- 双击 Stage/Unstage ----
  const handleDoubleClick = useCallback(
    (entry: StatusEntry) => {
      if (entry.staged) {
        unstage({ paths: [entry.path] }).catch(() => {});
      } else {
        stage({ paths: [entry.path] }).catch(() => {});
      }
    },
    [stage, unstage]
  );

  // ---- Stage All / Unstage All ----
  const handleStageAll = useCallback(() => {
    stageAll().catch((err) => {
      addNotification({ type: 'error', title: t('workingCopy.stageAllFailed'), message: String(err) });
    });
  }, [stageAll, addNotification, t]);

  const handleUnstageAll = useCallback(() => {
    unstageAll().catch((err) => {
      addNotification({ type: 'error', title: t('workingCopy.unstageAllFailed'), message: String(err) });
    });
  }, [unstageAll, addNotification, t]);

  // ---- 提交 ----
  const handleCommit = useCallback(
    async (push = false) => {
      if (!commitMessage.trim()) {
        addNotification({ type: 'warning', title: t('workingCopy.noCommitMessage') });
        return;
      }
      try {
        // 注意: signoff / noVerify / resetAuthor 作为 UI 占位复选框暂时保留
        // 后端 CommitParams 仅支持 message 和 amend，待后端扩展后再传递
        await commit({
          message: commitMessage,
          amend: amend,
        });
        // 提交后如果 push=true，执行推送
        if (push) {
          try {
            await useGitStore.getState().push({ remote: '', branch: '', force: false, upstream: true });
          } catch (pushErr) {
            addNotification({ type: 'error', title: t('workingCopy.pushFailed', 'Push failed'), message: String(pushErr) });
          }
        }
        // amend 提交后保留消息, 普通提交后清空
        if (!amend) {
          setCommitMessage('');
        }
        addNotification({ type: 'success', title: t('workingCopy.commitSuccess') });
      } catch (error) {
        addNotification({ type: 'error', title: 'Commit failed', message: String(error) });
      }
    },
    [commitMessage, amend, commit, addNotification, t]
  );

  // ---- AI 生成提交消息 ----
  const handleAiGenerate = useCallback(async () => {
    if (!aiPreferences.api_key) {
      addNotification({ type: 'warning', title: t('workingCopy.aiNotConfigured') });
      return;
    }
    if (staged.length === 0) {
      addNotification({ type: 'warning', title: t('workingCopy.noStagedChanges') });
      return;
    }

    setAiStatus('loading');
    try {
      await fetchDiffStaged();
      const currentDiff = useGitStore.getState().diff;
      if (!currentDiff) {
        addNotification({ type: 'error', title: t('workingCopy.aiGenerateFailed'), message: 'No diff available' });
        setAiStatus('error');
        return;
      }

      const message = await aiGenerateCommitMessage(
        currentDiff,
        aiPreferences.provider,
        aiPreferences.api_url,
        aiPreferences.api_key,
        aiPreferences.model_name,
        aiPreferences.extra_prompt,
      );

      setCommitMessage(message);
      setAiStatus('success');
      addNotification({ type: 'success', title: t('workingCopy.aiGenerateSuccess') });
    } catch (error) {
      addNotification({ type: 'error', title: t('workingCopy.aiGenerateFailed'), message: String(error) });
      setAiStatus('error');
    } finally {
      setTimeout(() => setAiStatus('idle'), 2000);
    }
  }, [aiPreferences, staged.length, addNotification, fetchDiffStaged, aiGenerateCommitMessage, t]);

  // ---- Hunk 级 Stage/Unstage ----
  const handleStageHunk = useCallback(
    (file: string, patch: string) => {
      stageHunk(file, patch).catch((err) => {
        addNotification({ type: 'error', title: t('workingCopy.stageHunkFailed'), message: String(err) });
      });
    },
    [stageHunk, addNotification, t]
  );

  const handleUnstageHunk = useCallback(
    (file: string, patch: string) => {
      unstageHunk(file, patch).catch((err) => {
        addNotification({ type: 'error', title: t('workingCopy.unstageHunkFailed'), message: String(err) });
      });
    },
    [unstageHunk, addNotification, t]
  );

  // ---- Amend 切换时联动 ResetAuthor ----
  const handleAmendChange = useCallback((checked: boolean) => {
    setAmend(checked);
    if (!checked) {
      setResetAuthor(false);
    }
  }, []);

  // ---- 是否存在进行中的操作 (merge/rebase 等) ----
  const isInProgress = inProgress !== null && inProgress.type !== 'none';

  // ---- Commit 编辑器状态信息 (行号/字符数) ----
  const editorInfo = useMemo(() => {
    const lines = commitMessage.split('\n');
    const lineCount = lines.length;
    const charCount = commitMessage.length;
    return { lineCount, charCount };
  }, [commitMessage]);

  // ---- 全局快捷键 ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F: 聚焦搜索框
      if (e.ctrlKey && e.key === 'f') {
        // 仅当没有其他输入框聚焦时
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      // Ctrl+Enter: 提交
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleCommit(false);
        return;
      }
      // Ctrl+Alt+Enter: 提交并推送
      if (e.ctrlKey && e.altKey && e.key === 'Enter') {
        e.preventDefault();
        handleCommit(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCommit]);

  // ---- 右键菜单 ----
  const handleFileContextMenu = useCallback(
    (e: React.MouseEvent, entry: StatusEntry) => {
      e.preventDefault();
      const items: ContextMenuItem[] = [];

      if (entry.staged) {
        // Staged 文件右键菜单
        items.push(
          {
            id: 'open',
            label: t('workingCopy.open'),
            icon: <FilePlus size={12} />,
            action: () => {
              const filePath = repoPath ? `${repoPath}/${entry.path}` : entry.path;
              openInFileManager(filePath).catch(() => {});
            },
          },
          {
            id: 'open-external',
            label: t('workingCopy.openInTerminal'),
            icon: <ExternalLink size={12} />,
            action: () => {
              const filePath = repoPath ? `${repoPath}/${entry.path}` : entry.path;
              openInTerminal(filePath).catch(() => {});
            },
          },
          { id: 'sep1', label: '', separator: true },
          {
            id: 'reveal',
            label: t('workingCopy.openInFileManager'),
            icon: <FolderOpen size={12} />,
            action: () => {
              const filePath = repoPath ? `${repoPath}/${entry.path}` : entry.path;
              openInFileManager(filePath).catch(() => {});
            },
          },
          {
            id: 'unstage',
            label: t('workingCopy.unstage'),
            shortcut: 'Space',
            action: () => {
              unstage({ paths: [entry.path] });
            },
          },
          { id: 'sep2', label: '', separator: true },
          {
            id: 'stash',
            label: t('workingCopy.stash'),
            action: () => {
              // 简单 stash 操作
              addNotification({ type: 'info', title: 'Stash', message: 'Not implemented yet' });
            },
          },
          {
            id: 'export-patch',
            label: t('workingCopy.exportPatch'),
            icon: <FileOutput size={12} />,
            action: () => {
              const outputDir = repoPath ?? '.';
              savePatch('HEAD', outputDir).catch((err) => {
                addNotification({ type: 'error', title: t('workingCopy.exportPatchFailed'), message: String(err) });
              });
            },
          },
          { id: 'sep3', label: '', separator: true },
          {
            id: 'ai-generate',
            label: t('workingCopy.aiGenerateCommit'),
            icon: <Bot size={12} />,
            action: handleAiGenerate,
          },
          { id: 'sep4', label: '', separator: true },
          {
            id: 'copy-path',
            label: t('workingCopy.copyFilePath'),
            shortcut: 'Ctrl+C',
            action: () => navigator.clipboard.writeText(entry.path),
          },
          {
            id: 'copy-full-path',
            label: t('workingCopy.copyFullFilePath'),
            shortcut: 'Ctrl+Shift+C',
            action: () => {
              const fullPath = repoPath ? `${repoPath}/${entry.path}` : entry.path;
              navigator.clipboard.writeText(fullPath);
            },
          }
        );
      } else if (entry.status === 'Conflicted' || entry.status === 'Unmerged') {
        // 冲突文件右键菜单
        items.push(
          {
            id: 'open',
            label: t('workingCopy.open'),
            action: () => {
              const filePath = repoPath ? `${repoPath}/${entry.path}` : entry.path;
              openInFileManager(filePath).catch(() => {});
            },
          },
          {
            id: 'open-external',
            label: t('workingCopy.openInTerminal'),
            icon: <ExternalLink size={12} />,
            action: () => {
              const filePath = repoPath ? `${repoPath}/${entry.path}` : entry.path;
              openInTerminal(filePath).catch(() => {});
            },
          },
          { id: 'sep1', label: '', separator: true },
          {
            id: 'use-theirs',
            label: t('workingCopy.useTheirs'),
            action: () => {
              addNotification({ type: 'info', title: 'Use Theirs', message: 'Not implemented yet' });
            },
          },
          {
            id: 'use-mine',
            label: t('workingCopy.useMine'),
            action: () => {
              addNotification({ type: 'info', title: 'Use Mine', message: 'Not implemented yet' });
            },
          },
          { id: 'sep2', label: '', separator: true },
          {
            id: 'reveal',
            label: t('workingCopy.openInFileManager'),
            icon: <FolderOpen size={12} />,
            action: () => {
              const filePath = repoPath ? `${repoPath}/${entry.path}` : entry.path;
              openInFileManager(filePath).catch(() => {});
            },
          },
          { id: 'sep3', label: '', separator: true },
          {
            id: 'copy-path',
            label: t('workingCopy.copyFilePath'),
            shortcut: 'Ctrl+C',
            action: () => navigator.clipboard.writeText(entry.path),
          },
          {
            id: 'copy-full-path',
            label: t('workingCopy.copyFullFilePath'),
            shortcut: 'Ctrl+Shift+C',
            action: () => {
              const fullPath = repoPath ? `${repoPath}/${entry.path}` : entry.path;
              navigator.clipboard.writeText(fullPath);
            },
          }
        );
      } else {
        // Unstaged / Untracked 文件右键菜单
        items.push(
          {
            id: 'open',
            label: t('workingCopy.open'),
            action: () => {
              const filePath = repoPath ? `${repoPath}/${entry.path}` : entry.path;
              openInFileManager(filePath).catch(() => {});
            },
          },
          {
            id: 'open-external',
            label: t('workingCopy.openInTerminal'),
            icon: <ExternalLink size={12} />,
            action: () => {
              const filePath = repoPath ? `${repoPath}/${entry.path}` : entry.path;
              openInTerminal(filePath).catch(() => {});
            },
          },
          { id: 'sep1', label: '', separator: true },
          {
            id: 'reveal',
            label: t('workingCopy.openInFileManager'),
            icon: <FolderOpen size={12} />,
            action: () => {
              const filePath = repoPath ? `${repoPath}/${entry.path}` : entry.path;
              openInFileManager(filePath).catch(() => {});
            },
          },
          {
            id: 'stage',
            label: t('workingCopy.stage'),
            shortcut: 'Space',
            action: () => {
              stage({ paths: [entry.path] });
            },
          },
          {
            id: 'discard',
            label: t('workingCopy.discardChanges'),
            shortcut: 'Back',
            action: () => {
              showDialog({
                type: 'confirm',
                title: t('workingCopy.discardChanges'),
                message: t('workingCopy.discardConfirmMessage', entry.path),
                confirmLabel: t('common.confirm'),
                cancelLabel: t('common.cancel'),
                onConfirm: () => discard([entry.path]),
              });
            },
          },
          { id: 'sep2', label: '', separator: true },
          {
            id: 'stash',
            label: t('workingCopy.stash'),
            action: () => {
              addNotification({ type: 'info', title: 'Stash', message: 'Not implemented yet' });
            },
          },
          {
            id: 'export-patch',
            label: t('workingCopy.exportPatch'),
            icon: <FileOutput size={12} />,
            action: () => {
              addNotification({ type: 'info', title: 'Save Patch', message: 'Not implemented yet' });
            },
          },
          { id: 'sep3', label: '', separator: true },
          {
            id: 'assume-unchanged',
            label: t('workingCopy.assumeUnchanged'),
            icon: <EyeOff size={12} />,
            action: () => {
              assumeUnchanged([entry.path], true).catch((err) => {
                addNotification({ type: 'error', title: t('workingCopy.assumeUnchangedFailed'), message: String(err) });
              });
            },
          },
          {
            id: 'skip-worktree',
            label: t('workingCopy.skipWorktree'),
            icon: <EyeOff size={12} />,
            action: () => {
              skipWorktree([entry.path], true).catch((err) => {
                addNotification({ type: 'error', title: t('workingCopy.skipWorktreeFailed'), message: String(err) });
              });
            },
          },
          {
            id: 'add-to-gitignore',
            label: t('workingCopy.addToGitignore'),
            action: () => {
              addToGitignore([entry.path]).catch((err) => {
                addNotification({ type: 'error', title: t('workingCopy.addToGitignoreFailed'), message: String(err) });
              });
            },
          },
          { id: 'sep4', label: '', separator: true },
          {
            id: 'copy-path',
            label: t('workingCopy.copyFilePath'),
            shortcut: 'Ctrl+C',
            action: () => navigator.clipboard.writeText(entry.path),
          },
          {
            id: 'copy-full-path',
            label: t('workingCopy.copyFullFilePath'),
            shortcut: 'Ctrl+Shift+C',
            action: () => {
              const fullPath = repoPath ? `${repoPath}/${entry.path}` : entry.path;
              navigator.clipboard.writeText(fullPath);
            },
          }
        );
      }

      showContextMenu(e.clientX, e.clientY, items);
    },
    [
      showContextMenu, addNotification, showDialog, stage, unstage, discard,
      assumeUnchanged, skipWorktree, addToGitignore, deleteFiles,
      openInFileManager, openInTerminal, savePatch, repoPath, handleAiGenerate, t,
    ]
  );

  // ---- Unstaged 文件列表数量 (含 untracked) ----
  const unstagedCount = unstaged.length + untracked.length;

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <div className="flex h-full" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* ============================================================
          左面板 (300px, MinWidth=300)
          - 搜索框 (36px)
          - Unstaged 工具栏 (28px) + 文件列表
          - 1px 分隔线
          - Staged 工具栏 (28px) + 文件列表
          ============================================================ */}
      <div
        className="flex flex-col shrink-0"
        style={{
          width: 300,
          minWidth: 300,
          backgroundColor: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-color)',
        }}
      >
        {/* ---- 搜索过滤框 (36px) ---- */}
        <div
          className="flex items-center shrink-0 px-2"
          style={{
            height: 36,
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div
            className="flex items-center flex-1 rounded px-2"
            style={{
              height: 28,
              backgroundColor: 'var(--bg-overlay, rgba(255,255,255,0.05))',
              border: '1px solid var(--border-color)',
            }}
          >
            <Search size={13} style={{ color: 'var(--text-subtle)', flexShrink: 0, marginRight: 6 }} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('workingCopy.searchFiles', '搜索文件...')}
              className="flex-1 bg-transparent border-none outline-none text-xs"
              style={{ color: 'var(--text-primary)' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="flex items-center justify-center"
                style={{ color: 'var(--text-subtle)', width: 16, height: 16 }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* ---- Unstaged 工具栏 (28px) ---- */}
        <div
          className="flex items-center shrink-0 px-2 gap-1"
          style={{
            height: 28,
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          {/* 标题 + 数量 + 折叠 */}
          <button
            onClick={() => setShowUnstaged(!showUnstaged)}
            className="flex items-center gap-1 text-xs font-medium cursor-pointer shrink-0"
            style={{ color: 'var(--accent-yellow)', backgroundColor: 'transparent', border: 'none' }}
          >
            {showUnstaged ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span>{t('workingCopy.unstaged')}</span>
            <span style={{ color: 'var(--text-subtle)' }}>({unstagedCount})</span>
          </button>

          <div className="flex-1" />

          {/* AssumeUnchanged */}
          <ToolButton
            icon={<EyeOff size={13} />}
            title="Assume Unchanged"
            onClick={() => {}}
          />
          {/* Include Untracked (始终包含, 按钮仅做提示) */}
          {/* Stage 选中 */}
          <ToolButton
            icon={<ChevronDown size={13} />}
            title="Stage (Space/Enter)"
            onClick={() => {
              if (selectedFile && !selectedFileStaged) {
                stage({ paths: [selectedFile] }).catch(() => {});
              }
            }}
            disabled={!selectedFile || selectedFileStaged}
          />
          {/* Stage 全部 */}
          <ToolButton
            icon={<ChevronsDown size={13} />}
            title="Stage All"
            onClick={handleStageAll}
            disabled={unstagedCount === 0}
          />
        </div>

        {/* ---- Unstaged 文件列表 (可折叠) ---- */}
        {showUnstaged && (
          <div className="overflow-y-auto" style={{ flex: '1 1 0', minHeight: 0 }}>
            {filteredUnstaged.length > 0 ? (
              filteredUnstaged.map((entry) => (
                <FileEntry
                  key={`unstaged-${entry.path}`}
                  entry={entry}
                  selected={selectedFile === entry.path}
                  onClick={() => handleFileClick(entry)}
                  onDoubleClick={() => handleDoubleClick(entry)}
                  onContextMenu={(e) => handleFileContextMenu(e, entry)}
                  densityStyle={densityStyle}
                />
              ))
            ) : (
              unstagedCount === 0 && (
                <div
                  className="flex items-center justify-center text-xs"
                  style={{ padding: '8px 0', color: 'var(--text-subtle)' }}
                >
                  {searchQuery ? t('workingCopy.noResults', '无匹配结果') : ''}
                </div>
              )
            )}

            {/* 冲突文件也显示在 Unstaged 列表中 */}
            {filteredConflicts.map((entry) => (
              <FileEntry
                key={`conflict-${entry.path}`}
                entry={entry}
                selected={selectedFile === entry.path}
                onClick={() => handleFileClick(entry)}
                onDoubleClick={() => handleDoubleClick(entry)}
                onContextMenu={(e) => handleFileContextMenu(e, entry)}
                densityStyle={densityStyle}
              />
            ))}
          </div>
        )}

        {/* ---- 1px 分隔线 ---- */}
        <div style={{ height: 1, backgroundColor: 'var(--border-color)', flexShrink: 0 }} />

        {/* ---- Staged 工具栏 (28px) ---- */}
        <div
          className="flex items-center shrink-0 px-2 gap-1"
          style={{
            height: 28,
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          {/* 标题 + 数量 + 折叠 */}
          <button
            onClick={() => setShowStaged(!showStaged)}
            className="flex items-center gap-1 text-xs font-medium cursor-pointer shrink-0"
            style={{ color: 'var(--accent-green)', backgroundColor: 'transparent', border: 'none' }}
          >
            {showStaged ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span>{t('workingCopy.staged')}</span>
            <span style={{ color: 'var(--text-subtle)' }}>({staged.length})</span>
          </button>

          <div className="flex-1" />

          {/* Unstage 选中 */}
          <ToolButton
            icon={<ChevronUp size={13} />}
            title="Unstage (Space/Enter)"
            onClick={() => {
              if (selectedFile && selectedFileStaged) {
                unstage({ paths: [selectedFile] }).catch(() => {});
              }
            }}
            disabled={!selectedFile || !selectedFileStaged}
          />
          {/* Unstage 全部 */}
          <ToolButton
            icon={<ChevronsUp size={13} />}
            title="Unstage All"
            onClick={handleUnstageAll}
            disabled={staged.length === 0}
          />
        </div>

        {/* ---- Staged 文件列表 (可折叠) ---- */}
        {showStaged && (
          <div
            className="overflow-y-auto"
            style={{ flex: '1 1 0', minHeight: 0, maxHeight: '50%' }}
          >
            {filteredStaged.length > 0 ? (
              filteredStaged.map((entry) => (
                <FileEntry
                  key={`staged-${entry.path}`}
                  entry={entry}
                  selected={selectedFile === entry.path}
                  onClick={() => handleFileClick(entry)}
                  onDoubleClick={() => handleDoubleClick(entry)}
                  onContextMenu={(e) => handleFileContextMenu(e, entry)}
                  densityStyle={densityStyle}
                />
              ))
            ) : (
              staged.length === 0 && (
                <div
                  className="flex items-center justify-center text-xs"
                  style={{ padding: '8px 0', color: 'var(--text-subtle)' }}
                >
                  {searchQuery ? t('workingCopy.noResults', '无匹配结果') : ''}
                </div>
              )
            )}
          </div>
        )}

        {/* 空状态: 当没有任何变更时 */}
        {unstagedCount === 0 && staged.length === 0 && conflicts.length === 0 && (
          <div
            className="flex flex-col items-center justify-center"
            style={{ flex: 1, color: 'var(--text-subtle)' }}
          >
            <GitCommit size={24} style={{ marginBottom: 8 }} />
            <span className="text-xs">{t('workingCopy.clean')}</span>
          </div>
        )}
      </div>

      {/* ============================================================
          5px 中间分隔线
          ============================================================ */}
      <div
        className="shrink-0"
        style={{ width: 5, backgroundColor: 'var(--bg-base)' }}
      />

      {/* ============================================================
          右面板 (flex-1, MinWidth=300)
          - Diff 区域 (flex-1)
          - 4px 分隔线
          - CommitMessage 编辑器 (128px)
          - 提交选项栏 (36px)
          ============================================================ */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 300 }}>
        {/* ---- Diff 区域 (flex-1) ---- */}
        <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
          {diffLoading ? (
            <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--text-subtle)' }}>
              {t('workingCopy.loadingDiff')}
            </div>
          ) : selectedFile && parsedDiffFiles.length > 0 ? (
            <DiffView
              files={parsedDiffFiles}
              filePath={selectedFile}
              onStageHunk={selectedFileStaged ? undefined : handleStageHunk}
              onUnstageHunk={selectedFileStaged ? handleUnstageHunk : undefined}
            />
          ) : (
            /* 未选中文件时显示欢迎信息 */
            <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-subtle)' }}>
              <GitCommit size={48} strokeWidth={1} />
              <span className="text-sm">{t('workingCopy.selectFile')}</span>
            </div>
          )}
        </div>

        {/* ---- 4px 分隔线 ---- */}
        <div className="shrink-0" style={{ height: 4, backgroundColor: 'var(--border-color)', opacity: 0.3 }} />

        {/* ---- CommitMessage 编辑区域 (128px) ---- */}
        <div
          className="flex flex-col shrink-0"
          style={{
            height: 128,
            minHeight: 100,
            backgroundColor: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          {/* 提交消息文本编辑器 */}
          <div className="flex-1 relative" style={{ minHeight: 0 }}>
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder={t('workingCopy.commitMessage')}
              className="w-full px-3 py-2 text-sm resize-none border-none outline-none"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                lineHeight: 1.5,
                overflowWrap: 'break-word',
                wordWrap: 'break-word',
                whiteSpace: 'pre-wrap',
                height: '100%',
              }}
              spellCheck={false}
              onKeyDown={(e) => {
                // Ctrl+Enter: 提交
                if (e.ctrlKey && e.key === 'Enter') {
                  e.preventDefault();
                  handleCommit(false);
                  return;
                }
                // Ctrl+Alt+Enter: 提交并推送
                if (e.ctrlKey && e.altKey && e.key === 'Enter') {
                  e.preventDefault();
                  handleCommit(true);
                  return;
                }
              }}
            />
            {/* AI 生成按钮 (右下角) */}
            <button
              onClick={handleAiGenerate}
              disabled={aiStatus === 'loading'}
              className="absolute right-2 bottom-2 p-1.5 rounded transition-colors"
              style={{
                color:
                  aiStatus === 'loading'
                    ? 'var(--accent-blue)'
                    : aiStatus === 'success'
                      ? 'var(--accent-green)'
                      : aiStatus === 'error'
                        ? 'var(--accent-red)'
                        : 'var(--text-subtle)',
                backgroundColor: aiStatus !== 'idle' ? 'rgba(137, 180, 250, 0.1)' : 'transparent',
                border: 'none',
                cursor: aiStatus === 'loading' ? 'wait' : 'pointer',
              }}
              title={t('workingCopy.aiGenerateCommit')}
            >
              {aiStatus === 'loading' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Bot size={14} />
              )}
            </button>
          </div>

          {/* 底部工具栏 (24px): 状态信息 */}
          <div
            className="flex items-center justify-between px-3 shrink-0 text-xs"
            style={{ height: 24, borderTop: '1px solid var(--border-color)', color: 'var(--text-subtle)' }}
          >
            <span>
              Ln {editorInfo.lineCount}, {editorInfo.charCount} {t('workingCopy.characters', '字符')}
            </span>
            <span>
              {staged.length} {t('workingCopy.stagedCount')}, {unstagedCount} {t('workingCopy.unstagedCount')}
            </span>
          </div>
        </div>

        {/* ---- 提交选项栏 (36px) ---- */}
        <div
          className="flex items-center shrink-0 px-2 gap-2"
          style={{
            height: 36,
            backgroundColor: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          {/* SignOff 复选框 */}
          <CheckButton
            label="Sign Off"
            checked={signOff}
            onChange={setSignOff}
          />
          {/* NoVerify 复选框 */}
          <CheckButton
            label="No Verify"
            checked={noVerify}
            onChange={setNoVerify}
          />
          {/* Amend 复选框 */}
          <CheckButton
            label="Amend"
            checked={amend}
            onChange={handleAmendChange}
          />
          {/* ResetAuthor (仅在 Amend 选中时显示) */}
          {amend && (
            <CheckButton
              label="Reset Author"
              checked={resetAuthor}
              onChange={setResetAuthor}
            />
          )}

          <div className="flex-1" />

          {/* Continue 按钮 (进行中操作时显示) */}
          {isInProgress && (
            <button
              onClick={() => {
                addNotification({ type: 'info', title: 'Continue', message: 'Not implemented yet' });
              }}
              className="flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-colors"
              style={{
                backgroundColor: 'var(--accent-blue)',
                color: 'var(--bg-base)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <ChevronRight size={12} />
              <span>Continue</span>
            </button>
          )}

          {/* Commit 按钮 (Ctrl+Enter) */}
          <button
            onClick={() => handleCommit(false)}
            disabled={!commitMessage.trim() || staged.length === 0}
            className="flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-colors"
            style={{
              backgroundColor:
                commitMessage.trim() && staged.length > 0 ? 'var(--accent-green)' : 'var(--bg-overlay, rgba(255,255,255,0.05))',
              color: commitMessage.trim() && staged.length > 0 ? 'var(--bg-base)' : 'var(--text-subtle)',
              border: 'none',
              cursor: commitMessage.trim() && staged.length > 0 ? 'pointer' : 'not-allowed',
              opacity: commitMessage.trim() && staged.length > 0 ? 1 : 0.5,
            }}
            title="Commit (Ctrl+Enter)"
          >
            <Send size={12} />
            <span>{t('workingCopy.commit')}</span>
          </button>

          {/* Commit && Push 按钮 (Ctrl+Alt+Enter) */}
          <button
            onClick={() => handleCommit(true)}
            disabled={!commitMessage.trim() || staged.length === 0}
            className="flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-colors"
            style={{
              backgroundColor:
                commitMessage.trim() && staged.length > 0 ? 'var(--accent-blue)' : 'var(--bg-overlay, rgba(255,255,255,0.05))',
              color: commitMessage.trim() && staged.length > 0 ? 'var(--bg-base)' : 'var(--text-subtle)',
              border: 'none',
              cursor: commitMessage.trim() && staged.length > 0 ? 'pointer' : 'not-allowed',
              opacity: commitMessage.trim() && staged.length > 0 ? 1 : 0.5,
            }}
            title="Commit && Push (Ctrl+Alt+Enter)"
          >
            <Upload size={12} />
            <span>{t('workingCopy.commitAndPush', 'Commit && Push')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
