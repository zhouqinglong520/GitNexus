import React, { useMemo } from 'react';
import type { DiffFile, DiffHunk, DiffLine } from '@/types';

export type DiffMode = 'unified' | 'side-by-side';

interface DiffViewProps {
  files: DiffFile[];
  mode?: DiffMode;
  filePath?: string;
  className?: string;
}

// Unified diff view component
const UnifiedDiff: React.FC<{ file: DiffFile }> = ({ file }) => {
  const allLines = useMemo(() => {
    const lines: (DiffLine & { hunkHeader?: string })[] = [];
    for (const hunk of file.hunks) {
      lines.push({ origin: ' ' as const, old_lineno: null, new_lineno: null, content: hunk.header, hunkHeader: hunk.header });
      for (const line of hunk.lines) {
        lines.push(line);
      }
    }
    return lines;
  }, [file.hunks]);

  return (
    <div className="font-mono text-xs" style={{ lineHeight: 1.6 }}>
      {/* File header */}
      <div
        className="px-3 py-1.5 flex items-center justify-between border-b"
        style={{
          backgroundColor: 'var(--bg-overlay)',
          borderBottomColor: 'var(--border-color)',
          color: 'var(--text-primary)',
        }}
      >
        <span className="flex items-center gap-2">
          <StatusBadge status={file.status} />
          <span>{file.new_path}</span>
          {file.old_path !== file.new_path && (
            <span style={{ color: 'var(--text-subtle)' }}>
              {' <- '}{file.old_path}
            </span>
          )}
        </span>
        {file.stats && (
          <span className="flex items-center gap-2 text-xs">
            <span style={{ color: 'var(--accent-green)' }}>+{file.stats.insertions}</span>
            <span style={{ color: 'var(--accent-red)' }}>-{file.stats.deletions}</span>
          </span>
        )}
      </div>

      {/* Diff lines */}
      <div className="overflow-x-auto">
        {allLines.map((line, idx) => {
          if (line.hunkHeader) {
            return (
              <div
                key={idx}
                className="px-3 py-0.5 border-b"
                style={{
                  backgroundColor: 'var(--bg-mantle)',
                  borderBottomColor: 'var(--border-color)',
                  color: 'var(--accent-blue)',
                }}
              >
                {line.hunkHeader}
              </div>
            );
          }

          const bgColor =
            line.origin === '+'
              ? 'rgba(166, 227, 161, 0.1)'
              : line.origin === '-'
                ? 'rgba(243, 139, 168, 0.1)'
                : 'transparent';

          const textColor =
            line.origin === '+'
              ? 'var(--accent-green)'
              : line.origin === '-'
                ? 'var(--accent-red)'
                : 'var(--text-primary)';

          return (
            <div
              key={idx}
              className="flex hover:bg-overlay transition-colors"
              style={{ backgroundColor: bgColor }}
            >
              {/* Line numbers */}
              <span
                className="inline-block w-12 text-right pr-3 select-none shrink-0 border-r"
                style={{
                  color: 'var(--text-subtle)',
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                {line.old_lineno ?? ''}
              </span>
              <span
                className="inline-block w-12 text-right pr-3 select-none shrink-0 border-r"
                style={{
                  color: 'var(--text-subtle)',
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                {line.new_lineno ?? ''}
              </span>
              {/* Origin marker */}
              <span
                className="inline-block w-5 text-center select-none shrink-0"
                style={{ color: textColor }}
              >
                {line.origin === '\\' ? '' : line.origin}
              </span>
              {/* Content */}
              <span className="flex-1 whitespace-pre" style={{ color: textColor }}>
                {line.content}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Side-by-side diff view component
const SideBySideDiff: React.FC<{ file: DiffFile }> = ({ file }) => {
  const { leftLines, rightLines } = useMemo(() => {
    const left: (DiffLine | null)[] = [];
    const right: (DiffLine | null)[] = [];

    for (const hunk of file.hunks) {
      let i = 0;
      while (i < hunk.lines.length) {
        const line = hunk.lines[i];

        if (line.origin === ' ' || line.origin === '\\') {
          left.push(line);
          right.push(line);
          i++;
        } else if (line.origin === '-') {
          // Collect consecutive deletions
          const deletions: DiffLine[] = [];
          while (i < hunk.lines.length && hunk.lines[i].origin === '-') {
            deletions.push(hunk.lines[i]);
            i++;
          }
          // Collect consecutive additions
          const additions: DiffLine[] = [];
          while (i < hunk.lines.length && hunk.lines[i].origin === '+') {
            additions.push(hunk.lines[i]);
            i++;
          }

          const maxLen = Math.max(deletions.length, additions.length);
          for (let j = 0; j < maxLen; j++) {
            left.push(deletions[j] ?? null);
            right.push(additions[j] ?? null);
          }
        } else if (line.origin === '+') {
          left.push(null);
          right.push(line);
          i++;
        } else {
          i++;
        }
      }
    }

    return { leftLines: left, rightLines: right };
  }, [file.hunks]);

  const renderLine = (line: DiffLine | null, side: 'left' | 'right') => {
    if (!line) {
      return (
        <div className="flex" style={{ height: '1.6em' }}>
          <span className="inline-block w-12 text-right pr-3 select-none shrink-0 border-r" style={{ color: 'var(--text-subtle)', borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}></span>
          <span className="flex-1"></span>
        </div>
      );
    }

    const bgColor =
      line.origin === '+'
        ? 'rgba(166, 227, 161, 0.1)'
        : line.origin === '-'
          ? 'rgba(243, 139, 168, 0.1)'
          : 'transparent';

    const textColor =
      line.origin === '+'
        ? 'var(--accent-green)'
        : line.origin === '-'
          ? 'var(--accent-red)'
          : 'var(--text-primary)';

    return (
      <div className="flex" style={{ backgroundColor: bgColor }}>
        <span
          className="inline-block w-12 text-right pr-3 select-none shrink-0 border-r"
          style={{ color: 'var(--text-subtle)', borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
        >
          {side === 'left' ? line.old_lineno ?? '' : line.new_lineno ?? ''}
        </span>
        <span className="flex-1 whitespace-pre" style={{ color: textColor }}>
          {line.content}
        </span>
      </div>
    );
  };

  return (
    <div className="font-mono text-xs" style={{ lineHeight: 1.6 }}>
      <div
        className="px-3 py-1.5 flex items-center justify-between border-b"
        style={{ backgroundColor: 'var(--bg-overlay)', borderBottomColor: 'var(--border-color)', color: 'var(--text-primary)' }}
      >
        <span className="flex items-center gap-2">
          <StatusBadge status={file.status} />
          <span>{file.new_path}</span>
        </span>
        {file.stats && (
          <span className="flex items-center gap-2">
            <span style={{ color: 'var(--accent-green)' }}>+{file.stats.insertions}</span>
            <span style={{ color: 'var(--accent-red)' }}>-{file.stats.deletions}</span>
          </span>
        )}
      </div>
      <div className="flex">
        <div className="flex-1 overflow-x-auto border-r" style={{ borderColor: 'var(--border-color)' }}>
          {leftLines.map((line, idx) => (
            <div key={idx}>{renderLine(line, 'left')}</div>
          ))}
        </div>
        <div className="flex-1 overflow-x-auto">
          {rightLines.map((line, idx) => (
            <div key={idx}>{renderLine(line, 'right')}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colorMap: Record<string, string> = {
    modified: 'var(--accent-yellow)',
    added: 'var(--accent-green)',
    deleted: 'var(--accent-red)',
    renamed: 'var(--accent-mauve)',
    copied: 'var(--accent-teal)',
    untracked: 'var(--accent-peach)',
    conflicted: 'var(--accent-red)',
  };

  const labelMap: Record<string, string> = {
    modified: 'M',
    added: 'A',
    deleted: 'D',
    renamed: 'R',
    copied: 'C',
    untracked: 'U',
    conflicted: '!',
  };

  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold"
      style={{ backgroundColor: colorMap[status] ?? 'var(--text-subtle)', color: 'var(--bg-base)' }}
    >
      {labelMap[status] ?? '?'}
    </span>
  );
};

export const DiffView: React.FC<DiffViewProps> = ({ files, mode = 'unified', filePath, className = '' }) => {
  const filteredFiles = useMemo(() => {
    if (!filePath) return files;
    return files.filter(
      (f) => f.new_path === filePath || f.old_path === filePath
    );
  }, [files, filePath]);

  if (filteredFiles.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`} style={{ color: 'var(--text-subtle)' }}>
        No diff to display
      </div>
    );
  }

  return (
    <div className={`overflow-auto h-full ${className}`}>
      {filteredFiles.map((file, idx) => (
        <div key={`${file.new_path}-${idx}`} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
          {mode === 'unified' ? <UnifiedDiff file={file} /> : <SideBySideDiff file={file} />}
        </div>
      ))}
    </div>
  );
};
