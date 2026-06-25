import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { Plus, Minus, ChevronUp, ChevronDown, Search, X } from 'lucide-react';
import { useGitStore } from '@/stores/git-store';
import type { DiffFile, DiffHunk, DiffLine } from '@/types';
import { ImageDiff, isImageFile } from '@/components/ImageDiff';

export type DiffMode = 'unified' | 'side-by-side';

interface DiffViewProps {
  files: DiffFile[];
  mode?: DiffMode;
  filePath?: string;
  className?: string;
  onStageHunk?: (file: string, patch: string) => void;
  onUnstageHunk?: (file: string, patch: string) => void;
  ignoreWhitespace?: boolean;
  onIgnoreWhitespaceChange?: (value: boolean) => void;
  contextLines?: number;
  onContextLinesChange?: (value: number) => void;
}

// ============================================================
// Hunk patch text builder
// ============================================================

/**
 * Build a unified diff patch text for a single hunk of a file.
 * This includes the --- / +++ headers and the @@ hunk header,
 * suitable for passing to `git apply --cached`.
 */
function buildHunkPatchText(file: DiffFile, hunk: DiffHunk): string {
  const lines: string[] = [];
  lines.push(`--- a/${file.old_path || file.new_path}`);
  lines.push(`+++ b/${file.new_path || file.old_path}`);
  lines.push(hunk.header);
  for (const line of hunk.lines) {
    lines.push(`${line.origin}${line.content}`);
  }
  return lines.join('\n') + '\n';
}

// ============================================================
// Character-level diff highlighting
// ============================================================

interface CharDiffSegment {
  type: 'equal' | 'added' | 'removed';
  text: string;
}

/**
 * Compute character-level diff between two lines using LCS-based approach.
 * Uses a simple prefix/suffix matching algorithm for performance:
 * 1. Find common prefix
 * 2. Find common suffix
 * 3. The middle portion is the diff
 */
function highlightCharDiff(oldLine: string, newLine: string): { oldSegments: CharDiffSegment[]; newSegments: CharDiffSegment[] } {
  // Find common prefix
  let prefixLen = 0;
  const minLen = Math.min(oldLine.length, newLine.length);
  while (prefixLen < minLen && oldLine[prefixLen] === newLine[prefixLen]) {
    prefixLen++;
  }

  // Find common suffix
  let suffixLen = 0;
  const oldRemain = oldLine.length - prefixLen;
  const newRemain = newLine.length - prefixLen;
  const suffixMax = Math.min(oldRemain, newRemain);
  while (suffixLen < suffixMax && oldLine[oldLine.length - 1 - suffixLen] === newLine[newLine.length - 1 - suffixLen]) {
    suffixLen++;
  }

  const oldSegments: CharDiffSegment[] = [];
  const newSegments: CharDiffSegment[] = [];

  // Common prefix
  if (prefixLen > 0) {
    oldSegments.push({ type: 'equal', text: oldLine.substring(0, prefixLen) });
    newSegments.push({ type: 'equal', text: newLine.substring(0, prefixLen) });
  }

  // Diff middle portion
  const oldMiddle = oldLine.substring(prefixLen, oldLine.length - suffixLen);
  const newMiddle = newLine.substring(prefixLen, newLine.length - suffixLen);

  if (oldMiddle.length > 0) {
    oldSegments.push({ type: 'removed', text: oldMiddle });
  }
  if (newMiddle.length > 0) {
    newSegments.push({ type: 'added', text: newMiddle });
  }

  // Common suffix
  if (suffixLen > 0) {
    oldSegments.push({ type: 'equal', text: oldLine.substring(oldLine.length - suffixLen) });
    newSegments.push({ type: 'equal', text: newLine.substring(newLine.length - suffixLen) });
  }

  return { oldSegments, newSegments };
}

/**
 * Render a line with character-level diff highlighting segments.
 */
