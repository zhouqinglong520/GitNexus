import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGitStore } from '@/stores/git-store';
import { useUIStore } from '@/stores/ui-store';
import { User, Clock, ExternalLink, Copy } from 'lucide-react';
import { formatRelativeTime } from '@/utils/format';
import type { BlameLine } from '@/types';

// ============================================================
// Tooltip component
// ============================================================

const Tooltip: React.FC<{
  sha: string;
  authorName: string;
  authorTime: number;
  commitMessage: string;
  position: { x: number; y: number };
}> = ({ sha, authorName, authorTime, commitMessage, position }) => (
  <div
    className="fixed z-50 rounded-lg shadow-lg pointer-events-none"
    style={{
      left: position.x,
      top: position.y,
      backgroundColor: 'var(--bg-overlay)',
      border: '1px solid var(--border-color)',
      maxWidth: 360,
      padding: '8px 12px',
    }}
  >
    <div className="flex items-center gap-2 mb-1">
      <span className="font-mono text-xs" style={{ color: 'var(--accent-yellow)' }}>
        {sha.slice(0, 7)}
      </span>
      <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
        {authorName}
      </span>
      <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
        {formatRelativeTime(new Date(authorTime * 1000).toISOString())}
      </span>
    </div>
    <div className="text-xs whitespace-pre-wrap" style={{ color: 'var(--text-secondary)', maxHeight: 80, overflow: 'hidden' }}>
      {commitMessage}
    </div>
  </div>
);

// ============================================================
// Context menu component
// ============================================================

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  line: BlameLine | null;
}

const ContextMenu: React.FC<{
  state: ContextMenuState;
  onClose: () => void;
  onCopySha: (sha: string) => void;
  onCopyLine: (content: string) => void;
  onViewCommit: (sha: string) => void;
}> = ({ state, onClose, onCopySha, onCopyLine, onViewCommit }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.visible) {
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
    }
  }, [state.visible, onClose]);

  if (!state.visible || !state.line) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 rounded-lg shadow-lg py-1"
      style={{
        left: state.x,
        top: state.y,
        backgroundColor: 'var(--bg-overlay)',
        border: '1px solid var(--border-color)',
        minWidth: 160,
      }}
    >
      <button
        onClick={() => {
          onCopySha(state.line!.sha);
          onClose();
        }}
        className="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 transition-colors hover:bg-overlay"
        style={{ color: 'var(--text-primary)' }}
      >
        <Copy size={12} />
        Copy SHA
      </button>
      <button
        onClick={() => {
          onCopyLine(state.line!.content);
          onClose();
        }}
        className="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 transition-colors hover:bg-overlay"
        style={{ color: 'var(--text-primary)' }}
      >
        <Copy size={12} />
        Copy line content
      </button>
      <button
        onClick={() => {
          onViewCommit(state.line!.sha);
          onClose();
        }}
        className="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 transition-colors hover:bg-overlay"
        style={{ color: 'var(--text-primary)' }}
      >
        <ExternalLink size={12} />
        View commit detail
      </button>
    </div>
  );
};

