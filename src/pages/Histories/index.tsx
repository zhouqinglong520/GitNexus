import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGitStore } from '@/stores/git-store';
import { useUIStore } from '@/stores/ui-store';
import { usePreferencesStore, densityConfig } from '@/stores/preferences-store';
import { useTranslation } from '@/i18n';
import { CommitGraph } from '@/components/CommitGraph';
import { DiffView } from '@/components/DiffView';
import { InteractiveRebase } from '@/components/InteractiveRebase';
import type { RebaseTodoItem } from '@/components/InteractiveRebase';
import {
  GitCommit,
  User,
  Clock,
  Copy,
  Check,
  Archive,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Edit3,
  GitCompare,
  FileText,
  FileCode,
  FolderOpen,
  PanelRightOpen,
  PanelRightClose,
  ArrowUp,
} from 'lucide-react';
import type { Commit, CommitDetail, ContextMenuItem, DiffFile } from '@/types';
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

/** 详情面板 Tab 类型 */
type DetailTab = 'info' | 'changes' | 'files';

// ============================================================
// CommitRow - 单行提交（React.memo 优化）
// ============================================================
interface CommitRowProps {
  commit: Commit & { parsedRefs: { name: string; kind: string }[] };
  isSelected: boolean;
  isMultiSelected: boolean;
  isPreview: boolean;
  densityStyle: { fontSize: string; rowHeight: string; padding: string };
  selectedCommitId: string | null;
  selectedCommits: Set<string>;
  getRefColor: (kind: string) => string;
  onCommitClick: (commitId: string, e?: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent, commit: Commit) => void;
  onDoubleClick?: () => void;
  previewCommit: string | null;
  setPreviewCommit: (id: string | null) => void;
  previewDetail: CommitDetail | null;
  previewDiffLoading: boolean;
  previewParsedDiffFiles: DiffFile[];
  t: (key: string, ...args: (string | number)[]) => string;
}