const CharDiffContent: React.FC<{ segments: CharDiffSegment[]; baseColor: string }> = ({ segments, baseColor }) => (
  <span className="whitespace-pre" style={{ color: baseColor }}>
    {segments.map((seg, i) => {
      if (seg.type === 'equal') {
        return <span key={i}>{seg.text}</span>;
      }
      if (seg.type === 'added') {
        return (
          <span
            key={i}
            style={{
              backgroundColor: 'rgba(166, 227, 161, 0.3)',
              borderRadius: 2,
              padding: '0 1px',
            }}
          >
            {seg.text}
          </span>
        );
      }
      // removed
      return (
        <span
          key={i}
          style={{
            backgroundColor: 'rgba(243, 139, 168, 0.3)',
            borderRadius: 2,
            padding: '0 1px',
          }}
        >
          {seg.text}
        </span>
      );
    })}
  </span>
);

// ============================================================
// Hunk action buttons (stage/unstage a single hunk)
// ============================================================

const HunkActions: React.FC<{
  file: DiffFile;
  hunk: DiffHunk;
  onStageHunk?: (file: string, patch: string) => void;
  onUnstageHunk?: (file: string, patch: string) => void;
}> = ({ file, hunk, onStageHunk, onUnstageHunk }) => {
  const handleStage = useCallback(() => {
    if (!onStageHunk) return;
    const patch = buildHunkPatchText(file, hunk);
    onStageHunk(file.new_path || file.old_path, patch);
  }, [file, hunk, onStageHunk]);

  const handleUnstage = useCallback(() => {
    if (!onUnstageHunk) return;
    const patch = buildHunkPatchText(file, hunk);
    onUnstageHunk(file.new_path || file.old_path, patch);
  }, [file, hunk, onUnstageHunk]);

  if (!onStageHunk && !onUnstageHunk) return null;

  return (
    <span className="inline-flex items-center gap-0.5 mr-1.5 shrink-0">
      {onStageHunk && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleStage();
          }}
          className="p-0.5 rounded transition-colors hover:bg-overlay"
          style={{ color: 'var(--accent-green)' }}
          title="Stage this hunk"
        >
          <Plus size={12} />
        </button>
      )}
      {onUnstageHunk && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleUnstage();
          }}
          className="p-0.5 rounded transition-colors hover:bg-overlay"
          style={{ color: 'var(--accent-red)' }}
          title="Unstage this hunk"
        >
          <Minus size={12} />
        </button>
      )}
    </span>
  );
};

// ============================================================
// Unified diff view component
// ============================================================

