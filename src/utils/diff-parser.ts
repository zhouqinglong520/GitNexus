import type { DiffFile, DiffHunk, DiffLine, FileStatus } from '@/types';

/**
 * Parse a unified diff string into structured DiffFile[] data.
 *
 * Handles standard unified diff format:
 *   diff --git a/path b/path
 *   index abc..def mode
 *   --- a/path  (or /dev/null)
 *   +++ b/path  (or /dev/null)
 *   @@ -old_start,old_count +new_start,new_count @@ header
 *    context line
 *   + added line
 *   - removed line
 *   \ no newline at end of file
 */
export function parseDiff(diffText: string): DiffFile[] {
  if (!diffText || !diffText.trim()) return [];

  const files: DiffFile[] = [];
  const lines = diffText.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Look for diff --git header
    if (line.startsWith('diff --git ')) {
      const file = parseFileDiff(lines, i);
      if (file) {
        files.push(file);
        // Advance past this file's diff
        i = findNextFileHeader(lines, i + 1);
      } else {
        i++;
      }
    } else {
      i++;
    }
  }

  return files;
}

/** Parse paths from "diff --git a/path b/path" */
function parseGitDiffPaths(header: string): { oldPath: string; newPath: string } {
  // diff --git a/old/path b/new/path
  const match = header.match(/^diff --git a\/(.+?) b\/(.+)$/);
  if (match) {
    return { oldPath: match[1], newPath: match[2] };
  }
  return { oldPath: header, newPath: header };
}

/** Detect file status from diff metadata lines */
function detectFileStatus(
  oldPath: string,
  newPath: string,
  metaLines: string[]
): FileStatus {
  // Check for rename
  for (const ml of metaLines) {
    if (ml.startsWith('rename from ') || ml.startsWith('rename to ')) {
      return 'Renamed';
    }
    if (ml.startsWith('copy from ') || ml.startsWith('copy to ')) {
      return 'Copied';
    }
    if (ml.startsWith('new file mode ')) {
      return 'Added';
    }
    if (ml.startsWith('deleted file mode ')) {
      return 'Deleted';
    }
  }

  if (oldPath === '/dev/null') return 'Added';
  if (newPath === '/dev/null') return 'Deleted';
  if (oldPath !== newPath) return 'Renamed';
  return 'Modified';
}

/** Parse a single file diff block starting at the "diff --git" line */
function parseFileDiff(lines: string[], startIndex: number): DiffFile | null {
  const header = lines[startIndex];
  const { oldPath, newPath } = parseGitDiffPaths(header);

  // Collect metadata lines between diff --git and the first @@ hunk
  const metaLines: string[] = [];
  let i = startIndex + 1;
  while (i < lines.length && !lines[i].startsWith('@@')) {
    metaLines.push(lines[i]);
    i++;
  }

  if (i >= lines.length) {
    // No hunks found - might be a binary or empty diff
    const status = detectFileStatus(oldPath, newPath, metaLines);
    return {
      old_path: oldPath,
      new_path: newPath,
      old_oid: null,
      new_oid: null,
      status,
      binary: metaLines.some((l) => l.includes('Binary files')),
      hunks: [],
    };
  }

  const status = detectFileStatus(oldPath, newPath, metaLines);

  // Parse hunks
  const hunks: DiffHunk[] = [];
  while (i < lines.length && (lines[i].startsWith('@@') || lines[i].startsWith('diff --git'))) {
    if (lines[i].startsWith('diff --git')) break;

    const hunk = parseHunk(lines, i);
    if (hunk) {
      hunks.push(hunk);
      // Advance past this hunk
      i = findNextHunkOrFile(lines, i + 1);
    } else {
      i++;
    }
  }

  // Calculate stats
  let insertions = 0;
  let deletions = 0;
  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.origin === '+') insertions++;
      else if (line.origin === '-') deletions++;
    }
  }

  return {
    old_path: oldPath,
    new_path: newPath,
    old_oid: null,
    new_oid: null,
    status,
    binary: false,
    hunks,
    stats: { insertions, deletions },
  };
}

/** Parse @@ -old_start,old_count +new_start,new_count @@ header line */
function parseHunkHeader(header: string): {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  context: string;
} | null {
  const match = header.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
  if (!match) return null;

  return {
    oldStart: parseInt(match[1], 10),
    oldCount: match[2] ? parseInt(match[2], 10) : 1,
    newStart: parseInt(match[3], 10),
    newCount: match[4] ? parseInt(match[4], 10) : 1,
    context: match[5]?.trim() ?? '',
  };
}

/** Parse a single hunk starting at the @@ line */
function parseHunk(lines: string[], startIndex: number): DiffHunk | null {
  const parsed = parseHunkHeader(lines[startIndex]);
  if (!parsed) return null;

  const { oldStart, oldCount, newStart, newCount, context } = parsed;
  const hunkLines: DiffLine[] = [];

  let oldLine = oldStart;
  let newLine = newStart;
  let i = startIndex + 1;

  while (i < lines.length) {
    const line = lines[i];

    // Stop at next hunk or file header
    if (line.startsWith('@@') || line.startsWith('diff --git')) break;

    if (line.startsWith('+')) {
      hunkLines.push({
        origin: '+',
        old_lineno: null,
        new_lineno: newLine++,
        content: line.slice(1),
      });
    } else if (line.startsWith('-')) {
      hunkLines.push({
        origin: '-',
        old_lineno: oldLine++,
        new_lineno: null,
        content: line.slice(1),
      });
    } else if (line.startsWith(' ')) {
      hunkLines.push({
        origin: ' ',
        old_lineno: oldLine++,
        new_lineno: newLine++,
        content: line.slice(1),
      });
    } else if (line.startsWith('\\')) {
      // "\ No newline at end of file"
      hunkLines.push({
        origin: '\\',
        old_lineno: null,
        new_lineno: null,
        content: line.slice(1).trim(),
      });
    } else {
      // Treat as context line (some diffs may not have leading space)
      hunkLines.push({
        origin: ' ',
        old_lineno: oldLine++,
        new_lineno: newLine++,
        content: line,
      });
    }

    i++;
  }

  return {
    old_start: oldStart,
    old_count: oldCount,
    new_start: newStart,
    new_count: newCount,
    header: `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@${context ? ' ' + context : ''}`,
    lines: hunkLines,
  };
}

/** Find the next "diff --git" line index */
function findNextFileHeader(lines: string[], fromIndex: number): number {
  for (let i = fromIndex; i < lines.length; i++) {
    if (lines[i].startsWith('diff --git ')) return i;
  }
  return lines.length;
}

/** Find the next @@ hunk or diff --git line index */
function findNextHunkOrFile(lines: string[], fromIndex: number): number {
  for (let i = fromIndex; i < lines.length; i++) {
    if (lines[i].startsWith('@@') || lines[i].startsWith('diff --git ')) return i;
  }
  return lines.length;
}