const CommitRow = React.memo(function CommitRow({
  commit,
  isSelected,
  isMultiSelected,
  isPreview,
  densityStyle,
  selectedCommitId,
  getRefColor,
  onCommitClick,
  onContextMenu,
  onDoubleClick,
  previewCommit,
  setPreviewCommit,
  previewDetail,
  previewDiffLoading,
  previewParsedDiffFiles,
  t,
}: CommitRowProps) {
  const refs = commit.parsedRefs;

  return (
    <div key={commit.sha}>
      {/* 提交行 */}
      <div
        onClick={(e) => onCommitClick(commit.sha, e)}
        onDoubleClick={() => onDoubleClick?.()}
        onContextMenu={(e) => onContextMenu(e, commit)}
        className="group flex items-center cursor-pointer transition-colors border-b"
        style={{
          backgroundColor: isSelected
            ? 'rgba(137, 180, 250, 0.12)'
            : isMultiSelected
              ? 'rgba(250, 179, 135, 0.08)'
              : undefined,
          borderColor: 'var(--border-color)',
          borderLeft: isSelected
            ? '3px solid var(--accent-blue)'
            : isMultiSelected
              ? '3px solid var(--accent-peach)'
              : '3px solid transparent',
          padding: `0 8px`,
          minHeight: densityStyle.rowHeight,
          fontSize: densityStyle.fontSize,
          lineHeight: `${densityStyle.rowHeight}px`,
        }}
      >
        {/* Refs 标签区域（pill badge） */}
        <div className="flex items-center gap-1 shrink-0" style={{ minWidth: 0, maxWidth: 200 }}>
          {refs.slice(0, 3).map((ref) => (
            <span
              key={ref.name}
              className="px-1.5 py-0 rounded text-xs font-medium shrink-0"
              style={{
                backgroundColor: `${getRefColor(ref.kind)}20`,
                color: getRefColor(ref.kind),
                fontSize: 10,
                lineHeight: '18px',
              }}
            >
              {ref.name}
            </span>
          ))}
          {refs.length > 3 && (
            <span className="shrink-0" style={{ color: 'var(--text-subtle)', fontSize: 10 }}>
              +{refs.length - 3}
            </span>
          )}
        </div>

        {/* SHA(7) */}
        <span
          className="shrink-0 font-mono"
          style={{ color: 'var(--accent-yellow)', fontSize: 11, width: 62 }}
        >
          {commit.sha.slice(0, 7)}
        </span>

        {/* Subject */}
        <span className="truncate flex-1 min-w-0" style={{ color: 'var(--text-primary)' }}>
          {commit.subject}
        </span>

        {/* Author */}
        <span
          className="shrink-0 flex items-center gap-1"
          style={{ color: 'var(--text-subtle)', fontSize: 11, width: 120 }}
        >
          <User size={10} />
          <span className="truncate">{commit.author_name}</span>
        </span>

        {/* AuthorTime */}
        <span
          className="shrink-0 flex items-center gap-1"
          style={{ color: 'var(--text-subtle)', fontSize: 11, width: 72 }}
        >
          {formatRelativeTime(new Date(commit.author_time * 1000).toISOString())}
        </span>

        {/* Space 预览提示 */}
        {isSelected && (
          <span
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
            style={{ color: 'var(--text-subtle)', fontSize: 10 }}
          >
            {t('histories.spaceToPreview')}
          </span>
        )}
      </div>

      {/* Spacebar 内联预览面板 */}
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

          {/* 预览提交信息 */}
          {previewDetail && (
            <div className="space-y-1 text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--text-subtle)', width: 60 }}>{t('histories.author')}:</span>
                <span>
                  {previewDetail.author_name} &lt;{previewDetail.author_email}&gt;
                </span>
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

          {/* 预览 Diff */}
          {previewDiffLoading ? (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-subtle)' }}>
              <div
                className="animate-spin w-3 h-3 border-2 rounded-full"
                style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }}
              />
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
});

// ============================================================
// DetailInfoTab - 详情面板的 Info Tab
// ============================================================
interface DetailInfoTabProps {
  commitDetail: CommitDetail | null;
  commitDetailLoading: boolean;
  detailCommit: Commit;
  copiedHash: string | null;
  setCopiedHash: (hash: string | null) => void;
  parsedDiffFiles: DiffFile[];
  getRefColor: (kind: string) => string;
  onFileDoubleClick: (file: DiffFile) => void;
  onFileContextMenu: (e: React.MouseEvent, file: DiffFile) => void;
  t: (key: string, ...args: (string | number)[]) => string;
}

const DetailInfoTab = React.memo(function DetailInfoTab({
  commitDetail,
  commitDetailLoading,
  detailCommit,
  copiedHash,
  setCopiedHash,
  parsedDiffFiles,
  getRefColor,
  onFileDoubleClick,
  onFileContextMenu,
  t,
}: DetailInfoTabProps) {
  return (
    <div className="flex-1 overflow-auto">
      {/* 提交基本信息区 */}
      <div className="px-3 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
        {/* Subject 标题行 */}
        <div className="flex items-center gap-2 mb-2">
          <GitCommit size={14} style={{ color: 'var(--accent-mauve)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {detailCommit.subject}
          </span>
        </div>

        {commitDetailLoading ? (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-subtle)' }}>
            <div
              className="animate-spin w-3 h-3 border-2 rounded-full"
              style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }}
            />
            {t('histories.loadingDetails')}
          </div>
        ) : commitDetail ? (
          <div className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {/* Author */}
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--text-subtle)', width: 80 }}>{t('histories.author')}:</span>
              <span>
                {commitDetail.author_name} &lt;{commitDetail.author_email}&gt;
              </span>
            </div>
            {/* Author Date */}
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--text-subtle)', width: 80 }}>{t('histories.authorDate')}:</span>
              <span>{new Date(commitDetail.author_time * 1000).toLocaleString()}</span>
            </div>
            {/* Committer */}
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--text-subtle)', width: 80 }}>{t('histories.committer')}:</span>
              <span>
                {commitDetail.committer_name} &lt;{commitDetail.committer_email}&gt;
              </span>
            </div>
            {/* Committer Date */}
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--text-subtle)', width: 80 }}>{t('histories.commitDate')}:</span>
              <span>{new Date(commitDetail.committer_time * 1000).toLocaleString()}</span>
            </div>
            {/* SHA */}
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
            {/* Parents */}
            {commitDetail.parents.length > 0 && (
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--text-subtle)', width: 80 }}>{t('histories.parents')}:</span>
                <span className="font-mono" style={{ color: 'var(--accent-yellow)' }}>
                  {commitDetail.parents.map((p) => p.slice(0, 8)).join(' ')}
                </span>
              </div>
            )}
            {/* Body */}
            {commitDetail.body && (
              <div className="mt-2">
                <div style={{ color: 'var(--text-subtle)', width: 80, marginBottom: 4 }}>
                  {t('histories.body')}:
                </div>
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
          /* 降级：无 commitDetail 时用基础信息 */
          <div className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--text-subtle)', width: 60 }}>Author:</span>
              <span>
                {detailCommit.author_name} &lt;{detailCommit.author_email}&gt;
              </span>
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

      {/* 变更文件列表（ListBox 风格，最多显示 100 个） */}
      <div className="px-1 py-1">
        <div className="text-xs font-medium px-2 py-1" style={{ color: 'var(--text-subtle)' }}>
          {t('histories.changedFiles')} ({parsedDiffFiles.length})
        </div>
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {parsedDiffFiles.slice(0, 100).map((file, idx) => (
            <div
              key={`${file.old_path}-${file.new_path}-${idx}`}
              className="flex items-center gap-2 px-2 cursor-pointer transition-colors text-xs"
              style={{
                height: 24,
                lineHeight: '24px',
                color: 'var(--text-primary)',
                borderRadius: 4,
              }}
              onDoubleClick={() => onFileDoubleClick(file)}
              onContextMenu={(e) => onFileContextMenu(e, file)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-overlay)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              {/* Status 图标 */}
              <span
                className="shrink-0 font-mono"
                style={{
                  width: 16,
                  textAlign: 'center',
                  color:
                    file.status === 'Added'
                      ? 'var(--accent-green)'
                      : file.status === 'Deleted'
                        ? 'var(--accent-red)'
                        : file.status === 'Renamed' || file.status === 'Copied'
                          ? 'var(--accent-blue)'
                          : 'var(--accent-yellow)',
                }}
              >
                {file.status === 'Added'
                  ? 'A'
                  : file.status === 'Deleted'
                    ? 'D'
                    : file.status === 'Renamed'
                      ? 'R'
                      : file.status === 'Copied'
                        ? 'C'
                        : file.status === 'Untracked'
                          ? 'U'
                          : 'M'}
              </span>
              {/* 文件路径 */}
              <span className="truncate flex-1 min-w-0 font-mono" style={{ fontSize: 11 }}>
                {file.new_path || file.old_path}
              </span>
            </div>
          ))}
          {parsedDiffFiles.length > 100 && (
            <div className="text-xs px-2 py-1" style={{ color: 'var(--text-subtle)' }}>
              ... and {parsedDiffFiles.length - 100} more files
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ============================================================
// Histories 主组件
// ============================================================
export const Histories: React.FC = () => {
  const navigate = useNavigate();
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
  const reset = useGitStore((s) => s.reset);
  const commitAction = useGitStore((s) => s.commit);
  const showContextMenu = useUIStore((s) => s.showContextMenu);
  const addNotification = useUIStore((s) => s.addNotification);
  const showDialog = useUIStore((s) => s.showDialog);
  const { t } = useTranslation();

  // Density 设置
  const density = usePreferencesStore((s) => s.preferences.appearance.density);
  const densityStyle = densityConfig[density];

  // 详情面板状态
  const [showDetail, setShowDetail] = useState(true);
  const [detailCommit, setDetailCommit] = useState<Commit | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('info');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Archive 导出对话框状态
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveRef, setArchiveRef] = useState('');
  const [archiveFormat, setArchiveFormat] = useState('zip');
  const [archiveOutput, setArchiveOutput] = useState('');
  const [archiveExporting, setArchiveExporting] = useState(false);

  // 多选状态（用于 Interactive Rebase）
  const [selectedCommits, setSelectedCommits] = useState<Set<string>>(new Set());
  const [rebaseDialogOpen, setRebaseDialogOpen] = useState(false);
  const [rebaseDialogCommits, setRebaseDialogCommits] = useState<Commit[]>([]);
  const [rebaseDialogBaseSha, setRebaseDialogBaseSha] = useState('');

  // Spacebar 快速预览状态
  const [previewCommit, setPreviewCommit] = useState<string | null>(null);
  const [previewDetail, setPreviewDetail] = useState<CommitDetail | null>(null);
  const [previewDiff, setPreviewDiff] = useState<string | null>(null);
  const [previewDiffLoading, setPreviewDiffLoading] = useState(false);
  const previewCommitRef = useRef<string | null>(null);

  // 滚动到顶部浮动按钮状态
  const [showScrollTop, setShowScrollTop] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);

  /** 判断当前焦点是否在输入框 */
  const isInputFocused = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    return (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    );
  }, []);

  // 预解析 refs，避免在渲染循环中重复 JSON.parse
  const parsedCommits = useMemo(() => {
    return commits.map((c) => ({ ...c, parsedRefs: parseRefs(c.refs) }));
  }, [commits]);

  const parsedDiffFiles = useMemo(() => {
    if (!diff) return [];
    return parseDiff(diff);
  }, [diff]);

  useEffect(() => {
    fetchCommits({ max_count: 200 });
  }, [fetchCommits]);

  // Spacebar 快速预览按键处理
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

  // 预览数据获取
  useEffect(() => {
    if (previewCommit) {
      const sha = previewCommit;
      previewCommitRef.current = sha;
      setPreviewDiffLoading(true);
      const commit = commits.find((c) => c.sha === sha);
      if (commit) {
        fetchDiff({ commit1: commit.sha + '^', commit2: commit.sha });
        fetchCommitDetail(commit.sha);
      }
    } else {
      previewCommitRef.current = null;
      setPreviewDiff(null);
      setPreviewDetail(null);
    }
  }, [previewCommit]);

  // 同步预览数据到本地 state
  useEffect(() => {
    if (previewCommit && previewCommitRef.current === previewCommit) {
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
      // Ctrl/Cmd 多选
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

      // 普通点击清除多选
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

  // ---- 双击提交行：签出到对应分支 ----
  const handleCommitDoubleClick = useCallback(
    (commit: Commit) => {
      const refs = parseRefs(commit.refs);
      // 优先查找 branch ref 进行 checkout
      const branchRef = refs.find((r) => r.kind === 'branch');
      if (branchRef) {
        checkout({ branch: branchRef.name, create: false, force: false }).catch((err) => {
          addNotification({ type: 'error', title: t('histories.checkoutFailed'), message: String(err) });
        });
      } else {
        // 无分支 ref，则 detached HEAD checkout
        checkout({ branch: commit.sha, create: false, force: false }).catch((err) => {
          addNotification({ type: 'error', title: t('histories.checkoutFailed'), message: String(err) });
        });
      }
    },
    [checkout, addNotification]
  );

  // ---- Interactive Rebase 处理 ----
  const handleOpenInteractiveRebase = useCallback(
    (baseSha: string, selectedShas: string[]) => {
      const selectedCommitsList = commits.filter((c) => selectedShas.includes(c.sha));
      if (selectedCommitsList.length === 0) return;
      setRebaseDialogCommits(selectedCommitsList);
      setRebaseDialogBaseSha(baseSha);
      setRebaseDialogOpen(true);
      setSelectedCommits(new Set());
    },
    [commits]
  );

  const handleStartRebase = useCallback(
    async (baseSha: string, rebaseTodos: RebaseTodoItem[]) => {
      setRebaseDialogOpen(false);
      try {
        const todos = rebaseTodos.map(item => ({ hash: item.hash, action: item.action }));
        await useGitStore.getState().startInteractiveRebaseWithTodos(baseSha, todos);
        addNotification({ type: 'success', title: t('interactiveRebase.success') });
        useGitStore.getState().fetchAll();
      } catch (err) {
        addNotification({ type: 'error', title: t('interactiveRebase.failed'), message: String(err) });
      }
    },
    [addNotification, t]
  );

  // ---- 右键菜单 ----
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
        { id: 'sep4', label: '', separator: true },
        {
          id: 'reset-to-commit',
          label: t('histories.resetToCommit'),
          icon: <RotateCcw size={12} />,
          children: [
            {
              id: 'reset-soft',
              label: t('histories.resetSoft'),
              action: () => {
                showDialog({
                  type: 'confirm',
                  title: t('histories.resetSoft'),
                  message: t('histories.resetConfirmMessage', commit.sha.slice(0, 7)),
                  confirmLabel: t('common.confirm'),
                  cancelLabel: t('common.cancel'),
                  onConfirm: () => {
                    reset({ commit: commit.sha, mode: 'soft' }).catch((err) => {
                      addNotification({ type: 'error', title: t('histories.resetFailed'), message: String(err) });
                    });
                  },
                });
              },
            },
            {
              id: 'reset-mixed',
              label: t('histories.resetMixed'),
              action: () => {
                showDialog({
                  type: 'confirm',
                  title: t('histories.resetMixed'),
                  message: t('histories.resetConfirmMessage', commit.sha.slice(0, 7)),
                  confirmLabel: t('common.confirm'),
                  cancelLabel: t('common.cancel'),
                  onConfirm: () => {
                    reset({ commit: commit.sha, mode: 'mixed' }).catch((err) => {
                      addNotification({ type: 'error', title: t('histories.resetFailed'), message: String(err) });
                    });
                  },
                });
              },
            },
            {
              id: 'reset-hard',
              label: t('histories.resetHard'),
              action: () => {
                showDialog({
                  type: 'confirm',
                  title: t('histories.resetHard'),
                  message: t('histories.resetHardConfirmMessage', commit.sha.slice(0, 7)),
                  confirmLabel: t('common.confirm'),
                  cancelLabel: t('common.cancel'),
                  onConfirm: () => {
                    reset({ commit: commit.sha, mode: 'hard' }).catch((err) => {
                      addNotification({ type: 'error', title: t('histories.resetFailed'), message: String(err) });
                    });
                  },
                });
              },
            },
          ],
        },
        {
          id: 'squash',
          label: t('histories.squash'),
          action: () => {
            showDialog({
              type: 'confirm',
              title: t('histories.squash'),
              message: t('histories.squashConfirmMessage', commit.sha.slice(0, 7)),
              confirmLabel: t('common.confirm'),
              cancelLabel: t('common.cancel'),
              onConfirm: () => {
                reset({ commit: commit.sha, mode: 'soft' }).catch((err) => {
                  addNotification({ type: 'error', title: t('histories.squashFailed'), message: String(err) });
                });
              },
            });
          },
        },
        {
          id: 'edit-commit-message',
          label: t('histories.editCommitMessage'),
          icon: <Edit3 size={12} />,
          disabled: commit.sha !== commits[0]?.sha,
          action: () => {
            if (commit.sha !== commits[0]?.sha) return;
            showDialog({
              type: 'confirm',
              title: t('histories.editCommitMessage'),
              message: t('histories.editCommitMessageDesc'),
              confirmLabel: t('common.confirm'),
              cancelLabel: t('common.cancel'),
              onConfirm: () => {
                commitAction({ message: '', amend: true }).catch((err) => {
                  addNotification({ type: 'error', title: t('histories.editCommitMessageFailed'), message: String(err) });
                });
              },
            });
          },
        },
        {
          id: 'compare-with-head',
          label: t('histories.compareWithHead'),
          icon: <GitCompare size={12} />,
          action: () => {
            navigate(`/compare?old=${commit.sha}&new=HEAD`);
          },
        },
      ];

      // 多选时添加 Interactive Rebase 选项
      if (hasMultipleSelected) {
        const allSelectedCommits = commits.filter((c) => selectedShas.includes(c.sha));
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
    [
      showContextMenu,
      addNotification,
      showDialog,
      checkout,
      cherryPick,
      revert,
      createBranch,
      createTag,
      archiveFormat,
      selectedCommits,
      commits,
      handleOpenInteractiveRebase,
      reset,
      commitAction,
      navigate,
    ]
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

  // 拖拽提交到分支的处理（cherry-pick / merge）
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
            mergeFn({
              branch: sourceSha,
              message: `Merge ${shortSha} into ${targetBranch}`,
              ff: 'no-fast-forward',
            }).catch((err) => {
              addNotification({ type: 'error', title: 'Merge failed', message: String(err) });
            });
          },
        });
      }
    },
    [commits, showDialog, cherryPick, addNotification]
  );

  /** 详情面板文件列表双击：切换到 Changes tab */
  const handleFileDoubleClick = useCallback(
    (file: DiffFile) => {
      setDetailTab('changes');
    },
    []
  );

  /** 详情面板文件右键菜单 */
  const handleDetailFileContextMenu = useCallback(
    (e: React.MouseEvent, file: DiffFile) => {
      e.preventDefault();
      const filePath = file.new_path || file.old_path;
      const items: ContextMenuItem[] = [
        {
          id: 'copy-path',
          label: 'Copy Path',
          icon: <Copy size={12} />,
          action: () => {
            navigator.clipboard.writeText(filePath);
          },
        },
        { id: 'sep', label: '', separator: true },
        {
          id: 'open-file',
          label: 'Open',
          icon: <FolderOpen size={12} />,
          action: () => {
            // 后续可调用 Tauri shell open
          },
        },
      ];
      showContextMenu(e.clientX, e.clientY, items);
    },
    [showContextMenu]
  );

  /** ref 颜色映射 */
  const getRefColor = useCallback((kind: string) => {
    switch (kind) {
      case 'branch':
        return 'var(--accent-green)';
      case 'tag':
        return 'var(--accent-mauve)';
      case 'remote':
        return 'var(--accent-peach)';
      case 'head':
        return 'var(--accent-blue)';
      default:
        return 'var(--text-subtle)';
    }
  }, []);

  /** 列表滚动监听：控制浮动按钮可见性 */
  const handleListScroll = useCallback(() => {
    const el = listContainerRef.current;
    if (el) {
      setShowScrollTop(el.scrollTop > 200);
    }
  }, []);

  /** 滚动到顶部 */
  const handleScrollToTop = useCallback(() => {
    const el = listContainerRef.current;
    if (el) {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // ============================================================
  // 渲染
  // ============================================================
  return (
    <div className="flex flex-col h-full">
      {/* 第一层：主内容区域 - 列表 + 分隔线 + 详情面板 */}
      <div className="flex flex-1 overflow-hidden">
        {/* ====== 左侧：Graph + 提交列表 ====== */}
        <div className="flex-1 flex overflow-hidden">
          {/* Graph 列：固定宽度 200px，透明背景覆盖层 */}
          <div className="shrink-0 overflow-hidden" style={{ width: 200 }}>
            <CommitGraph
              commits={commits}
              selectedCommitId={selectedCommitId}
              onCommitClick={handleCommitClick}
              onDragCommit={handleDragCommit}
            />
          </div>

          {/* 提交信息列表 */}
          <div
            ref={listContainerRef}
            className="flex-1 overflow-y-auto"
            style={{ fontSize: densityStyle.fontSize }}
            onScroll={handleListScroll}
          >
            {loading ? (
              <div
                className="flex items-center justify-center h-32"
                style={{ color: 'var(--text-subtle)' }}
              >
                <div
                  className="animate-spin w-5 h-5 border-2 rounded-full"
                  style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }}
                />
              </div>
            ) : commits.length === 0 ? (
              <div
                className="flex items-center justify-center h-32 text-sm"
                style={{ color: 'var(--text-subtle)' }}
              >
                {t('histories.noCommits')}
              </div>
            ) : (
              parsedCommits.map((commit) => (
                <CommitRow
                  key={commit.sha}
                  commit={commit}
                  isSelected={commit.sha === selectedCommitId}
                  isMultiSelected={selectedCommits.has(commit.sha)}
                  isPreview={previewCommit === commit.sha}
                  densityStyle={densityStyle}
                  selectedCommitId={selectedCommitId}
                  selectedCommits={selectedCommits}
                  getRefColor={getRefColor}
                  onCommitClick={handleCommitClick}
                  onContextMenu={handleContextMenu}
                  onDoubleClick={() => handleCommitDoubleClick(commit)}
                  previewCommit={previewCommit}
                  setPreviewCommit={setPreviewCommit}
                  previewDetail={previewDetail}
                  previewDiffLoading={previewDiffLoading}
                  previewParsedDiffFiles={previewParsedDiffFiles}
                  t={t}
                />
              ))
            )}
          </div>
        </div>

        {/* ====== 3px 分隔线 ====== */}
        {showDetail && detailCommit && (
          <div style={{ width: 3, backgroundColor: 'var(--border-color)', cursor: 'col-resize', flexShrink: 0 }} />
        )}

        {/* ====== 右侧：详情面板 ====== */}
        {showDetail && detailCommit && (
          <div
            className="flex flex-col shrink-0"
            style={{
              width: '50%',
              minWidth: 300,
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            {/* 详情面板头部：Tab 栏 */}
            <div
              className="flex items-center border-b shrink-0"
              style={{ borderColor: 'var(--border-color)' }}
            >
              {/* Tab 按钮 */}
              <div className="flex items-center flex-1">
                {(['info', 'changes', 'files'] as DetailTab[]).map((tab) => {
                  const isActive = detailTab === tab;
                  const label =
                    tab === 'info'
                      ? t('histories.info')
                      : tab === 'changes'
                        ? t('histories.changes')
                        : t('histories.files');
                  const Icon =
                    tab === 'info' ? FileText : tab === 'changes' ? FileCode : FolderOpen;
                  return (
                    <button
                      key={tab}
                      onClick={() => setDetailTab(tab)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors"
                      style={{
                        color: isActive ? 'var(--text-primary)' : 'var(--text-subtle)',
                        borderBottom: isActive
                          ? '2px solid var(--accent-blue)'
                          : '2px solid transparent',
                      }}
                    >
                      <Icon size={12} />
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* 折叠按钮 */}
              <button
                onClick={() => setShowDetail(false)}
                className="p-1.5 mr-1 rounded transition-colors"
                style={{ color: 'var(--text-subtle)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-overlay)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
                title="Close detail panel"
              >
                <PanelRightClose size={14} />
              </button>
            </div>

            {/* Tab 内容 */}
            {detailTab === 'info' && (
              <DetailInfoTab
                commitDetail={commitDetail}
                commitDetailLoading={commitDetailLoading}
                detailCommit={detailCommit}
                copiedHash={copiedHash}
                setCopiedHash={setCopiedHash}
                parsedDiffFiles={parsedDiffFiles}
                getRefColor={getRefColor}
                onFileDoubleClick={handleFileDoubleClick}
                onFileContextMenu={handleDetailFileContextMenu}
                t={t}
              />
            )}

            {detailTab === 'changes' && (
              <div className="flex-1 overflow-auto">
                {diffLoading ? (
                  <div
                    className="flex items-center justify-center h-32"
                    style={{ color: 'var(--text-subtle)' }}
                  >
                    <div
                      className="animate-spin w-4 h-4 border-2 rounded-full"
                      style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }}
                    />
                    <span className="ml-2 text-xs">Loading diff...</span>
                  </div>
                ) : parsedDiffFiles.length > 0 ? (
                  <DiffView files={parsedDiffFiles} />
                ) : (
                  <div
                    className="flex items-center justify-center h-32 text-sm"
                    style={{ color: 'var(--text-subtle)' }}
                  >
                    {t('histories.noChanges')}
                  </div>
                )}
              </div>
            )}

            {detailTab === 'files' && (
              <div
                className="flex-1 flex items-center justify-center"
                style={{ color: 'var(--text-subtle)' }}
              >
                <div className="text-center">
                  <FolderOpen size={32} className="mx-auto mb-2" />
                  <span className="text-xs">Files tab - Coming soon</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====== 详情面板折叠状态：展开按钮 ====== */}
        {!showDetail && selectedCommitId && (
          <div
            className="flex items-center justify-center"
            style={{ width: 32, backgroundColor: 'var(--bg-surface)' }}
          >
            <button
              onClick={() => {
                const commit = commits.find((c) => c.sha === selectedCommitId);
                if (commit) {
                  setDetailCommit(commit);
                  setShowDetail(true);
                  fetchDiff({ commit1: commit.sha + '^', commit2: commit.sha });
                  fetchCommitDetail(commit.sha);
                }
              }}
              className="p-1 rounded transition-colors"
              style={{ color: 'var(--text-subtle)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-overlay)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
              title="Open detail panel"
            >
              <PanelRightOpen size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ====== 浮动：滚动到顶部按钮 ====== */}
      {showScrollTop && (
        <button
          onClick={handleScrollToTop}
          className="fixed bottom-4 right-4 p-2 rounded-full shadow-lg transition-colors"
          style={{
            backgroundColor: 'var(--accent-blue)',
            color: 'var(--bg-base)',
            zIndex: 100,
            right: showDetail && detailCommit ? 'calc(50% / 2 + 16px)' : 16,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.opacity = '0.85';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.opacity = '1';
          }}
        >
          <ArrowUp size={16} />
        </button>
      )}

      {/* ====== Archive 导出对话框 ====== */}
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
                        backgroundColor:
                          archiveFormat === fmt ? 'var(--accent-blue)' : 'var(--bg-overlay)',
                        color:
                          archiveFormat === fmt ? 'var(--bg-base)' : 'var(--text-secondary)',
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

      {/* ====== Interactive Rebase 对话框 ====== */}
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
