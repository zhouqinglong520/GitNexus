import type { Commit, Branch, Status, FileStatus } from '@/types';

/**
 * Get the branch display name (strip remote prefix)
 */
export function getBranchDisplayName(branch: Branch): string {
  if (!branch.is_remote) return branch.name;
  const parts = branch.name.split('/');
  return parts.slice(1).join('/');
}

/**
 * Get the remote name from a remote branch
 */
export function getRemoteName(branch: Branch): string | null {
  if (!branch.is_remote) return null;
  return branch.name.split('/')[0];
}

/**
 * Check if a commit is a merge commit
 */
export function isMergeCommit(commit: Commit): boolean {
  return commit.parents.length > 1;
}

/**
 * Check if a commit is the initial commit
 */
export function isInitialCommit(commit: Commit): boolean {
  return commit.parents.length === 0;
}

/**
 * Get the file extension from a path
 */
export function getFileExtension(path: string): string {
  const parts = path.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Determine the language from file extension
 */
export function getLanguageFromExtension(ext: string): string {
  const langMap: Record<string, string> = {
    ts: 'TypeScript',
    tsx: 'TypeScript React',
    js: 'JavaScript',
    jsx: 'JavaScript React',
    py: 'Python',
    rs: 'Rust',
    go: 'Go',
    java: 'Java',
    c: 'C',
    cpp: 'C++',
    h: 'C Header',
    hpp: 'C++ Header',
    cs: 'C#',
    rb: 'Ruby',
    php: 'PHP',
    swift: 'Swift',
    kt: 'Kotlin',
    scala: 'Scala',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    less: 'LESS',
    json: 'JSON',
    yaml: 'YAML',
    yml: 'YAML',
    toml: 'TOML',
    xml: 'XML',
    md: 'Markdown',
    sql: 'SQL',
    sh: 'Shell',
    bash: 'Bash',
    zsh: 'Zsh',
    dockerfile: 'Dockerfile',
    makefile: 'Makefile',
    vue: 'Vue',
    svelte: 'Svelte',
  };
  return langMap[ext] ?? 'Unknown';
}

/**
 * Get the status color for a file status
 */
export function getStatusColor(status: FileStatus): string {
  const colorMap: Record<FileStatus, string> = {
    Modified: 'var(--accent-yellow)',
    Added: 'var(--accent-green)',
    Deleted: 'var(--accent-red)',
    Renamed: 'var(--accent-mauve)',
    Copied: 'var(--accent-teal)',
    Untracked: 'var(--accent-peach)',
    Conflicted: 'var(--accent-red)',
    Unmerged: 'var(--accent-red)',
    Ignored: 'var(--text-subtle)',
    Broken: 'var(--accent-red)',
  };
  return colorMap[status];
}

/**
 * Get the status label character
 */
export function getStatusLabel(status: FileStatus): string {
  const labelMap: Record<FileStatus, string> = {
    Modified: 'M',
    Added: 'A',
    Deleted: 'D',
    Renamed: 'R',
    Copied: 'C',
    Untracked: 'U',
    Conflicted: '!',
    Unmerged: '!',
    Ignored: 'I',
    Broken: 'B',
  };
  return labelMap[status];
}

/**
 * Count total changes in status
 */
export function countChanges(status: Status): { staged: number; unstaged: number; conflicts: number } {
  let staged = 0;
  let unstaged = 0;
  let conflicts = 0;
  for (const change of status.changes) {
    if (change.status === 'Conflicted' || change.status === 'Unmerged') {
      conflicts++;
    } else if (change.staged) {
      staged++;
    } else {
      unstaged++;
    }
  }
  return {
    staged,
    unstaged: unstaged + status.untracked_files.length,
    conflicts,
  };
}

/**
 * Check if working tree is clean
 */
export function isClean(status: Status): boolean {
  return status.changes.length === 0 && status.untracked_files.length === 0;
}

/**
 * Parse a git URL to determine the platform and repo info
 */
export function parseGitUrl(url: string): { platform: string; owner?: string; repo?: string } | null {
  // SSH format: git@github.com:user/repo.git
  const sshMatch = url.match(/^git@([^:]+):([^/]+)\/(.+?)(?:\.git)?$/);
  if (sshMatch) {
    return {
      platform: sshMatch[1],
      owner: sshMatch[2],
      repo: sshMatch[3],
    };
  }

  // HTTPS format: https://github.com/user/repo.git
  const httpsMatch = url.match(/^https?:\/\/([^/]+)\/([^/]+)\/(.+?)(?:\.git)?$/);
  if (httpsMatch) {
    return {
      platform: httpsMatch[1],
      owner: httpsMatch[2],
      repo: httpsMatch[3],
    };
  }

  return null;
}

/**
 * Shorten a commit hash
 */
export function shortenHash(hash: string, length: number = 7): string {
  return hash.slice(0, length);
}

/**
 * Validate an email address
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
