import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useGitStore } from '@/stores/git-store';
import { useUIStore } from '@/stores/ui-store';
import { usePreferencesStore, densityConfig } from '@/stores/preferences-store';
import { useTranslation } from '@/i18n';
import { CommitGraph } from '@/components/CommitGraph';
import { DiffView } from '@/components/DiffView';
import { InteractiveRebase } from '@/components/InteractiveRebase';
import { GitCommit, User, Clock, Copy, Check, Archive, ChevronDown, ChevronUp } from 'lucide-react';
import type { Commit, CommitDetail, ContextMenuItem } from '@/types';
import { formatRelativeTime } from '@/utils/format';
import { parseDiff } from '@/utils/diff-parser';

/** Parse the refs string from backend into structured refs */
function parseRefs(refsStr: string): { name: string; kind: string }[] {
  if (!refsStr) return [];
  try {
    return JSON.parse(refsStr) as { name: string; kind: string }[];
  } catch {
    return [];
  }
}

export const Histories: React.FC = () => {
  const commits = useGitStore((s) => s.commits);
  const loading = useGitStore((s) => s.loading.commits);
  const selectedCommitId = useGitStore((s) => s.selectedCommitId);
  const diff = useGitStore((s) => s.diff);
  const diffLoading = useGitStore((s) => s.loading.diff);
  const commitDetail = useGitStore((s) => s.commitDetail);
  const commitDetailLoading = useGitStore((s) => s.loading.commitDetail);
  const fetchCommits = useGitStore((s) => s.fetchCommits);
  const setSelectedCommitId = useGitStore((s) => s.setSelectedCommitId);
  const fetchDiff = useGitStore((s) => s.fetchDiff);
  const fetchCommitDetail = useGitStore((s) => s.fetchCommitDetail);
  const checkout = useGitStore((s) => s.checkout);
  const cherryPick = useGitStore((s) => s.cherryPick);
  const revert = useGitStore((s) => s.revert);
  const createBranch = useGitStore((s) => s.createBranch);
  const createTag = useGitStore((s) => s.createTag);
  const createArchive = useGitStore((s) => s.createArchive);
  const showContextMenu = useUIStore((s) => s.showContextMenu);
  const addNotification = useUIStore((s) => s.addNotification);
  const showDialog = useUIStore((s) => s.showDialog);
  const { t } = useTranslation();

  // Density settings
  const density = usePreferencesStore((s) => s.preferences.appearance.density);
  const densityStyle = densityConfig[density];

  const [showDetail, setShowDetail] = useState(true);
  const [detailCommit, setDetailCommit] = useState<Commit | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveRef, setArchiveRef] = useState('');
  const [archiveFormat, setArchiveFormat] = useState('zip');
  const [archiveOutput, setArchiveOutput] = useState('');
  const [archiveExporting, setArchiveExporting] = useState(false);

  // Multi-select state for interactive rebase
  const [selectedCommits, setSelectedCommits] = useState<Set<string>>(new Set());
  const [rebaseDialogOpen, setRebaseDialogOpen] = useState(false);
  const [rebaseDialogCommits, setRebaseDialogCommits] = useState<Commit[]>([]);
  const [rebaseDialogBaseSha, setRebaseDialogBaseSha] = useState('');

  // Spacebar quick preview state
  const [previewCommit, setPreviewCommit] = useState<string | null>(null);
  const [previewDetail, setPreviewDetail] = useState<CommitDetail | null>(null);
  const [previewDiff, setPreviewDiff] = useState<string | null>(null);
  const [previewDiffLoading, setPreviewDiffLoading] = useState(false);

  // Helper to check if input is focused
  const isInputFocused = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    return (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    );
  }, []);

  const parsedDiffFiles = useMemo(() => {
    if (!diff) return [];
    return parseDiff(diff);
  }, [diff]);

  useEffect(() => {
    fetchCommits({ max_count: 200 });
  }, [fetchCommits]);

  // Spacebar quick preview key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && selectedCommitId && !isInputFocused(e)) {
        e.preventDefault();
        setPreviewCommit((prev) => (prev === selectedCommitId ? null : selectedCommitId));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCommitId, isInputFocused]);

  // Fetch preview data when previewCommit changes
  useEffect(() => {
    if (previewCommit) {
      setPreviewDiffLoading(true);
      const commit = commits.find((c) => c.sha === previewCommit);
      if (commit) {
        fetchDiff({ commit1: commit.sha + '^', commit2: commit.sha });
        fetchCommitDetail(commit.sha);
      }
    } else {
      setPreviewDiff(null);
      setPreviewDetail(null);
    }
  }, [previewCommit]);

  // Sync preview data from store when diff/commitDetail change
  useEffect(() => {
    if (previewCommit) {
      setPreviewDiff(diff);
      setPreviewDetail(commitDetail);
      setPreviewDiffLoading(diffLoading || commitDetailLoading);
    }
  }, [diff, commitDetail, diffLoading, commitDetailLoading, previewCommit]);

  const previewParsedDiffFiles = useMemo(() => {
    if (!previewDiff) return [];
    return parseDiff(previewDiff);
  }, [previewDiff]);

  const selectedCommit = useMemo(
    () => commits.find((c) => c.sha === selectedCommitId),
    [commits, selectedCommitId]
  );

  const handleCommitClick = useCallback(
    (commitId: string, e?: React.MouseEvent) => {
      // Multi-select with Ctrl/Cmd key
      if (e && (e.ctrlKey || e.metaKey)) {
        setSelectedCommits((prev) => {
          const next = new Set(prev);
          if (next.has(commitId)) {
            next.delete(commitId);
          } else {
            next.add(commitId);
          }
          return next;
        });
        return;
      }

      // Clear multi-select on normal click
      setSelectedCommits(new Set());

      setSelectedCommitId(commitId);
      const commit = commits.find((c) => c.sha === commitId);
      if (commit) {
        setDetailCommit(commit);
        setShowDetail(true);
        fetchDiff({ commit1: commit.sha + '^', commit2: commit.sha });
        fetchCommitDetail(commit.sha);
      }
    },
    [commits, setSelectedCommitId, fetchDiff, fetchCommitDetail]
  );

  // ---- Interactive rebase handlers ----
  const handleOpenInteractiveRebase = useCallback(
    (baseSha: string, selectedShas: string[]) => {
      // Find the selected commits in order (from the commits list)
      const selectedCommitsList = commits.filter((c) => selectedShas.includes(c.sha));
      if (selectedCommitsList.length === 0) return;

      // The base is the parent of the oldest selected commit
      // (passed in from context menu)
      setRebaseDialogCommits(selectedCommitsList);
      setRebaseDialogBaseSha(baseSha);
      setRebaseDialogOpen(true);
      setSelectedCommits(new Set());
    },
    [commits]
  );

  const handleStartRebase = useCallback(
    async (baseSha: string, todoText: string) => {
      setRebaseDialogOpen(false);
      try {
        const repoPath = useGitStore.getState().repoPath;
        if (!repoPath) return;
        await invoke('git_start_interactive_rebase_with_todos', {
          path: repoPath,
          onto: baseSha,
          todoText,
        });
        addNotification({ type: 'success', title: t('interactiveRebase.success') });
        // Refresh data
        useGitStore.getState().fetchAll();
      } catch (err) {
        addNotification({ type: 'error', title: t('interactiveRebase.failed'), message: String(err) });
      }
    },
    [addNotification]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, commit: Commit) => {
      e.preventDefault();
      const selectedShas = Array.from(selectedCommits);
      const hasMultipleSelected = selectedShas.length >= 2;

      const items: ContextMenuItem[] = [
        {
          id: 'copy-hash',
          label: t('histories.copyHash'),
          icon: <Copy size={12} />,
          action: () => {
            navigator.clipboard.writeText(commit.sha);
            setCopiedHash(commit.sha);
            setTimeout(() => setCopiedHash(null), 2000);
          },
        },
        {
          id: 'copy-short-hash',
          label: t('histories.copyShortHash'),
          action: () => {
            navigator.clipboard.writeText(commit.sha.slice(0, 7));
          },
        },
        { id: 'sep1', label: '', separator: true },
        {
          id: 'checkout',
          label: t('histories.checkout'),
          action: () => {
            checkout({ branch: commit.sha, create: false, force: false }).catch((err) => {
              addNotification({ type: 'error', title: t('histories.checkoutFailed'), message: String(err) });
            });
          },
        },
        {
          id: 'cherry-pick',
          label: t('histories.cherryPick'),
          action: () => {
            cherryPick({ commits: [commit.sha] }).catch((err) => {
              addNotification({ type: 'error', title: t('histories.cherryPickFailed'), message: String(err) });
            });
          },
        },
        {
          id: 'revert',
          label: t('histories.revert'),
          action: () => {
            revert(commit.sha).catch((err) => {
              addNotification({ type: 'error', title: t('histories.revertFailed'), message: String(err) });
            });
          },
        },
        { id: 'sep2', label: '', separator: true },
        {
          id: 'create-branch',
          label: t('histories.createBranch'),
          action: () => {
            createBranch({ name: '', ref: commit.sha }).catch((err) => {
              addNotification({ type: 'error', title: t('histories.createBranchFailed'), message: String(err) });
            });
          },
        },
        {
          id: 'create-tag',
          label: t('histories.createTag'),
          action: () => {
            createTag({ name: '', message: '', commit: commit.sha, annotated: false }).catch((err) => {
              addNotification({ type: 'error', title: t('histories.createTagFailed'), message: String(err) });
            });
          },
        },
        { id: 'sep3', label: '', separator: true },
        {
          id: 'export-archive',
          label: t('histories.exportArchive'),
          icon: <Archive size={12} />,
          action: () => {
            setArchiveRef(commit.sha);
            setArchiveOutput(`archive-${commit.sha.slice(0, 7)}.${archiveFormat}`);
            setArchiveDialogOpen(true);
          },
        },
      ];

      // Add interactive rebase option when multiple commits are selected
      if (hasMultipleSelected) {
        // Find the parent of the oldest selected commit as the rebase base
        const allSelectedCommits = commits.filter((c) => selectedShas.includes(c.sha));
        // The oldest commit is the last one in the list (commits are ordered newest first)
        const oldestCommit = allSelectedCommits[allSelectedCommits.length - 1];
        const baseSha = oldestCommit.parents?.[0] ?? '';

        items.push(
          { id: 'sep-rebase', label: '', separator: true },
          {
            id: 'interactive-rebase',
            label: t('histories.interactiveRebase'),
            action: () => {
              handleOpenInteractiveRebase(baseSha, selectedShas);
            },
          }
        );
      }

      showContextMenu(e.clientX, e.clientY, items);
    },
    [showContextMenu, addNotification, checkout, cherryPick, revert, createBranch, createTag, archiveFormat, selectedCommits, commits, handleOpenInteractiveRebase]
  );

  const handleExportArchive = useCallback(async () => {
    if (!archiveOutput.trim()) {
      addNotification({ type: 'warning', title: 'Please enter output path' });
      return;
    }
    setArchiveExporting(true);
    try {
      await createArchive(archiveOutput, archiveRef, archiveFormat);
      addNotification({ type: 'success', title: 'Archive created', message: archiveOutput });
      setArchiveDialogOpen(false);
    } catch (err) {
      addNotification({ type: 'error', title: 'Archive creation failed', message: String(err) });
    } finally {
      setArchiveExporting(false);
    }
  }, [archiveOutput, archiveRef, archiveFormat, createArchive, addNotification]);

  // Drag-and-drop handler for cherry-pick / merge
  const handleDragCommit = useCallback(
    (sourceSha: string, targetBranch: string, operation: 'cherry-pick' | 'merge') => {
      const sourceCommit = commits.find((c) => c.sha === sourceSha);
      const shortSha = sourceSha.slice(0, 7);
      const subject = sourceCommit?.subject ?? '';

      if (operation === 'cherry-pick') {
        showDialog({
          type: 'confirm',
          title: t('histories.cherryPickConfirmTitle'),
          message: t('histories.cherryPickConfirmMessage', shortSha, subject, targetBranch),
          confirmLabel: t('histories.cherryPick'),
          cancelLabel: t('common.cancel'),
          onConfirm: () => {
            cherryPick({ commits: [sourceSha] }).catch((err) => {
              addNotification({ type: 'error', title: t('histories.cherryPickFailed'), message: String(err) });
            });
          },
        });
      } else {
        showDialog({
          type: 'confirm',
          title: t('histories.mergeConfirmTitle'),
          message: t('histories.mergeConfirmMessage', shortSha, subject, targetBranch),
          confirmLabel: t('common.confirm'),
          cancelLabel: t('common.cancel'),
          onConfirm: () => {
            const mergeFn = useGitStore.getState().merge;
            mergeFn({ branch: sourceSha, message: `Merge ${shortSha} into ${targetBranch}`, ff: 'no-fast-forward' }).catch((err) => {
              addNotification({ type: 'error', title: 'Merge failed', message: String(err) });
            });
          },
        });
      }
    },
    [commits, showDialog, cherryPick, addNotification]
  );

  const getRefColor = (kind: string) => {
    switch (kind) {
      case 'branch': return 'var(--accent-green)';
      case 'tag': return 'var(--accent-mauve)';
      case 'remote': return 'var(--accent-peach)';
      case 'head': return 'var(--accent-blue)';
      default: return 'var(--text-subtle)';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Commit list with graph overlay */}
      <div className="flex flex-1 overflow-hidden">
        {/* Commit list */}
        <div className="flex-1 flex overflow-hidden">
          {/* Graph column */}
          <div className="shrink-0 overflow-hidden" style={{ width: 200 }}>
            <CommitGraph
              commits={commits}
              selectedCommitId={selectedCommitId}
              onCommitClick={handleCommitClick}
              onDragCommit={handleDragCommit}
            />
          </div>

          {/* Commit info list */}
          <div className="flex-1 overflow-y-auto" style={{ fontSize: densityStyle.fontSize }}>
            {loading ? (
              <div className="flex items-center justify-center h-32" style={{ color: 'var(--text-subtle)' }}>
                <div className="animate-spin w-5 h-5 border-2 rounded-full" style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }} />
              </div>
            ) : commits.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'var(--text-subtle)' }}>
                {t('histories.noCommits')}
              </div>
            ) : (
              commits.map((commit) => {
                const isSelected = commit.sha === selectedCommitId;
                const isMultiSelected = selectedCommits.has(commit.sha);
                const refs = parseRefs(commit.refs);
                const isPreview = previewCommit === commit.sha;
                return (
                  <div key={commit.sha}>
                    <div
                      onClick={(e) => handleCommitClick(commit.sha, e)}
                      onContextMenu={(e) => handleContextMenu(e, commit)}
                      className="group flex items-start gap-3 cursor-pointer transition-colors border-b"
                      style={{
                        backgroundColor: isSelected
                          ? 'rgba(137, 180, 250, 0.1)'
                          : isMultiSelected
                            ? 'rgba(250, 179, 135, 0.08)'
                            : 'transparent',
                        borderColor: 'var(--border-color)',
                        borderLeft: isSelected
                          ? '3px solid var(--accent-blue)'
                          : isMultiSelected
                            ? '3px solid var(--accent-peach)'
                            : '3px solid transparent',
                        padding: densityStyle.padding,
                        minHeight: densityStyle.rowHeight,
                      }}
                    >
                      {/* Refs */}
                      <div className="flex flex-wrap gap-1 shrink-0 mt-0.5" style={{ minWidth: 60 }}>
                        {refs.slice(0, 3).map((ref) => (
                          <span
                            key={ref.name}
                            className="px-1.5 py-0.5 rounded text-xs font-medium"
                            style={{
                              backgroundColor: `${getRefColor(ref.kind)}20`,
                              color: getRefColor(ref.kind),
                              fontSize: 10,
                            }}
                          >
                            {ref.name}
                          </span>
                        ))}
                        {refs.length > 3 && (
                          <span className="text-xs" style={{ color: 'var(--text-subtle)', fontSize: 10 }}>
                            +{refs.length - 3}
                          </span>
                        )}
                      </div>

                      {/* Message & info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-mono"
                            style={{ color: 'var(--accent-yellow)', fontSize: 11 }}
                          >
                            {commit.sha.slice(0, 7)}
                          </span>
                          <span className="truncate" style={{ color: 'var(--text-primary)' }}>
                            {commit.subject}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-subtle)', fontSize: 11 }}>
                          <span className="flex items-center gap-1">
                            <User size={10} />
                            {commit.author_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {formatRelativeTime(new Date(commit.author_time * 1000).toISOString())}
                          </span>
                        </div>
                      </div>

                      {/* Space to preview hint */}
                      {isSelected && (
                        <span
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          style={{ color: 'var(--text-subtle)', fontSize: 10 }}
                        >
                          {t('histories.spaceToPreview')}
                        </span>
                      )}
                    </div>

                    {/* Inline preview panel */}
                    {isPreview && (
                      <div
                        className="border-b"
                        style={{
                          borderColor: 'var(--border-color)',
                          backgroundColor: 'var(--bg-overlay)',
                          padding: densityStyle.padding,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <ChevronUp size={14} style={{ color: 'var(--text-subtle)' }} />
                          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                            {t('histories.quickPreview')}
                          </span>
                          <button
                            onClick={() => setPreviewCommit(null)}
                            className="ml-auto p-0.5 rounded transition-colors hover:bg-overlay"
                            style={{ color: 'var(--text-subtle)' }}
                          >
                            <ChevronUp size={14} />
                          </button>
                        </div>

                        {/* Preview commit info */}
                        {previewDetail && (
                          <div className="space-y-1 text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                            <div className="flex items-center gap-2">
                              <span style={{ color: 'var(--text-subtle)', width: 60 }}>{t('histories.author')}:</span>
                              <span>{previewDetail.author_name} &lt;{previewDetail.author_email}&gt;</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span style={{ color: 'var(--text-subtle)', width: 60 }}>{t('histories.hash')}:</span>
                              <span className="font-mono" style={{ color: 'var(--accent-yellow)' }}>
                                {previewDetail.sha.slice(0, 16)}
                              </span>
                            </div>
                            {previewDetail.body && (
                              <pre
                                className="whitespace-pre-wrap text-xs px-2 py-1.5 rounded"
                                style={{
                                  color: 'var(--text-primary)',
                                  backgroundColor: 'var(--bg-surface)',
                                  lineHeight: 1.5,
                                  maxHeight: 80,
                                  overflow: 'auto',
                                }}
                              >
                                {previewDetail.body}
                              </pre>
                            )}
                          </div>
                        )}

                        {/* Preview diff */}
                        {previewDiffLoading ? (
                          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-subtle)' }}>
                            <div className="animate-spin w-3 h-3 border-2 rounded-full" style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }} />
                            {t('histories.loadingDiff')}
                          </div>
                        ) : previewParsedDiffFiles.length > 0 ? (
                          <div style={{ maxHeight: 300, overflow: 'auto' }}>
                            <DiffView files={previewParsedDiffFiles} />
                          </div>
                        ) : (
                          <div className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                            {t('histories.noChanges')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Commit Detail Panel */}
        {showDetail && detailCommit && (
          <div
            className="flex flex-col border-l shrink-0"
            style={{
              width: '50%',
              minWidth: 300,
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            {/* Detail header */}
            <div className="flex items-center justify-between px-3 py-2 border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {t('histories.commitDetail')}
              </span>
              <button
                onClick={() => setShowDetail(false)}
                className="p-1 rounded transition-colors hover:bg-overlay"
                style={{ color: 'var(--text-subtle)' }}
              >
                <Check size={14} />
              </button>
            </div>

            {/* Commit info */}
            <div className="px-3 py-3 border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2 mb-2">
                <GitCommit size={14} style={{ color: 'var(--accent-mauve)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {detailCommit.subject}
                </span>
              </div>

              {/* Use commitDetail if available for richer info */}
              {commitDetailLoading ? (
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-subtle)' }}>
                  <div className="animate-spin w-3 h-3 border-2 rounded-full" style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }} />
                  {t('histories.loadingDetails')}
                </div>
              ) : commitDetail ? (
                <div className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--text-subtle)', width: 80 }}>{t('histories.author')}:</span>
                    <span>{commitDetail.author_name} &lt;{commitDetail.author_email}&gt;</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--text-subtle)', width: 80 }}>{t('histories.authorDate')}:</span>
                    <span>{new Date(commitDetail.author_time * 1000).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--text-subtle)', width: 80 }}>{t('histories.committer')}:</span>
                    <span>{commitDetail.committer_name} &lt;{commitDetail.committer_email}&gt;</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--text-subtle)', width: 80 }}>{t('histories.commitDate')}:</span>
                    <span>{new Date(commitDetail.committer_time * 1000).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--text-subtle)', width: 80 }}>{t('histories.hash')}:</span>
                    <span className="font-mono" style={{ color: 'var(--accent-yellow)' }}>
                      {commitDetail.sha}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(commitDetail.sha);
                          setCopiedHash(commitDetail.sha);
                          setTimeout(() => setCopiedHash(null), 2000);
                        }}
                        className="ml-1 p-0.5 rounded hover:bg-overlay"
                        style={{ color: 'var(--text-subtle)' }}
                      >
                        {copiedHash === commitDetail.sha ? <Check size={10} /> : <Copy size={10} />}
                      </button>
                    </span>
                  </div>
                  {commitDetail.parents.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span style={{ color: 'var(--text-subtle)', width: 80 }}>{t('histories.parents')}:</span>
                      <span className="font-mono" style={{ color: 'var(--accent-yellow)' }}>
                        {commitDetail.parents.map((p) => p.slice(0, 8)).join(' ')}
                      </span>
                    </div>
                  )}

                  {/* Commit body */}
                  {commitDetail.body && (
                    <div className="mt-2">
                      <div style={{ color: 'var(--text-subtle)', width: 80, marginBottom: 4 }}>{t('histories.body')}:</div>
                      <pre
                        className="whitespace-pre-wrap text-xs px-2 py-1.5 rounded"
                        style={{
                          color: 'var(--text-primary)',
                          backgroundColor: 'var(--bg-overlay)',
                          lineHeight: 1.6,
                        }}
                      >
                        {commitDetail.body}
                      </pre>
                    </div>
                  )}

                  {/* Refs */}
                  {(() => {
                    const refs = parseRefs(commitDetail.refs);
                    if (refs.length > 0) {
                      return (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {refs.map((ref) => (
                            <span
                              key={ref.name}
                              className="px-2 py-0.5 rounded-full text-xs"
                              style={{
                                backgroundColor: `${getRefColor(ref.kind)}20`,
                                color: getRefColor(ref.kind),
                              }}
                            >
                              {ref.name}
                            </span>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              ) : (
                /* Fallback to basic commit info when detail is not available */
                <div className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--text-subtle)', width: 60 }}>Author:</span>
                    <span>{detailCommit.author_name} &lt;{detailCommit.author_email}&gt;</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--text-subtle)', width: 60 }}>Date:</span>
                    <span>{new Date(detailCommit.author_time * 1000).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--text-subtle)', width: 60 }}>Hash:</span>
                    <span className="font-mono" style={{ color: 'var(--accent-yellow)' }}>
                      {detailCommit.sha}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(detailCommit.sha);
                          setCopiedHash(detailCommit.sha);
                          setTimeout(() => setCopiedHash(null), 2000);
                        }}
                        className="ml-1 p-0.5 rounded hover:bg-overlay"
                        style={{ color: 'var(--text-subtle)' }}
                      >
                        {copiedHash === detailCommit.sha ? <Check size={10} /> : <Copy size={10} />}
                      </button>
                    </span>
                  </div>
                  {detailCommit.parents.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span style={{ color: 'var(--text-subtle)', width: 60 }}>Parents:</span>
                      <span className="font-mono" style={{ color: 'var(--accent-yellow)' }}>
                        {detailCommit.parents.map((p) => p.slice(0, 8)).join(' ')}
                      </span>
                    </div>
                  )}
                  {(() => {
                    const refs = parseRefs(detailCommit.refs);
                    if (refs.length > 0) {
                      return (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {refs.map((ref) => (
                            <span
                              key={ref.name}
                              className="px-2 py-0.5 rounded-full text-xs"
                              style={{
                                backgroundColor: `${getRefColor(ref.kind)}20`,
                                color: getRefColor(ref.kind),
                              }}
                            >
                              {ref.name}
                            </span>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </div>

            {/* Diff */}
            <div className="flex-1 overflow-auto">
              {diffLoading ? (
                <div className="flex items-center justify-center h-32" style={{ color: 'var(--text-subtle)' }}>
                  Loading diff...
                </div>
              ) : parsedDiffFiles.length > 0 ? (
                <DiffView files={parsedDiffFiles} />
              ) : (
                <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'var(--text-subtle)' }}>
                  {t('histories.noChanges')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Archive Export Dialog */}
      {archiveDialogOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000 }}
          onClick={() => setArchiveDialogOpen(false)}
        >
          <div
            className="rounded-lg shadow-lg p-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              width: 400,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              {t('histories.exportArchiveTitle')}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {t('histories.reference')}
                </label>
                <input
                  type="text"
                  value={archiveRef}
                  onChange={(e) => setArchiveRef(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border text-xs"
                  style={{
                    backgroundColor: 'var(--bg-overlay)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {t('histories.format')}
                </label>
                <div className="flex gap-2">
                  {['zip', 'tar', 'tar.gz'].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => {
                        setArchiveFormat(fmt);
                        setArchiveOutput(`archive-${archiveRef.slice(0, 7)}.${fmt}`);
                      }}
                      className="px-3 py-1 rounded text-xs transition-colors"
                      style={{
                        backgroundColor: archiveFormat === fmt ? 'var(--accent-blue)' : 'var(--bg-overlay)',
                        color: archiveFormat === fmt ? 'var(--bg-base)' : 'var(--text-secondary)',
                      }}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {t('histories.outputPath')}
                </label>
                <input
                  type="text"
                  value={archiveOutput}
                  onChange={(e) => setArchiveOutput(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border text-xs"
                  style={{
                    backgroundColor: 'var(--bg-overlay)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="/path/to/output.zip"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setArchiveDialogOpen(false)}
                className="px-3 py-1.5 rounded text-xs transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleExportArchive}
                disabled={archiveExporting || !archiveOutput.trim()}
                className="px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent-green)',
                  color: 'var(--bg-base)',
                }}
              >
                {archiveExporting ? t('histories.exporting') : t('histories.export')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Rebase Dialog */}
      {rebaseDialogOpen && (
        <InteractiveRebase
          commits={rebaseDialogCommits}
          baseSha={rebaseDialogBaseSha}
          onStart={handleStartRebase}
          onCancel={() => setRebaseDialogOpen(false)}
        />
      )}
    </div>
  );
};
