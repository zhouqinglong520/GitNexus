import React, { useEffect, useState, useMemo } from 'react';
import { useGitStore } from '@/stores/git-store';
import { useUIStore } from '@/stores/ui-store';
import { User, Clock } from 'lucide-react';
import { formatRelativeTime } from '@/utils/format';
import type { BlameLine } from '@/types';

export const Blame: React.FC = () => {
  const blame = useGitStore((s) => s.blame);
  const blameLoading = useGitStore((s) => s.loading.blame);
  const fetchBlame = useGitStore((s) => s.fetchBlame);
  const addNotification = useUIStore((s) => s.addNotification);

  const [filePath, setFilePath] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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
                  className="flex hover:bg-overlay transition-colors"
                  style={{ backgroundColor: group?.color ?? 'transparent' }}
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
                    <div className="flex items-center gap-1 truncate" style={{ color: 'var(--accent-yellow)', fontSize: 11 }}>
                      {line.sha.slice(0, 7)}
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
    </div>
  );
};
