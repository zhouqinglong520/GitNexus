import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitBranch,
  GitCommit,
  FolderGit2,
  Settings,
  Tag,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  TreePine,
  BarChart3,
  Lock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  GitCompare,
  GitPullRequest,
  Upload,
  Download,
  Edit3,
  Scissors,
  Search,
  FolderOpen,
  Copy,
} from 'lucide-react';
import { useRepositoryStore } from '@/stores/repository-store';
import { useGitStore } from '@/stores/git-store';
import { useUIStore } from '@/stores/ui-store';
import { useTranslation } from '@/i18n';
import type { TabType, Branch, Tag as TagType, Remote, ContextMenuItem, Worktree } from '@/types';

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const activeRepo = useRepositoryStore((s) => s.activeRepo);
  const tabs = useRepositoryStore((s) => s.tabs);
  const setActiveTab = useRepositoryStore((s) => s.setActiveTab);
  const closeTab = useRepositoryStore((s) => s.closeTab);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const addNotification = useUIStore((s) => s.addNotification);
  const { t } = useTranslation();

  const fetchWorktrees = useGitStore((s) => s.fetchWorktrees);
  const fetchStatistics = useGitStore((s) => s.fetchStatistics);
  const addWorktree = useGitStore((s) => s.addWorktree);
  const removeWorktree = useGitStore((s) => s.removeWorktree);
  const pruneWorktrees = useGitStore((s) => s.pruneWorktrees);
  const openInFileManager = useGitStore((s) => s.openInFileManager);

  // Merged selector to reduce re-renders (Task 5)
  const sidebarData = useGitStore((s) => ({
    branches: s.branches,
    tags: s.tags,
    remotes: s.remotes,
    stashes: s.stashes,
    status: s.status,
    worktrees: s.worktrees,
    statistics: s.statistics,
    worktreesLoading: s.loading.worktrees,
    statisticsLoading: s.loading.statistics,
  }));

  // Destructure from merged selector
  const { branches, tags, remotes, stashes, status, worktrees, statistics, worktreesLoading, statisticsLoading } = sidebarData;

  // Branch operations
  const checkoutBranch = useGitStore((s) => s.checkout);
  const createBranch = useGitStore((s) => s.createBranch);
  const mergeBranch = useGitStore((s) => s.merge);
  const rebaseBranch = useGitStore((s) => s.rebase);
  const pushBranch = useGitStore((s) => s.push);
  const pullBranch = useGitStore((s) => s.pull);
  const fetchRemote = useGitStore((s) => s.fetchRemote);
  const setUpstream = useGitStore((s) => s.setUpstream);
  const renameBranch = useGitStore((s) => s.renameBranch);
  const deleteBranch = useGitStore((s) => s.deleteBranch);

  // Tag operations
  const pushTag = useGitStore((s) => s.pushTag);
  const deleteTag = useGitStore((s) => s.deleteTag);
  const deleteRemoteTag = useGitStore((s) => s.deleteRemoteTag);

  // Remote operations
  const removeRemote = useGitStore((s) => s.removeRemote);
  const pruneRemote = useGitStore((s) => s.pruneRemote);
  const editRemote = useGitStore((s) => s.editRemote);

  const showContextMenu = useUIStore((s) => s.showContextMenu);
  const showDialog = useUIStore((s) => s.showDialog);
  const activeViewTab = useUIStore((s) => s.activeViewTab);
  const setActiveViewTab = useUIStore((s) => s.setActiveViewTab);

  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    'local-branches': false,
    'remotes': false,
    'tags': false,
    'worktrees': false,
    'statistics': false,
  });

  // Worktree dialog state
  const [addWorktreeDialogOpen, setAddWorktreeDialogOpen] = useState(false);
  const [newWorktreePath, setNewWorktreePath] = useState('');
  const [newWorktreeRef, setNewWorktreeRef] = useState('');
  const [addingWorktree, setAddingWorktree] = useState(false);

  const toggleGroup = useCallback((group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  }, []);

  const query = useMemo(() => searchQuery.toLowerCase().trim(), [searchQuery]);
  const localBranches = useMemo(() => {
    const local = branches.filter((b) => !b.is_remote);
    if (!query) return local;
    return local.filter((b) => b.name.toLowerCase().includes(query));
  }, [branches, query]);
  const remoteBranches = useMemo(() => {
    const remote = branches.filter((b) => b.is_remote);
    if (!query) return remote;
    return remote.filter((b) => b.name.toLowerCase().includes(query));
  }, [branches, query]);
  const filteredTags = useMemo(() => {
    if (!query) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(query));
  }, [tags, query]);

  // Load worktrees and statistics when sidebar is open and section is selected
  useEffect(() => {
    if (sidebarOpen && activeRepo) {
      fetchWorktrees();
      fetchStatistics();
    }
  }, [sidebarOpen, activeRepo, fetchWorktrees, fetchStatistics]);

  const handleAddWorktree = useCallback(async () => {
    if (!newWorktreePath.trim()) {
      addNotification({ type: 'warning', title: 'Please enter worktree path' });
      return;
    }
    if (!newWorktreeRef.trim()) {
      addNotification({ type: 'warning', title: 'Please enter a reference (branch name)' });
      return;
    }
    setAddingWorktree(true);
    try {
      await addWorktree(newWorktreePath, newWorktreeRef);
      addNotification({ type: 'success', title: 'Worktree added' });
      setAddWorktreeDialogOpen(false);
      setNewWorktreePath('');
      setNewWorktreeRef('');
    } catch (err) {
      addNotification({ type: 'error', title: 'Failed to add worktree', message: String(err) });
    } finally {
      setAddingWorktree(false);
    }
  }, [newWorktreePath, newWorktreeRef, addWorktree, addNotification]);

  const handleRemoveWorktree = useCallback(
    async (path: string) => {
      try {
        await removeWorktree(path, false);
        addNotification({ type: 'success', title: 'Worktree removed' });
      } catch (err) {
        addNotification({ type: 'error', title: 'Failed to remove worktree', message: String(err) });
      }
    },
    [removeWorktree, addNotification]
  );

  const handlePruneWorktrees = useCallback(async () => {
    try {
      await pruneWorktrees();
      addNotification({ type: 'success', title: 'Worktrees pruned' });
    } catch (err) {
      addNotification({ type: 'error', title: 'Failed to prune worktrees', message: String(err) });
    }
  }, [pruneWorktrees, addNotification]);

  // ---- Branch context menu ----
  const handleBranchContextMenu = useCallback(
    (e: React.MouseEvent, branch: Branch) => {
      e.preventDefault();
      const items: ContextMenuItem[] = [];

      if (branch.is_remote) {
        // Remote branch context menu
        const remoteName = branch.name.split('/')[0];
        const branchName = branch.name.substring(branch.name.indexOf('/') + 1);
        items.push(
          {
            id: 'checkout-local',
            label: t('sidebar.checkoutAsLocal'),
            action: () => {
              checkoutBranch({ branch: branch.name, create: true, force: false }).catch((err) => {
                addNotification({ type: 'error', title: t('sidebar.checkoutFailed'), message: String(err) });
              });
            },
          },
          {
            id: 'fetch',
            label: t('sidebar.fetch'),
            icon: <Download size={12} />,
            action: () => {
              fetchRemote({ remote: remoteName, prune: false }).catch((err) => {
                addNotification({ type: 'error', title: t('sidebar.fetchFailed'), message: String(err) });
              });
            },
          },
          {
            id: 'set-upstream',
            label: t('sidebar.setUpstream'),
            action: () => {
              const currentBranch = useGitStore.getState().status?.branch;
              if (currentBranch) {
                setUpstream(currentBranch, branch.name).catch((err) => {
                  addNotification({ type: 'error', title: t('sidebar.setUpstreamFailed'), message: String(err) });
                });
              } else {
                addNotification({ type: 'warning', title: t('sidebar.noCurrentBranch') });
              }
            },
          },
          {
            id: 'merge',
            label: t('sidebar.mergeToCurrent'),
            icon: <GitPullRequest size={12} />,
            action: () => {
              mergeBranch({ branch: branch.name, message: `Merge ${branch.name}`, ff: 'no-fast-forward' }).catch((err) => {
                addNotification({ type: 'error', title: t('sidebar.mergeFailed'), message: String(err) });
              });
            },
          },
          { id: 'sep', label: '', separator: true },
          {
            id: 'delete-remote-branch',
            label: t('sidebar.deleteRemoteBranch'),
            icon: <Trash2 size={12} />,
            action: () => {
              showDialog({
                type: 'confirm',
                title: t('sidebar.deleteRemoteBranch'),
                message: t('sidebar.deleteRemoteBranchConfirm', branch.name),
                confirmLabel: t('common.confirm'),
                cancelLabel: t('common.cancel'),
                onConfirm: () => {
                  pushBranch({ remote: remoteName, branch: branchName, force: true, upstream: false }).catch((err) => {
                    addNotification({ type: 'error', title: t('sidebar.deleteRemoteBranchFailed'), message: String(err) });
                  });
                },
              });
            },
          }
        );
      } else {
        // Local branch context menu
        items.push(
          {
            id: 'checkout',
            label: t('sidebar.checkout'),
            action: () => {
              checkoutBranch({ branch: branch.name, create: false, force: false }).catch((err) => {
                addNotification({ type: 'error', title: t('sidebar.checkoutFailed'), message: String(err) });
              });
            },
            disabled: branch.is_current,
          },
          {
            id: 'create-branch',
            label: t('sidebar.createBranchFrom'),
            action: () => {
              createBranch({ name: '', ref: branch.name }).catch((err) => {
                addNotification({ type: 'error', title: t('sidebar.createBranchFailed'), message: String(err) });
              });
            },
          },
          { id: 'sep1', label: '', separator: true },
          {
            id: 'merge',
            label: t('sidebar.mergeToCurrent'),
            icon: <GitPullRequest size={12} />,
            action: () => {
              mergeBranch({ branch: branch.name, message: `Merge ${branch.name}`, ff: 'no-fast-forward' }).catch((err) => {
                addNotification({ type: 'error', title: t('sidebar.mergeFailed'), message: String(err) });
              });
            },
            disabled: branch.is_current,
          },
          {
            id: 'rebase',
            label: t('sidebar.rebaseToBranch'),
            icon: <Scissors size={12} />,
            action: () => {
              rebaseBranch(branch.name).catch((err) => {
                addNotification({ type: 'error', title: t('sidebar.rebaseFailed'), message: String(err) });
              });
            },
            disabled: branch.is_current,
          },
          { id: 'sep2', label: '', separator: true },
          {
            id: 'push',
            label: t('sidebar.push'),
            icon: <Upload size={12} />,
            action: () => {
              pushBranch({ remote: '', branch: branch.name, force: false, upstream: !branch.upstream }).catch((err) => {
                addNotification({ type: 'error', title: t('sidebar.pushFailed'), message: String(err) });
              });
            },
          },
          {
            id: 'pull',
            label: t('sidebar.pull'),
            icon: <Download size={12} />,
            action: () => {
              pullBranch({ remote: '', branch: branch.name, rebase: false }).catch((err) => {
                addNotification({ type: 'error', title: t('sidebar.pullFailed'), message: String(err) });
              });
            },
          },
          {
            id: 'set-upstream',
            label: t('sidebar.setUpstream'),
            action: () => {
              const remoteBranch = branch.upstream ?? `origin/${branch.name}`;
              setUpstream(branch.name, remoteBranch).catch((err) => {
                addNotification({ type: 'error', title: t('sidebar.setUpstreamFailed'), message: String(err) });
              });
            },
          },
          { id: 'sep3', label: '', separator: true },
          {
            id: 'rename',
            label: t('sidebar.renameBranch'),
            icon: <Edit3 size={12} />,
            action: () => {
              showDialog({
                type: 'confirm',
                title: t('sidebar.renameBranch'),
                message: t('sidebar.renameBranchDesc', branch.name),
                confirmLabel: t('common.confirm'),
                cancelLabel: t('common.cancel'),
                onConfirm: () => {
                  // For simplicity, open a prompt-style dialog; in production, use a custom input dialog
                  const newName = window.prompt(t('sidebar.enterNewBranchName'), branch.name);
                  if (newName && newName !== branch.name) {
                    renameBranch(branch.name, newName).catch((err) => {
                      addNotification({ type: 'error', title: t('sidebar.renameBranchFailed'), message: String(err) });
                    });
                  }
                },
              });
            },
          },
          {
            id: 'delete',
            label: t('sidebar.deleteBranch'),
            icon: <Trash2 size={12} />,
            action: () => {
              showDialog({
                type: 'confirm',
                title: t('sidebar.deleteBranch'),
                message: t('sidebar.deleteBranchConfirm', branch.name),
                confirmLabel: t('common.confirm'),
                cancelLabel: t('common.cancel'),
                onConfirm: () => {
                  deleteBranch({ name: branch.name, force: false }).catch((err) => {
                    addNotification({ type: 'error', title: t('sidebar.deleteBranchFailed'), message: String(err) });
                  });
                },
              });
            },
            disabled: branch.is_current,
          },
          {
            id: 'force-delete',
            label: t('sidebar.forceDeleteBranch'),
            action: () => {
              showDialog({
                type: 'confirm',
                title: t('sidebar.forceDeleteBranch'),
                message: t('sidebar.forceDeleteBranchConfirm', branch.name),
                confirmLabel: t('common.confirm'),
                cancelLabel: t('common.cancel'),
                onConfirm: () => {
                  deleteBranch({ name: branch.name, force: true }).catch((err) => {
                    addNotification({ type: 'error', title: t('sidebar.deleteBranchFailed'), message: String(err) });
                  });
                },
              });
            },
            disabled: branch.is_current,
          }
        );
      }

      showContextMenu(e.clientX, e.clientY, items);
    },
    [showContextMenu, addNotification, showDialog, t, checkoutBranch, createBranch, mergeBranch, rebaseBranch, pushBranch, pullBranch, fetchRemote, setUpstream, renameBranch, deleteBranch]
  );

  // ---- Tag context menu ----
  const handleTagContextMenu = useCallback(
    (e: React.MouseEvent, tag: TagType) => {
      e.preventDefault();
      const items: ContextMenuItem[] = [
        {
          id: 'checkout',
          label: t('sidebar.checkout'),
          action: () => {
            checkoutBranch({ branch: tag.name, create: false, force: false }).catch((err) => {
              addNotification({ type: 'error', title: t('sidebar.checkoutFailed'), message: String(err) });
            });
          },
        },
        {
          id: 'push-tag',
          label: t('sidebar.pushTag'),
          icon: <Upload size={12} />,
          action: () => {
            pushTag(tag.name, 'origin').catch((err) => {
              addNotification({ type: 'error', title: t('sidebar.pushTagFailed'), message: String(err) });
            });
          },
        },
        { id: 'sep1', label: '', separator: true },
        {
          id: 'delete-tag-local',
          label: t('sidebar.deleteTagLocal'),
          icon: <Trash2 size={12} />,
          action: () => {
            showDialog({
              type: 'confirm',
              title: t('sidebar.deleteTagLocal'),
              message: t('sidebar.deleteTagConfirm', tag.name),
              confirmLabel: t('common.confirm'),
              cancelLabel: t('common.cancel'),
              onConfirm: () => {
                deleteTag({ name: tag.name }).catch((err) => {
                  addNotification({ type: 'error', title: t('sidebar.deleteTagFailed'), message: String(err) });
                });
              },
            });
          },
        },
        {
          id: 'delete-tag-remote',
          label: t('sidebar.deleteTagRemote'),
          action: () => {
            showDialog({
              type: 'confirm',
              title: t('sidebar.deleteTagRemote'),
              message: t('sidebar.deleteRemoteTagConfirm', tag.name),
              confirmLabel: t('common.confirm'),
              cancelLabel: t('common.cancel'),
              onConfirm: () => {
                deleteRemoteTag(tag.name, 'origin').catch((err) => {
                  addNotification({ type: 'error', title: t('sidebar.deleteRemoteTagFailed'), message: String(err) });
                });
              },
            });
          },
        },
      ];
      showContextMenu(e.clientX, e.clientY, items);
    },
    [showContextMenu, addNotification, showDialog, t, checkoutBranch, pushTag, deleteTag, deleteRemoteTag]
  );

  // ---- Remote context menu ----
  const handleRemoteContextMenu = useCallback(
    (e: React.MouseEvent, remote: Remote) => {
      e.preventDefault();
      const items: ContextMenuItem[] = [
        {
          id: 'fetch',
          label: t('sidebar.fetch'),
          icon: <Download size={12} />,
          action: () => {
            fetchRemote({ remote: remote.name, prune: false }).catch((err) => {
              addNotification({ type: 'error', title: t('sidebar.fetchFailed'), message: String(err) });
            });
          },
        },
        {
          id: 'prune',
          label: t('sidebar.pruneRemote'),
          icon: <RefreshCw size={12} />,
          action: () => {
            pruneRemote(remote.name).catch((err) => {
              addNotification({ type: 'error', title: t('sidebar.pruneRemoteFailed'), message: String(err) });
            });
          },
        },
        { id: 'sep1', label: '', separator: true },
        {
          id: 'edit-url',
          label: t('sidebar.editRemoteUrl'),
          icon: <Edit3 size={12} />,
          action: () => {
            const newUrl = window.prompt(t('sidebar.enterNewRemoteUrl'), remote.url);
            if (newUrl && newUrl !== remote.url) {
              editRemote(remote.name, newUrl).catch((err) => {
                addNotification({ type: 'error', title: t('sidebar.editRemoteUrlFailed'), message: String(err) });
              });
            }
          },
        },
        {
          id: 'delete-remote',
          label: t('sidebar.deleteRemote'),
          icon: <Trash2 size={12} />,
          action: () => {
            showDialog({
              type: 'confirm',
              title: t('sidebar.deleteRemote'),
              message: t('sidebar.deleteRemoteConfirm', remote.name),
              confirmLabel: t('common.confirm'),
              cancelLabel: t('common.cancel'),
              onConfirm: () => {
                removeRemote({ name: remote.name }).catch((err) => {
                  addNotification({ type: 'error', title: t('sidebar.deleteRemoteFailed'), message: String(err) });
                });
              },
            });
          },
        },
      ];
      showContextMenu(e.clientX, e.clientY, items);
    },
    [showContextMenu, addNotification, showDialog, t, fetchRemote, pruneRemote, editRemote, removeRemote]
  );

  // ---- Worktree 右键菜单 ----
  const handleWorktreeContextMenu = useCallback(
    (e: React.MouseEvent, wt: Worktree) => {
      e.preventDefault();
      const items: ContextMenuItem[] = [
        {
          id: 'open-in-file-manager',
          label: t('sidebar.openInFileManager'),
          icon: <FolderOpen size={12} />,
          action: () => {
            openInFileManager(wt.path).catch(() => {});
          },
        },
        { id: 'sep1', label: '', separator: true },
        {
          id: 'copy-path',
          label: t('workingCopy.copyFilePath'),
          icon: <Copy size={12} />,
          action: () => navigator.clipboard.writeText(wt.path),
        },
      ];

      if (!wt.is_main) {
        items.push(
          { id: 'sep2', label: '', separator: true },
          {
            id: 'remove',
            label: t('sidebar.removeWorktree'),
            icon: <Trash2 size={12} />,
            action: () => handleRemoveWorktree(wt.path),
          }
        );
      }

      showContextMenu(e.clientX, e.clientY, items);
    },
    [showContextMenu, openInFileManager, handleRemoveWorktree, t]
  );

  if (!sidebarOpen) {
    return (
      <div
        className={`flex flex-col items-center py-2 border-r shrink-0 ${className}`}
        style={{
          width: 40,
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-color)',
        }}
      >
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded transition-colors hover:bg-overlay"
          style={{ color: 'var(--text-secondary)' }}
          title={t('sidebar.expandSidebar')}
        >
          <ChevronRight size={16} />
        </button>
        <div className="mt-4 flex flex-col gap-2">
          <SidebarIcon icon={<GitBranch size={18} />} title={t('sidebar.branches')} />
          <SidebarIcon icon={<Clock size={18} />} title={t('sidebar.history')} />
          <SidebarIcon icon={<Tag size={18} />} title={t('sidebar.tags')} />
        </div>
      </div>
    );
  }

  const viewTabs: { id: TabType; label: string }[] = [
    { id: 'histories', label: t('repository.histories') },
    { id: 'working-copy', label: t('repository.workingCopy') },
    { id: 'stashes', label: t('repository.stashes') },
  ];

  return (
    <div
      className={`flex flex-col border-r shrink-0 overflow-hidden ${className}`}
      style={{
        width: 260,
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b shrink-0"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-2">
          <FolderGit2 size={16} style={{ color: 'var(--accent-mauve)' }} />
          <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {activeRepo ? activeRepo.split('/').pop() : t('sidebar.noRepo')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleSidebar}
            className="p-1 rounded transition-colors hover:bg-overlay"
            style={{ color: 'var(--text-subtle)' }}
            title={t('sidebar.collapseSidebar')}
          >
            <ChevronLeft size={14} />
          </button>
        </div>
      </div>

      {/* Status bar */}
      {status && (
        <div
          className="px-3 py-1.5 border-b text-xs flex items-center gap-2 shrink-0"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
        >
          <GitBranch size={12} style={{ color: 'var(--accent-green)' }} />
          <span className="truncate">{status.branch ?? 'HEAD'}</span>
          {status.ahead > 0 && (
            <span style={{ color: 'var(--accent-green)' }}>
              +{status.ahead}
            </span>
          )}
          {status.behind > 0 && (
            <span style={{ color: 'var(--accent-red)' }}>
              -{status.behind}
            </span>
          )}
        </div>
      )}

      {/* View Selector - SourceGit style rounded buttons */}
      <div className="p-2 shrink-0">
        <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--bg-overlay)' }}>
          {viewTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveViewTab(tab.id)}
              className="flex-1 py-1.5 text-xs font-medium rounded-md transition-all"
              style={{
                backgroundColor: activeViewTab === tab.id ? 'var(--accent-blue)' : 'transparent',
                color: activeViewTab === tab.id ? 'var(--bg-base)' : 'var(--text-subtle)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search filter */}
      <div className="px-2 pb-2 shrink-0">
        <div
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs"
          style={{ backgroundColor: 'var(--bg-overlay)', border: '1px solid var(--border-color)' }}
        >
          <Search size={12} style={{ color: 'var(--text-subtle)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('sidebar.search') || 'Filter...'}
            className="flex-1 bg-transparent border-none outline-none text-xs"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Collapsible Groups */}
      <div className="flex-1 overflow-y-auto">
        {/* LOCAL BRANCHES */}
        <CollapsibleGroup
          title="LOCAL BRANCHES"
          count={localBranches.length}
          collapsed={collapsedGroups['local-branches']}
          onToggle={() => toggleGroup('local-branches')}
          extraContent={
            <button
              onClick={() => {
                const name = window.prompt('Enter new branch name');
                if (name && name.trim()) {
                  createBranch({ name: name.trim(), ref: status?.branch ?? 'HEAD' }).catch((err) => {
                    addNotification({ type: 'error', title: 'Failed to create branch', message: String(err) });
                  });
                }
              }}
              className="w-full flex items-center gap-2 px-2 py-1 text-xs rounded transition-colors hover:bg-overlay"
              style={{ color: 'var(--accent-green)' }}
            >
              <Plus size={12} />
              <span>{t('sidebar.newBranch')}</span>
            </button>
          }
        >
          {localBranches.map((branch) => (
            <button
              key={branch.name}
              className="w-full flex items-center gap-2 px-2 py-1 text-xs rounded transition-colors hover:bg-overlay"
              style={{
                color: branch.is_current ? 'var(--accent-green)' : 'var(--text-primary)',
                backgroundColor: branch.is_current ? 'rgba(166, 227, 161, 0.08)' : 'transparent',
              }}
              onContextMenu={(e) => handleBranchContextMenu(e, branch)}
            >
              <GitBranch size={12} />
              <span className="truncate flex-1 text-left">{branch.name}</span>
              {branch.is_current && (
                <span
                  className="px-1 py-0.5 rounded"
                  style={{ backgroundColor: 'var(--accent-green)', color: 'var(--bg-base)', fontSize: 9 }}
                >
                  HEAD
                </span>
              )}
            </button>
          ))}
        </CollapsibleGroup>

        {/* REMOTES */}
        <CollapsibleGroup
          title="REMOTES"
          count={remoteBranches.length}
          collapsed={collapsedGroups['remotes']}
          onToggle={() => toggleGroup('remotes')}
        >
          {remotes.map((remote) => (
            <div
              key={remote.name}
              className="flex items-center gap-2 px-2 py-1 text-xs"
              style={{ color: 'var(--accent-peach)' }}
              onContextMenu={(e) => handleRemoteContextMenu(e, remote)}
            >
              <FolderGit2 size={12} />
              <span className="font-medium">{remote.name}</span>
              <span className="truncate" style={{ color: 'var(--text-subtle)' }}>
                {remote.url}
              </span>
            </div>
          ))}
          {remoteBranches.length > 0 && remotes.length > 0 && (
            <div className="my-1 border-t" style={{ borderColor: 'var(--border-color)' }} />
          )}
          {remoteBranches.map((branch) => (
            <button
              key={branch.name}
              className="w-full flex items-center gap-2 px-2 py-1 text-xs rounded transition-colors hover:bg-overlay pl-6"
              style={{ color: 'var(--text-secondary)' }}
              onContextMenu={(e) => handleBranchContextMenu(e, branch)}
            >
              <GitBranch size={11} />
              <span className="truncate flex-1 text-left">{branch.name}</span>
            </button>
          ))}
        </CollapsibleGroup>

        {/* TAGS */}
        <CollapsibleGroup
          title="TAGS"
          count={filteredTags.length}
          collapsed={collapsedGroups['tags']}
          onToggle={() => toggleGroup('tags')}
        >
          {filteredTags.map((tag) => (
            <button
              key={tag.name}
              className="w-full flex items-center gap-2 px-2 py-1 text-xs rounded transition-colors hover:bg-overlay"
              style={{ color: 'var(--accent-mauve)' }}
              onContextMenu={(e) => handleTagContextMenu(e, tag)}
            >
              <Tag size={12} />
              <span className="truncate flex-1 text-left">{tag.name}</span>
            </button>
          ))}
        </CollapsibleGroup>

        {/* WORKTREES */}
        <CollapsibleGroup
          title="WORKTREES"
          count={worktrees.length}
          collapsed={collapsedGroups['worktrees']}
          onToggle={() => toggleGroup('worktrees')}
          extraContent={
            <div className="flex items-center gap-1">
              <button
                onClick={() => setAddWorktreeDialogOpen(true)}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs rounded transition-colors hover:bg-overlay"
                style={{ color: 'var(--accent-green)' }}
              >
                <Plus size={12} />
                <span>{t('common.add')}</span>
              </button>
              <button
                onClick={handlePruneWorktrees}
                className="flex items-center justify-center gap-1 px-2 py-1 text-xs rounded transition-colors hover:bg-overlay"
                style={{ color: 'var(--accent-peach)' }}
                title="Prune stale worktrees"
              >
                <RefreshCw size={12} />
                <span>{t('common.prune')}</span>
              </button>
            </div>
          }
        >
          {worktreesLoading ? (
            <div className="flex items-center justify-center py-4" style={{ color: 'var(--text-subtle)' }}>
              <Loader2 size={14} className="animate-spin" />
            </div>
          ) : worktrees.length === 0 ? (
            <div className="px-2 py-4 text-center text-xs" style={{ color: 'var(--text-subtle)' }}>
              {t('sidebar.noWorktrees')}
            </div>
          ) : (
            worktrees.map((wt) => (
              <div
                key={wt.path}
                className="flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-colors hover:bg-overlay group"
                style={{ color: 'var(--text-primary)' }}
                onContextMenu={(e) => handleWorktreeContextMenu(e, wt)}
              >
                <TreePine size={12} style={{ color: wt.is_main ? 'var(--accent-green)' : 'var(--accent-teal)' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="truncate font-medium">{wt.name}</span>
                    {wt.is_main && (
                      <span
                        className="px-1 py-0.5 rounded shrink-0"
                        style={{ backgroundColor: 'var(--accent-green)', color: 'var(--bg-base)', fontSize: 9 }}
                      >
                        MAIN
                      </span>
                    )}
                    {wt.is_locked && (
                      <Lock size={10} style={{ color: 'var(--accent-yellow)' }} />
                    )}
                  </div>
                  <div className="truncate" style={{ color: 'var(--text-subtle)', fontSize: 10 }}>
                    {wt.branch} - {wt.path}
                  </div>
                </div>
                {!wt.is_main && (
                  <button
                    onClick={() => handleRemoveWorktree(wt.path)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-overlay"
                    style={{ color: 'var(--accent-red)' }}
                    title="Remove worktree"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))
          )}
        </CollapsibleGroup>

        {/* STATISTICS */}
        {statistics && (
          <CollapsibleGroup
            title="STATISTICS"
            count={0}
            collapsed={collapsedGroups['statistics']}
            onToggle={() => toggleGroup('statistics')}
          >
            {statisticsLoading ? (
              <div className="flex items-center justify-center py-4" style={{ color: 'var(--text-subtle)' }}>
                <Loader2 size={14} className="animate-spin" />
              </div>
            ) : (
              <div className="space-y-1">
                <StatRow
                  icon={<GitCommit size={12} style={{ color: 'var(--accent-mauve)' }} />}
                  label={t('sidebar.totalCommits')}
                  value={statistics.total_commits.toLocaleString()}
                />
                <StatRow
                  icon={<GitBranch size={12} style={{ color: 'var(--accent-green)' }} />}
                  label={t('sidebar.totalBranches')}
                  value={statistics.total_branches.toLocaleString()}
                />
                <StatRow
                  icon={<Tag size={12} style={{ color: 'var(--accent-peach)' }} />}
                  label={t('sidebar.totalTags')}
                  value={statistics.total_tags.toLocaleString()}
                />
                <StatRow
                  icon={<FolderGit2 size={12} style={{ color: 'var(--accent-blue)' }} />}
                  label={t('sidebar.totalRemotes')}
                  value={statistics.total_remotes.toLocaleString()}
                />
                <StatRow
                  icon={<AlertTriangle size={12} style={{ color: 'var(--accent-lavender)' }} />}
                  label={t('sidebar.totalAuthors')}
                  value={statistics.total_authors.toLocaleString()}
                />

                {/* Date range */}
                {statistics.first_commit_time && (
                  <div
                    className="mt-2 px-2 py-1.5 rounded text-xs"
                    style={{ backgroundColor: 'var(--bg-overlay)', color: 'var(--text-subtle)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span>{t('sidebar.firstCommit')}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {new Date(statistics.first_commit_time * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    {statistics.last_commit_time && (
                      <div className="flex items-center justify-between mt-1">
                        <span>{t('sidebar.lastCommit')}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {new Date(statistics.last_commit_time * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CollapsibleGroup>
        )}
      </div>

      {/* Quick navigation */}
      <div
        className="border-t shrink-0"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <button
          onClick={() => navigate('/compare')}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-overlay"
          style={{ color: 'var(--accent-blue)' }}
        >
          <GitCompare size={14} />
          <span>{t('sidebar.compareRevisions')}</span>
        </button>
        <button
          onClick={() => navigate('/statistics')}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-overlay"
          style={{ color: 'var(--accent-mauve)' }}
        >
          <BarChart3 size={14} />
          <span>{t('sidebar.statistics')}</span>
        </button>
      </div>

      {/* Add Worktree Dialog */}
      {addWorktreeDialogOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000 }}
          onClick={() => setAddWorktreeDialogOpen(false)}
        >
          <div
            className="rounded-lg shadow-lg p-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              width: 360,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              {t('sidebar.addWorktree')}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {t('sidebar.worktreePath')}
                </label>
                <input
                  type="text"
                  value={newWorktreePath}
                  onChange={(e) => setNewWorktreePath(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border text-xs"
                  style={{
                    backgroundColor: 'var(--bg-overlay)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="/path/to/worktree"
                />
              </div>

              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {t('sidebar.branchRef')}
                </label>
                <input
                  type="text"
                  value={newWorktreeRef}
                  onChange={(e) => setNewWorktreeRef(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border text-xs"
                  style={{
                    backgroundColor: 'var(--bg-overlay)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="e.g., feature/new-branch"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setAddWorktreeDialogOpen(false)}
                className="px-3 py-1.5 rounded text-xs transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAddWorktree}
                disabled={addingWorktree || !newWorktreePath.trim() || !newWorktreeRef.trim()}
                className="px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent-green)',
                  color: 'var(--bg-base)',
                }}
              >
                {addingWorktree ? t('sidebar.adding') : t('sidebar.addWorktreeBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SidebarIcon: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <button
    className="p-1.5 rounded transition-colors hover:bg-overlay"
    style={{ color: 'var(--text-secondary)' }}
    title={title}
  >
    {icon}
  </button>
);

const StatRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div
    className="flex items-center gap-2 px-2 py-1.5 rounded text-xs"
    style={{ backgroundColor: 'var(--bg-overlay)' }}
  >
    {icon}
    <span className="flex-1" style={{ color: 'var(--text-secondary)' }}>
      {label}
    </span>
    <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
      {value}
    </span>
  </div>
);

const CollapsibleGroup: React.FC<{
  title: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  extraContent?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, count, collapsed, onToggle, extraContent, children }) => (
  <div className="px-2">
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-1 py-1.5 text-xs font-medium transition-colors hover:bg-overlay rounded"
      style={{ color: 'var(--text-secondary)' }}
    >
      <ChevronDown
        size={12}
        className="transition-transform shrink-0"
        style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
      />
      <span className="flex-1 text-left">{title}</span>
      {count > 0 && (
        <span style={{ color: 'var(--text-subtle)', fontSize: 10 }}>{count}</span>
      )}
    </button>
    {!collapsed && (
      <div className="pb-1">
        {extraContent}
        {children}
      </div>
    )}
  </div>
);