const UnifiedDiff: React.FC<{
  file: DiffFile;
  onStageHunk?: (file: string, patch: string) => void;
  onUnstageHunk?: (file: string, patch: string) => void;
  currentHunkIndex: number;
  searchQuery: string;
  searchMatches: Set<number>;
  searchCurrentMatch: number;
}> = ({ file, onStageHunk, onUnstageHunk, currentHunkIndex, searchQuery, searchMatches, searchCurrentMatch }) => {
  const allLines = useMemo(() => {
    const lines: (DiffLine & { hunkHeader?: string; hunkIndex?: number })[] = [];
    for (let hIdx = 0; hIdx < file.hunks.length; hIdx++) {
      const hunk = file.hunks[hIdx];
      lines.push({
        origin: ' ' as const,
        old_lineno: null,
        new_lineno: null,
        content: hunk.header,
        hunkHeader: hunk.header,
        hunkIndex: hIdx,
      });
      for (const line of hunk.lines) {
        lines.push(line);
      }
    }
    return lines;
  }, [file.hunks]);

  // Compute hunk start indices for highlighting
  const hunkStartIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < allLines.length; i++) {
      if (allLines[i].hunkHeader !== undefined && allLines[i].hunkIndex !== undefined) {
        indices.push(i);
      }
    }
    return indices;
  }, [allLines]);

  // Determine if a line is part of the current highlighted hunk
  const isHighlightedHunk = useCallback((lineIdx: number) => {
    if (currentHunkIndex < 0 || currentHunkIndex >= hunkStartIndices.length) return false;
    const startIdx = hunkStartIndices[currentHunkIndex];
    const endIdx = currentHunkIndex + 1 < hunkStartIndices.length
      ? hunkStartIndices[currentHunkIndex + 1]
      : allLines.length;
    return lineIdx >= startIdx && lineIdx < endIdx;
  }, [currentHunkIndex, hunkStartIndices, allLines.length]);

  // Search match highlighting
  const isSearchMatch = useCallback((lineIdx: number) => {
    return searchMatches.has(lineIdx);
  }, [searchMatches]);

  const isCurrentSearchMatch = useCallback((lineIdx: number) => {
    if (searchCurrentMatch < 0) return false;
    const matchArr = Array.from(searchMatches).sort((a, b) => a - b);
    return matchArr[searchCurrentMatch] === lineIdx;
  }, [searchCurrentMatch, searchMatches]);

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
          if (line.hunkHeader && line.hunkIndex !== undefined) {
            const hunk = file.hunks[line.hunkIndex];
            const isHighlighted = isHighlightedHunk(idx);
            return (
              <div
                key={idx}
                data-line-index={idx}
                className="px-3 py-0.5 border-b flex items-center"
                style={{
                  backgroundColor: isHighlighted ? 'rgba(137, 180, 250, 0.15)' : 'var(--bg-mantle)',
                  borderBottomColor: 'var(--border-color)',
                  color: 'var(--accent-blue)',
                }}
              >
                <HunkActions
                  file={file}
                  hunk={hunk}
                  onStageHunk={onStageHunk}
                  onUnstageHunk={onUnstageHunk}
                />
                <span className="whitespace-pre">{line.hunkHeader}</span>
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

          const isCurrentMatch = isCurrentSearchMatch(idx);
          const isMatch = isSearchMatch(idx);

          return (
            <div
              key={idx}
              data-line-index={idx}
              className="flex hover:bg-overlay transition-colors"
              style={{
                backgroundColor: isCurrentMatch
                  ? 'rgba(249, 226, 175, 0.35)'
                  : isMatch
                    ? 'rgba(249, 226, 175, 0.15)'
                    : bgColor,
                outline: isCurrentMatch ? '1px solid var(--accent-yellow)' : 'none',
                outlineOffset: '-1px',
              }}
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

// ============================================================
// Side-by-side diff view component
// ============================================================

const SideBySideDiff: React.FC<{
  file: DiffFile;
  onStageHunk?: (file: string, patch: string) => void;
  onUnstageHunk?: (file: string, patch: string) => void;
}> = ({ file, onStageHunk, onUnstageHunk }) => {
  const { leftLines, rightLines, hunkBoundaries } = useMemo(() => {
    const left: (DiffLine | null)[] = [];
    const right: (DiffLine | null)[] = [];
    const boundaries: number[] = []; // indices in leftLines where a new hunk starts

    for (const hunk of file.hunks) {
      const startIdx = left.length;
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
      boundaries.push({ hunkIndex: file.hunks.indexOf(hunk), lineIndex: startIdx } as never);
    }

    return { leftLines: left, rightLines: right, hunkBoundaries: boundaries };
  }, [file.hunks]);

  // Pre-compute character-level diff for paired change lines
  const charDiffs = useMemo(() => {
    const diffs: Array<{ oldSegments: CharDiffSegment[]; newSegments: CharDiffSegment[] } | null> = [];
    for (let i = 0; i < leftLines.length; i++) {
      const left = leftLines[i];
      const right = rightLines[i];
      if (left && right && left.origin === '-' && right.origin === '+') {
        diffs.push(highlightCharDiff(left.content, right.content));
      } else {
        diffs.push(null);
      }
    }
    return diffs;
  }, [leftLines, rightLines]);

  const renderLine = (line: DiffLine | null, side: 'left' | 'right', idx: number) => {
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

    // Check if this line has character-level diff data
    const diff = charDiffs[idx];
    if (diff && line.origin === '-') {
      // Left side: show old segments with removed highlighting
      return (
        <div className="flex" style={{ backgroundColor: bgColor }}>
          <span
            className="inline-block w-12 text-right pr-3 select-none shrink-0 border-r"
            style={{ color: 'var(--text-subtle)', borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
          >
            {line.old_lineno ?? ''}
          </span>
          <CharDiffContent segments={diff.oldSegments} baseColor={textColor} />
        </div>
      );
    }
    if (diff && line.origin === '+') {
      // Right side: show new segments with added highlighting
      return (
        <div className="flex" style={{ backgroundColor: bgColor }}>
          <span
            className="inline-block w-12 text-right pr-3 select-none shrink-0 border-r"
            style={{ color: 'var(--text-subtle)', borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
          >
            {line.new_lineno ?? ''}
          </span>
          <CharDiffContent segments={diff.newSegments} baseColor={textColor} />
        </div>
      );
    }

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
            <div key={idx}>{renderLine(line, 'left', idx)}</div>
          ))}
        </div>
        <div className="flex-1 overflow-x-auto">
          {rightLines.map((line, idx) => (
            <div key={idx}>{renderLine(line, 'right', idx)}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Status badge
// ============================================================

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

// ============================================================
// Diff Toolbar
// ============================================================

interface DiffToolbarProps {
  totalHunks: number;
  currentHunkIndex: number;
  onHunkNavigate: (index: number) => void;
  ignoreWhitespace: boolean;
  onIgnoreWhitespaceChange: (value: boolean) => void;
  contextLines: number;
  onContextLinesChange: (value: number) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchMatchCount: number;
  searchCurrentMatch: number;
  onSearchNavigate: (direction: 'next' | 'prev') => void;
  onSearchClose: () => void;
}

const DiffToolbar: React.FC<DiffToolbarProps> = ({
  totalHunks,
  currentHunkIndex,
  onHunkNavigate,
  ignoreWhitespace,
  onIgnoreWhitespaceChange,
  contextLines,
  onContextLinesChange,
  searchQuery,
  onSearchQueryChange,
  searchMatchCount,
  searchCurrentMatch,
  onSearchNavigate,
  onSearchClose,
}) => (
  <div
    className="flex items-center gap-2 px-3 py-1.5 border-b shrink-0 flex-wrap"
    style={{
      borderColor: 'var(--border-color)',
      backgroundColor: 'var(--bg-surface)',
    }}
  >
    {/* Hunk navigation */}
    <div className="flex items-center gap-1">
      <button
        onClick={() => onHunkNavigate(currentHunkIndex - 1)}
        disabled={currentHunkIndex <= 0}
        className="p-1 rounded transition-colors hover:bg-overlay disabled:opacity-30"
        style={{ color: 'var(--text-secondary)' }}
        title="Previous hunk (Ctrl+Alt+Up)"
      >
        <ChevronUp size={14} />
      </button>
      <span className="text-xs font-mono px-1" style={{ color: 'var(--text-subtle)', minWidth: 48, textAlign: 'center' }}>
        {totalHunks > 0 ? `${currentHunkIndex + 1}/${totalHunks}` : '0/0'}
      </span>
      <button
        onClick={() => onHunkNavigate(currentHunkIndex + 1)}
        disabled={currentHunkIndex >= totalHunks - 1}
        className="p-1 rounded transition-colors hover:bg-overlay disabled:opacity-30"
        style={{ color: 'var(--text-secondary)' }}
        title="Next hunk (Ctrl+Alt+Down)"
      >
        <ChevronDown size={14} />
      </button>
    </div>

    {/* Separator */}
    <div className="w-px h-4" style={{ backgroundColor: 'var(--border-color)' }} />

    {/* Ignore whitespace toggle */}
    <button
      onClick={() => onIgnoreWhitespaceChange(!ignoreWhitespace)}
      className="px-2 py-0.5 rounded text-xs transition-colors"
      style={{
        backgroundColor: ignoreWhitespace ? 'var(--accent-blue)' : 'var(--bg-overlay)',
        color: ignoreWhitespace ? 'var(--bg-base)' : 'var(--text-secondary)',
        border: '1px solid var(--border-color)',
      }}
      title="Ignore whitespace changes (-w)"
    >
      -w
    </button>

    {/* Context lines selector */}
    <div className="flex items-center gap-1">
      <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>U:</span>
      {[1, 3, 5, 10].map((n) => (
        <button
          key={n}
          onClick={() => onContextLinesChange(n)}
          className="px-1.5 py-0.5 rounded text-xs transition-colors"
          style={{
            backgroundColor: contextLines === n ? 'var(--accent-blue)' : 'var(--bg-overlay)',
            color: contextLines === n ? 'var(--bg-base)' : 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          {n}
        </button>
      ))}
    </div>

    {/* Separator */}
    <div className="w-px h-4" style={{ backgroundColor: 'var(--border-color)' }} />

    {/* Search */}
    {searchQuery !== undefined && (
      <div className="flex items-center gap-1">
        <div className="relative flex items-center">
          <Search size={12} className="absolute left-1.5" style={{ color: 'var(--text-subtle)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search in diff..."
            className="pl-6 pr-6 py-0.5 rounded text-xs w-40"
            style={{
              backgroundColor: 'var(--bg-base)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          />
          {searchQuery && (
            <button
              onClick={onSearchClose}
              className="absolute right-1"
              style={{ color: 'var(--text-subtle)' }}
            >
              <X size={10} />
            </button>
          )}
        </div>
        {searchQuery && searchMatchCount > 0 && (
          <>
            <button
              onClick={() => onSearchNavigate('prev')}
              className="p-0.5 rounded hover:bg-overlay"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ChevronUp size={12} />
            </button>
            <span className="text-xs font-mono" style={{ color: 'var(--text-subtle)' }}>
              {searchCurrentMatch + 1}/{searchMatchCount}
            </span>
            <button
              onClick={() => onSearchNavigate('next')}
              className="p-0.5 rounded hover:bg-overlay"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ChevronDown size={12} />
            </button>
          </>
        )}
        {searchQuery && searchMatchCount === 0 && (
          <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>0/0</span>
        )}
      </div>
    )}
  </div>
);

// ============================================================
// Main DiffView component
// ============================================================

export const DiffView: React.FC<DiffViewProps> = ({
  files,
  mode = 'unified',
  filePath,
  className = '',
  onStageHunk,
  onUnstageHunk,
  ignoreWhitespace = false,
  onIgnoreWhitespaceChange,
  contextLines = 3,
  onContextLinesChange,
}) => {
  const filteredFiles = useMemo(() => {
    if (!filePath) return files;
    return files.filter(
      (f) => f.new_path === filePath || f.old_path === filePath
    );
  }, [files, filePath]);

  // Image file loading state
  const [imageData, setImageData] = useState<Record<string, { oldImage: string | null; newImage: string | null; oldSize: number; newSize: number; placeholder?: boolean }>>({});

  // Hunk navigation state
  const [currentHunkIndex, setCurrentHunkIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCurrentMatch, setSearchCurrentMatch] = useState(-1);

  // Compute total hunks and hunk indices across all files
  const { totalHunks, hunkLineMap } = useMemo(() => {
    let total = 0;
    const map: Map<number, { fileIdx: number; lineIdx: number }> = new Map();
    for (let fIdx = 0; fIdx < filteredFiles.length; fIdx++) {
      const file = filteredFiles[fIdx];
      let lineCount = 0;
      for (let hIdx = 0; hIdx < file.hunks.length; hIdx++) {
        // Each hunk has a header line + its content lines
        map.set(total, { fileIdx: fIdx, lineIdx: lineCount });
        total++;
        lineCount += 1 + file.hunks[hIdx].lines.length;
      }
    }
    return { totalHunks: total, hunkLineMap: map };
  }, [filteredFiles]);

  // Compute search matches across all files
  const { searchMatches, searchMatchCount } = useMemo(() => {
    if (!searchQuery.trim()) {
      return { searchMatches: new Map<number, Set<number>>(), searchMatchCount: 0 };
    }
    const matches = new Map<number, Set<number>>();
    let count = 0;
    const query = searchQuery.toLowerCase();
    for (let fIdx = 0; fIdx < filteredFiles.length; fIdx++) {
      const file = filteredFiles[fIdx];
      const fileMatches = new Set<number>();
      let lineCount = 0;
      for (let hIdx = 0; hIdx < file.hunks.length; hIdx++) {
        const hunk = file.hunks[hIdx];
        lineCount++; // header line
        for (const line of hunk.lines) {
          if (line.content.toLowerCase().includes(query)) {
            fileMatches.add(lineCount);
            count++;
          }
          lineCount++;
        }
      }
      matches.set(fIdx, fileMatches);
    }
    return { searchMatches: matches, searchMatchCount: count };
  }, [filteredFiles, searchQuery]);

  // Flatten search matches for navigation
  const allSearchMatchPositions = useMemo(() => {
    const positions: { fileIdx: number; lineIdx: number }[] = [];
    for (const [fIdx, lineSet] of searchMatches) {
      for (const lineIdx of lineSet) {
        positions.push({ fileIdx: fIdx, lineIdx });
      }
    }
    positions.sort((a, b) => a.fileIdx !== b.fileIdx ? a.fileIdx - b.fileIdx : a.lineIdx - b.lineIdx);
    return positions;
  }, [searchMatches]);

  // Hunk navigation handler
  const handleHunkNavigate = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, totalHunks - 1));
    setCurrentHunkIndex(clamped);
    // Scroll to the hunk
    const info = hunkLineMap.get(clamped);
    if (info && containerRef.current) {
      const elements = containerRef.current.querySelectorAll(`[data-file-index="${info.fileIdx}"] [data-line-index="${info.lineIdx}"]`);
      if (elements.length > 0) {
        elements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [totalHunks, hunkLineMap]);

  // Search navigation handler
  const handleSearchNavigate = useCallback((direction: 'next' | 'prev') => {
    if (allSearchMatchPositions.length === 0) return;
    let next = direction === 'next' ? searchCurrentMatch + 1 : searchCurrentMatch - 1;
    if (next >= allSearchMatchPositions.length) next = 0;
    if (next < 0) next = allSearchMatchPositions.length - 1;
    setSearchCurrentMatch(next);
    const pos = allSearchMatchPositions[next];
    if (pos && containerRef.current) {
      const elements = containerRef.current.querySelectorAll(`[data-file-index="${pos.fileIdx}"] [data-line-index="${pos.lineIdx}"]`);
      if (elements.length > 0) {
        elements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [allSearchMatchPositions, searchCurrentMatch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Hunk navigation: Ctrl+Alt+Home/Up/Down/End
      if (e.ctrlKey && e.altKey) {
        if (e.key === 'Home') {
          e.preventDefault();
          handleHunkNavigate(0);
        } else if (e.key === 'End') {
          e.preventDefault();
          handleHunkNavigate(totalHunks - 1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          handleHunkNavigate(currentHunkIndex - 1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          handleHunkNavigate(currentHunkIndex + 1);
        }
      }
      // Search: Ctrl+F
      if (e.ctrlKey && !e.altKey && e.key === 'f') {
        e.preventDefault();
        const searchInput = containerRef.current?.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
      // Search navigation: Enter (next), Shift+Enter (prev)
      if (searchQuery && e.key === 'Enter') {
        e.preventDefault();
        handleSearchNavigate(e.shiftKey ? 'prev' : 'next');
      }
      // Escape to close search
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
        setSearchCurrentMatch(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleHunkNavigate, currentHunkIndex, totalHunks, searchQuery, handleSearchNavigate]);

  // Reset search current match when query changes
  useEffect(() => {
    setSearchCurrentMatch(searchMatchCount > 0 ? 0 : -1);
  }, [searchMatchCount]);

  // Load image data for image files using Tauri asset protocol
  const repoPath = useGitStore((s) => s.repoPath);

  const loadImageData = useCallback(async (file: DiffFile) => {
    const key = `${file.old_path}-${file.new_path}`;
    const filePath = file.new_path || file.old_path;
    if (!filePath || !isImageFile(filePath) || !repoPath) {
      setImageData((prev) => ({
        ...prev,
        [key]: { oldImage: null, newImage: null, oldSize: 0, newSize: 0, placeholder: true },
      }));
      return;
    }

    try {
      let oldImage: string | null = null;
      let newImage: string | null = null;
      let oldSize = 0;
      let newSize = 0;

      // Use Tauri asset protocol to load the working tree version
      try {
        const { convertFileSrc } = await import('@tauri-apps/api/core');
        const fullPath = `${repoPath}/${filePath}`;
        newImage = convertFileSrc(fullPath);
        // We cannot easily get file size via asset protocol, leave it as 0
        newSize = 0;
      } catch {
        // Asset protocol not available, try alternative approach
      }

      // Try to load the old (HEAD) version for SVG files via git query
      try {
        const oldContent = await useGitStore.getState().queryFileContent('HEAD', filePath);
        if (oldContent) {
          if (filePath.toLowerCase().endsWith('.svg')) {
            oldImage = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(oldContent)))}`;
            oldSize = oldContent.length;
          }
        }
      } catch {
        // HEAD version might not exist (e.g., new file)
      }

      setImageData((prev) => ({
        ...prev,
        [key]: { oldImage, newImage, oldSize, newSize, placeholder: false },
      }));
    } catch {
      setImageData((prev) => ({
        ...prev,
        [key]: { oldImage: null, newImage: null, oldSize: 0, newSize: 0, placeholder: true },
      }));
    }
  }, [repoPath]);

  // Load image data for image files when they appear
  useEffect(() => {
    for (const file of filteredFiles) {
      if (isImageFile(file.new_path) || isImageFile(file.old_path)) {
        const key = `${file.old_path}-${file.new_path}`;
        if (!imageData[key]) {
          loadImageData(file);
        }
      }
    }
  }, [filteredFiles, imageData, loadImageData]);

  if (filteredFiles.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`} style={{ color: 'var(--text-subtle)' }}>
        No diff to display
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Toolbar */}
      <DiffToolbar
        totalHunks={totalHunks}
        currentHunkIndex={currentHunkIndex}
        onHunkNavigate={handleHunkNavigate}
        ignoreWhitespace={ignoreWhitespace}
        onIgnoreWhitespaceChange={onIgnoreWhitespaceChange ?? (() => {})}
        contextLines={contextLines}
        onContextLinesChange={onContextLinesChange ?? (() => {})}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchMatchCount={searchMatchCount}
        searchCurrentMatch={searchCurrentMatch}
        onSearchNavigate={handleSearchNavigate}
        onSearchClose={() => { setSearchQuery(''); setSearchCurrentMatch(-1); }}
      />

      {/* Diff content */}
      <div ref={containerRef} className="overflow-auto flex-1">
        {filteredFiles.map((file, idx) => {
          const isImage = isImageFile(file.new_path) || isImageFile(file.old_path);

          if (isImage) {
            const key = `${file.old_path}-${file.new_path}`;
            const data = imageData[key] ?? { oldImage: null, newImage: null, oldSize: 0, newSize: 0 };
            return (
              <div key={`${file.new_path}-${idx}`} data-file-index={idx} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                {data.placeholder ? (
                  <div
                    className="px-3 py-1.5 flex items-center justify-between border-b"
                    style={{
                      backgroundColor: 'var(--bg-overlay)',
                      borderBottomColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span className="flex items-center gap-2 text-xs">
                      <StatusBadge status={file.status} />
                      <span>{file.new_path}</span>
                    </span>
                  </div>
                ) : null}
                <ImageDiff
                  oldImage={data.oldImage}
                  newImage={data.newImage}
                  oldSize={data.oldSize}
                  newSize={data.newSize}
                  filePath={file.new_path}
                />
                {data.placeholder && (
                  <div
                    className="px-4 py-3 text-xs text-center"
                    style={{ color: 'var(--text-subtle)', backgroundColor: 'var(--bg-mantle)' }}
                  >
                    Image file -- please use an external tool to view differences.
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={`${file.new_path}-${idx}`} data-file-index={idx} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
              {mode === 'unified' ? (
                <UnifiedDiff
                  file={file}
                  onStageHunk={onStageHunk}
                  onUnstageHunk={onUnstageHunk}
                  currentHunkIndex={currentHunkIndex}
                  searchQuery={searchQuery}
                  searchMatches={searchMatches.get(idx) ?? new Set()}
                  searchCurrentMatch={
                    searchCurrentMatch >= 0 && allSearchMatchPositions[searchCurrentMatch]?.fileIdx === idx
                      ? allSearchMatchPositions[searchCurrentMatch].lineIdx
                      : -1
                  }
                />
              ) : (
                <SideBySideDiff file={file} onStageHunk={onStageHunk} onUnstageHunk={onUnstageHunk} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
