// ============================================================
// Git Data Types - Corresponding to Rust backend data models
// ============================================================

import type { ReactNode } from 'react';

/** Git commit object (matches backend Commit struct) */
export interface Commit {
  sha: string;
  parents: string[];
  refs: string; // JSON-encoded refs string from backend
  author_name: string;
  author_email: string;
  author_time: number; // unix timestamp
  subject: string;
}

/** Parsed commit ref from the refs string */
export interface CommitRef {
  name: string;
  kind: RefKind;
}

export type RefKind = 'branch' | 'tag' | 'remote' | 'head' | 'stash';

/** Branch information (matches backend Branch struct) */
export interface Branch {
  name: string;
  is_current: boolean;
  is_remote: boolean;
  upstream: string | null;
  last_commit: string | null;
}

/** Tag information (matches backend Tag struct) */
export interface Tag {
  name: string;
  sha: string;
  is_annotated: boolean;
  message: string | null;
  tagger_name: string | null;
  tagger_email: string | null;
  tagger_time: number | null;
}

/** Remote information (matches backend Remote struct) */
export interface Remote {
  name: string;
  url: string;
  push_url: string | null;
  head: string | null;
}

/** Stash entry (matches backend Stash struct) */
export interface Stash {
  index: number;
  sha: string;
  message: string;
  branch: string | null;
}

/** Status of the working tree (matches backend WorktreeStatus struct) */
export interface Status {
  branch: string;
  ahead: number;
  behind: number;
  changes: StatusEntry[];
  untracked_files: string[];
}

/** Single file status entry (matches backend Change struct) */
export interface StatusEntry {
  path: string;
  old_path?: string; // for renames
  status: FileStatus;
  staged: boolean;
}

export type FileStatus =
  | 'Added'
  | 'Deleted'
  | 'Modified'
  | 'Renamed'
  | 'Copied'
  | 'Untracked'
  | 'Ignored'
  | 'Conflicted'
  | 'Unmerged'
  | 'Broken';

/** Diff result (matches backend DiffResult struct) */
export interface DiffResult {
  diff: string;
  old_ref: string | null;
  new_ref: string | null;
  file_count: number;
  insertions: number;
  deletions: number;
}

/** Diff stats */
export interface DiffStats {
  insertions: number;
  deletions: number;
  files_changed: number;
}

/** Single file diff */
export interface DiffFile {
  old_path: string;
  new_path: string;
  old_oid: string | null;
  new_oid: string | null;
  status: FileStatus;
  binary: boolean;
  hunks: DiffHunk[];
  stats?: FileDiffStats;
}

export interface FileDiffStats {
  insertions: number;
  deletions: number;
}

/** Diff hunk */
export interface DiffHunk {
  old_start: number;
  old_count: number;
  new_start: number;
  new_count: number;
  header: string;
  lines: DiffLine[];
}

/** Single diff line */
export interface DiffLine {
  origin: '+' | '-' | ' ' | '\\';
  old_lineno: number | null;
  new_lineno: number | null;
  content: string;
  syntax_highlight?: SyntaxToken[];
}

/** Syntax highlight token */
export interface SyntaxToken {
  kind: string;
  offset: number;
  length: number;
}

/** Repository information (matches backend RepositoryInfo struct) */
export interface RepositoryInfo {
  path: string;
  head: string;
  branch: string | null;
  is_bare: boolean;
  worktree: string;
}

/** Blame line (matches backend BlameLine struct) */
export interface BlameLine {
  sha: string;
  author_name: string;
  author_email: string;
  author_time: number;
  line_number: number;
  content: string;
}

/** Blame result for a file (frontend wrapper around Vec<BlameLine>) */
export interface BlameResult {
  path: string;
  lines: BlameLine[];
}

/** Submodule information (matches backend Submodule struct) */
export interface Submodule {
  name: string;
  path: string;
  url: string;
  branch: string | null;
  sha: string;
}

// ============================================================
// UI Types
// ============================================================

/** Tab in the repository view */
export interface Tab {
  id: string;
  repoPath: string;
  label: string;
  type: TabType;
}

export type TabType = 'histories' | 'working-copy' | 'stashes';

/** Context menu item */
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  action?: () => void;
  children?: ContextMenuItem[];
}

/** Context menu state */
export interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

