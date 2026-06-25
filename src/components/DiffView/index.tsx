import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';
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
}> = ({ file, onStageHunk, onUnstageHunk }) => {
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
            return (
              <div
                key={idx}
                className="px-3 py-0.5 border-b flex items-center"
                style={{
                  backgroundColor: 'var(--bg-mantle)',
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
// Main DiffView component
// ============================================================

export const DiffView: React.FC<DiffViewProps> = ({
  files,
  mode = 'unified',
  filePath,
  className = '',
  onStageHunk,
  onUnstageHunk,
}) => {
  const filteredFiles = useMemo(() => {
    if (!filePath) return files;
    return files.filter(
      (f) => f.new_path === filePath || f.old_path === filePath
    );
  }, [files, filePath]);

  // Image file loading state
  const [imageData, setImageData] = useState<Record<string, { oldImage: string | null; newImage: string | null; oldSize: number; newSize: number }>>({});

  // Load image data for image files (placeholder - actual implementation would use git_query_file_content)
  const loadImageData = useCallback(async (file: DiffFile) => {
    const key = `${file.old_path}-${file.new_path}`;
    // For now, mark image files as binary without loading actual image data
    // The backend would need to provide base64-encoded image content via git_query_file_content
    setImageData((prev) => ({
      ...prev,
      [key]: { oldImage: null, newImage: null, oldSize: 0, newSize: 0 },
    }));
  }, []);

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
    <div className={`overflow-auto h-full ${className}`}>
      {filteredFiles.map((file, idx) => {
        const isImage = isImageFile(file.new_path) || isImageFile(file.old_path);

        if (isImage) {
          const key = `${file.old_path}-${file.new_path}`;
          const data = imageData[key] ?? { oldImage: null, newImage: null, oldSize: 0, newSize: 0 };
          return (
            <div key={`${file.new_path}-${idx}`} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
              <ImageDiff
                oldImage={data.oldImage}
                newImage={data.newImage}
                oldSize={data.oldSize}
                newSize={data.newSize}
                filePath={file.new_path}
              />
            </div>
          );
        }

        return (
          <div key={`${file.new_path}-${idx}`} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
            {mode === 'unified' ? (
              <UnifiedDiff file={file} onStageHunk={onStageHunk} onUnstageHunk={onUnstageHunk} />
            ) : (
              <SideBySideDiff file={file} onStageHunk={onStageHunk} onUnstageHunk={onUnstageHunk} />
            )}
          </div>
        );
      })}
    </div>
  );
};