export const Blame: React.FC = () => {
  const navigate = useNavigate();
  const blame = useGitStore((s) => s.blame);
  const blameLoading = useGitStore((s) => s.loading.blame);
  const fetchBlame = useGitStore((s) => s.fetchBlame);
  const setSelectedCommitId = useGitStore((s) => s.setSelectedCommitId);
  const fetchCommitDetail = useGitStore((s) => s.fetchCommitDetail);
  const addNotification = useUIStore((s) => s.addNotification);

  const [filePath, setFilePath] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    sha: string;
    authorName: string;
    authorTime: number;
    commitMessage: string;
    position: { x: number; y: number };
  }>({ visible: false, sha: '', authorName: '', authorTime: 0, commitMessage: '', position: { x: 0, y: 0 } });

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    line: null,
  });

  // Group blame lines by commit
  const commitGroups = useMemo(() => {
    if (!blame) return new Map<string, { lines: BlameLine[]; color: string }>();
    const groups = new Map<string, { lines: BlameLine[]; color: string }>();
    const colors = [
      'rgba(137, 180, 250, 0.08)',
      'rgba(166, 227, 161, 0.08)',
      'rgba(243, 139, 168, 0.08)',
      'rgba(249, 226, 175, 0.08)',
      'rgba(250, 179, 135, 0.08)',
      'rgba(203, 166, 247, 0.08)',
      'rgba(148, 226, 213, 0.08)',
      'rgba(245, 194, 231, 0.08)',
    ];
    let colorIdx = 0;
    for (const line of blame.lines) {
      if (!groups.has(line.sha)) {
        groups.set(line.sha, { lines: [], color: colors[colorIdx % colors.length] });
        colorIdx++;
      }
      groups.get(line.sha)!.lines.push(line);
    }
    return groups;
  }, [blame]);

  // Build commit message map from blame lines (first line of each unique SHA)
  const commitMessages = useMemo(() => {
    const map = new Map<string, string>();
    if (!blame) return map;
    for (const line of blame.lines) {
      if (!map.has(line.sha)) {
        map.set(line.sha, line.commit_message || '');
      }
    }
    return map;
  }, [blame]);

  const handleSearch = () => {
    if (!filePath.trim()) {
      addNotification({ type: 'warning', title: 'Please enter a file path' });
      return;
    }
    fetchBlame({ path: filePath });
  };

  const filteredLines = useMemo(() => {
    if (!blame) return [];
    if (!searchQuery.trim()) return blame.lines;
    return blame.lines.filter((line) =>
      line.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      line.author_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [blame, searchQuery]);

  // SHA click handler: navigate to commit detail
  const handleShaClick = useCallback((sha: string) => {
    setSelectedCommitId(sha);
    fetchCommitDetail(sha);
    navigate('/repo?commit=' + sha);
  }, [setSelectedCommitId, fetchCommitDetail, navigate]);

  // Copy to clipboard helper
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      addNotification({ type: 'success', title: 'Copied to clipboard' });
    }).catch(() => {
      addNotification({ type: 'error', title: 'Failed to copy' });
    });
  }, [addNotification]);

  // Mouse hover handler for tooltip
  const handleMouseEnter = useCallback((e: React.MouseEvent, line: BlameLine) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      sha: line.sha,
      authorName: line.author_name,
      authorTime: line.author_time,
      commitMessage: commitMessages.get(line.sha) || '',
      position: {
        x: rect.right + 8,
        y: Math.max(rect.top, 8),
      },
    });
  }, [commitMessages]);

  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  // Right-click handler for context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, line: BlameLine) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      line,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-2 border-b shrink-0"
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
      >
        <input
          type="text"
          value={filePath}
          onChange={(e) => setFilePath(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="File path to blame..."
          className="flex-1 px-3 py-1.5 rounded border text-sm"
          style={{
            backgroundColor: 'var(--bg-base)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          onClick={handleSearch}
          className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
          style={{ backgroundColor: 'var(--accent-blue)', color: 'var(--bg-base)' }}
        >
          Blame
        </button>
      </div>

      {/* Search filter */}
      {blame && (
        <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by content or author..."
            className="w-full px-3 py-1 rounded border text-xs"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      )}

      {/* Blame content */}
      <div className="flex-1 overflow-auto">
        {blameLoading ? (
          <div className="flex items-center justify-center h-32" style={{ color: 'var(--text-subtle)' }}>
            <div className="animate-spin w-5 h-5 border-2 rounded-full" style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }} />
          </div>
        ) : blame && blame.lines.length > 0 ? (
          <div className="font-mono text-xs">
            {filteredLines.map((line) => {
              const group = commitGroups.get(line.sha);
              return (
                <div
                  key={line.line_number}
                  className="flex hover:bg-overlay transition-colors cursor-pointer"
                  style={{ backgroundColor: group?.color ?? 'transparent' }}
                  onMouseEnter={(e) => handleMouseEnter(e, line)}
                  onMouseLeave={handleMouseLeave}
                  onContextMenu={(e) => handleContextMenu(e, line)}
                >
                  {/* Commit info */}
                  <div
                    className="shrink-0 px-2 py-0.5 border-r"
                    style={{
                      width: 200,
                      borderColor: 'var(--border-color)',
                      backgroundColor: 'var(--bg-surface)',
                    }}
                  >
                    <div
                      className="flex items-center gap-1 truncate"
                      style={{ color: 'var(--accent-yellow)', fontSize: 11 }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShaClick(line.sha);
                        }}
                        className="hover:underline cursor-pointer"
                        style={{ color: 'var(--accent-yellow)', background: 'none', border: 'none', padding: 0, font: 'inherit' }}
                        title="Click to view commit detail"
                      >
                        {line.sha.slice(0, 7)}
                      </button>
                    </div>
                    <div className="flex items-center gap-1 truncate" style={{ color: 'var(--text-secondary)', fontSize: 10 }}>
                      <User size={8} />
                      {line.author_name}
                    </div>
                    <div className="flex items-center gap-1" style={{ color: 'var(--text-subtle)', fontSize: 10 }}>
                      <Clock size={8} />
                      {formatRelativeTime(new Date(line.author_time * 1000).toISOString())}
                    </div>
                  </div>

                  {/* Line number */}
                  <div
                    className="shrink-0 text-right px-2 py-0.5 border-r"
                    style={{
                      width: 40,
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-subtle)',
                      backgroundColor: 'var(--bg-surface)',
                    }}
                  >
                    {line.line_number}
                  </div>

                  {/* Content */}
                  <div className="flex-1 px-2 py-0.5 whitespace-pre" style={{ color: 'var(--text-primary)' }}>
                    {line.content}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32" style={{ color: 'var(--text-subtle)' }}>
            <p className="text-sm">Enter a file path to view blame information</p>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <Tooltip
          sha={tooltip.sha}
          authorName={tooltip.authorName}
          authorTime={tooltip.authorTime}
          commitMessage={tooltip.commitMessage}
          position={tooltip.position}
        />
      )}

      {/* Context menu */}
      <ContextMenu
        state={contextMenu}
        onClose={closeContextMenu}
        onCopySha={copyToClipboard}
        onCopyLine={copyToClipboard}
        onViewCommit={handleShaClick}
      />
    </div>
  );
};