/** Command palette item */
export interface CommandItem {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  icon?: string;
  action: () => void;
}

/** Notification */
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
}

/** Dialog */
export interface DialogState {
  type: 'confirm' | 'input' | 'select';
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  defaultValue?: string;
  options?: string[];
  onConfirm?: (value?: string) => void;
  onCancel?: () => void;
}

/** In-progress operation */
export interface InProgressOperation {
  id: string;
  type: OperationType;
  message: string;
  progress?: number;
  total?: number;
}

export type OperationType =
  | 'clone'
  | 'fetch'
  | 'pull'
  | 'push'
  | 'checkout'
  | 'merge'
  | 'rebase'
  | 'reset'
  | 'cherry-pick'
  | 'stash'
  | 'pop';

// ============================================================
// Preferences Types
// ============================================================

export interface Preferences {
  general: GeneralPreferences;
  appearance: AppearancePreferences;
  git: GitPreferences;
  integration: IntegrationPreferences;
}

export interface GeneralPreferences {
  language: string;
  default_repo_directory: string;
  auto_fetch: boolean;
  auto_fetch_interval: number;
  recent_repos_count: number;
  confirm_before_undo: boolean;
  show_ignored_files: boolean;
}

export interface AppearancePreferences {
  theme: 'catppuccin-mocha' | 'catppuccin-latte' | 'dark' | 'light';
  font_family: string;
  font_size: number;
  line_height: number;
  show_commit_graph: boolean;
  show_avatars: boolean;
  compact_mode: boolean;
  diff_mode: 'unified' | 'side-by-side';
  tab_size: number;
}

export interface GitPreferences {
  default_branch_name: string;
  push_default: 'matching' | 'upstream' | 'current';
  rebase_when_pull: boolean;
  sign_commits: boolean;
  gpg_program: string;
  line_ending: 'lf' | 'crlf' | 'auto';
}

export interface IntegrationPreferences {
  terminal: string;
  merge_tool: string;
  diff_tool: string;
  editor: string;
  file_manager: string;
}

// ============================================================
// Tauri Command Types
// ============================================================

/** Parameters for Tauri invoke commands */
export interface OpenRepoParams {
  path: string;
}

export interface CloneRepoParams {
  url: string;
  destination: string;
  recursive: boolean;
}

export interface InitRepoParams {
  path: string;
  name: string;
  initialBranch: string;
}

export interface CommitParams {
  message: string;
  amend: boolean;
}

export interface StageParams {
  paths: string[];
}

export interface UnstageParams {
  paths: string[];
}

export interface CheckoutParams {
  branch: string;
  create: boolean;
  force: boolean;
}

export interface FetchParams {
  remote: string;
  prune: boolean;
}

export interface PullParams {
  remote: string;
  branch: string;
  rebase: boolean;
}

export interface PushParams {
  remote: string;
  branch: string;
  force: boolean;
  upstream: boolean;
}

export interface StashParams {
  message: string;
  keep_index: boolean;
  include_untracked: boolean;
}

export interface StashPopParams {
  index: number;
}

export interface StashDropParams {
  index: number;
}

export interface ResetParams {
  mode: 'soft' | 'mixed' | 'hard';
  commit: string;
}

export interface CherryPickParams {
  commits: string[];
}

export interface RebaseParams {
  upstream: string;
  interactive: boolean;
}

export interface MergeParams {
  branch: string;
  message: string;
  ff: 'only' | 'fast-forward' | 'no-fast-forward';
}

export interface BranchCreateParams {
  name: string;
  ref: string;
}

export interface BranchDeleteParams {
  name: string;
  force: boolean;
}

export interface TagCreateParams {
  name: string;
  message: string;
  commit: string;
  annotated: boolean;
}

export interface TagDeleteParams {
  name: string;
}

export interface RemoteAddParams {
  name: string;
  url: string;
}

export interface RemoteRemoveParams {
  name: string;
}

export interface DiffParams {
  path?: string;
  staged?: boolean;
  commit1?: string;
  commit2?: string;
}

export interface BlameParams {
  path: string;
  commit?: string;
  lines?: { start: number; end: number };
}

export interface LogParams {
  max_count?: number;
  skip?: number;
  author?: string;
  since?: string;
  until?: string;
  path?: string;
}
