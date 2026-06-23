import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useGitStore } from '@/stores/git-store';
import { useUIStore } from '@/stores/ui-store';
import { CommitGraph } from '@/components/CommitGraph';
import { GitCommit, User, Clock, Copy, Check } from 'lucide-react';
import type { Commit, ContextMenuItem } from '@/types';
import { formatRelativeTime } from '@/utils/format';

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
  const fetchCommits = useGitStore((s) => s.fetchCommits);
  const setSelectedCommitId = useGitStore((s) => s.setSelectedCommitId);
  const fetchDiff = useGitStore((s) => s.fetchDiff);
  const checkout = useGitStore((s) => s.checkout);
  const cherryPick = useGitStore((s) => s.cherryPick);
  const revert = useGitStore((s) => s.revert);
  const createBranch = useGitStore((s) => s.createBranch);
  const createTag = useGitStore((s) => s.createTag);
  const showContextMenu = useUIStore((s) => s.showContextMenu);
  const addNotification = useUIStore((s) => s.addNotification);

  const [showDetail, setShowDetail] = useState(true);
  const [detailCommit, setDetailCommit] = useState<Commit | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    fetchCommits({ max_count: 200 });
  }, [fetchCommits]);

  const selectedCommit = useMemo(
    () => commits.find((c) => c.sha === selectedCommitId),
    [commits, selectedCommitId]
  );

  const handleCommitClick = useCallback(
    (commitId: string) => {
      setSelectedCommitId(commitId);
      const commit = commits.find((c) => c.sha === commitId);
      if (commit) {
        setDetailCommit(commit);
        setShowDetail(true);
        fetchDiff({ commit1: commit.sha + '^', commit2: commit.sha });
      }
    },
    [commits, setSelectedCommitId, fetchDiff]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, commit: Commit) => {
      e.preventDefault();
      const items: ContextMenuItem[] = [
        {
          id: 'copy-hash',
          label: 'Copy commit hash',
          icon: <Copy size={12} />,
          action: () => {
            navigator.clipboard.writeText(commit.sha);
            setCopiedHash(commit.sha);
            setTimeout(() => setCopiedHash(null), 2000);
          },
        },
        {
          id: 'copy-short-hash',
          label: 'Copy short hash',
          action: () => {
            navigator.clipboard.writeText(commit.sha.slice(0, 7));
          },
        },
        { id: 'sep1', label: '', separator: true },
        {
          id: 'checkout',
          label: 'Checkout this commit',
          action: () => {
            checkout({ branch: commit.sha, create: false, force: false }).catch((err) => {
              addNotification({ type: 'error', title: 'Checkout failed', message: String(err) });
            });
          },
        },
        {
          id: 'cherry-pick',
          label: 'Cherry-pick this commit',
          action: () => {
            cherryPick({ commits: [commit.sha] }).catch((err) => {
              addNotification({ type: 'error', title: 'Cherry-pick failed', message: String(err) });
            });
          },
        },
        {
          id: 'revert',
          label: 'Revert this commit',
          action: () => {
            revert(commit.sha).catch((err) => {
              addNotification({ type: 'error', title: 'Revert failed', message: String(err) });
            });
          },
        },
        { id: 'sep2', label: '', separator: true },
        {
          id: 'create-branch',
          label: 'Create branch from here',
          action: () => {
            createBranch({ name: '', ref: commit.sha }).catch((err) => {
              addNotification({ type: 'error', title: 'Create branch failed', message: String(err) });
            });
          },
        },
        {
          id: 'create-tag',
          label: 'Create tag here',
          action: () => {
            createTag({ name: '', message: '', commit: commit.sha, annotated: false }).catch((err) => {
              addNotification({ type: 'error', title: 'Create tag failed', message: String(err) });
            });
          },
        },
      ];
      showContextMenu(e.clientX, e.clientY, items);
    },
    [showContextMenu, addNotification, checkout, cherryPick, revert, createBranch, createTag]
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
            />
          </div>

          {/* Commit info list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32" style={{ color: 'var(--text-subtle)' }}>
                <div className="animate-spin w-5 h-5 border-2 rounded-full" style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }} />
              </div>
            ) : commits.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'var(--text-subtle)' }}>
                No commits
              </div>
            ) : (
              commits.map((commit) => {
                const isSelected = commit.sha === selectedCommitId;
                const refs = parseRefs(commit.refs);
                return (
                  <div
                    key={commit.sha}
                    onClick={() => handleCommitClick(commit.sha)}
                    onContextMenu={(e) => handleContextMenu(e, commit)}
                    className="flex items-start gap-3 px-3 py-2 cursor-pointer transition-colors border-b"
                    style={{
                      backgroundColor: isSelected ? 'rgba(137, 180, 250, 0.1)' : 'transparent',
                      borderColor: 'var(--border-color)',
                      borderLeft: isSelected ? '3px solid var(--accent-blue)' : '3px solid transparent',
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
                        <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                          {commit.subject}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: 'var(--text-subtle)', fontSize: 11 }}>
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
                Commit Detail
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
              </div>

              {/* Refs */}
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

            {/* Diff */}
            <div className="flex-1 overflow-auto">
              {diffLoading ? (
                <div className="flex items-center justify-center h-32" style={{ color: 'var(--text-subtle)' }}>
                  Loading diff...
                </div>
              ) : diff && diff.diff ? (
                <pre className="p-3 text-xs whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                  {diff.diff}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'var(--text-subtle)' }}>
                  No changes in this commit
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
