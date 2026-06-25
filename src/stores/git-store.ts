import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import type {
  Commit,
  Branch,
  Tag,
  Remote,
  Stash,
  Status,
  BlameResult,
  BlameLine,
  LogParams,
  DiffParams,
  BlameParams,
  CommitParams,
  StageParams,
  UnstageParams,
  CheckoutParams,
  FetchParams,
  PullParams,
  PushParams,
  StashParams,
  StashPopParams,
  StashDropParams,
  ResetParams,
  CherryPickParams,
  MergeParams,
  BranchCreateParams,
  BranchDeleteParams,
  TagCreateParams,
  TagDeleteParams,
  RemoteAddParams,
  RemoteRemoveParams,
  CommitDetail,
  Worktree,
  RepositoryStats,
  InProgressState,
  ConflictFile,
  SearchParams,
  LfsLock,
} from '@/types';

// ============================================================
// Request deduplication: avoid duplicate in-flight Tauri calls
// ============================================================

const pendingRequests = new Map<string, Promise<any>>();

async function dedupedInvoke<T>(command: string, args?: any): Promise<T> {
  const key = JSON.stringify({ command, args });
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }
  const promise = invoke<T>(command, args).finally(() => {
    pendingRequests.delete(key);
  });
  pendingRequests.set(key, promise);
  return promise;
}

interface GitStore {
  // Repository path
  repoPath: string | null;
  setRepoPath: (path: string | null) => void;

  // Data
  commits: Commit[];
  branches: Branch[];
  tags: Tag[];
  remotes: Remote[];
  stashes: Stash[];
  status: Status | null;
  diff: string | null;
  blame: BlameResult | null;
  selectedCommitId: string | null;
  commitDetail: CommitDetail | null;
  worktrees: Worktree[];
  statistics: RepositoryStats | null;
  inProgress: InProgressState | null;

  // Loading states
  loading: {
    commits: boolean;
    branches: boolean;
    tags: boolean;
    remotes: boolean;
    stashes: boolean;
    status: boolean;
    diff: boolean;
    blame: boolean;
    commitDetail: boolean;
    worktrees: boolean;
    statistics: boolean;
    inProgress: boolean;
  };

  // Error states
  errors: {
    commits: string | null;
    branches: string | null;
    tags: string | null;
    remotes: string | null;
    stashes: string | null;
    status: string | null;
    diff: string | null;
    blame: string | null;
    commitDetail: string | null;
    worktrees: string | null;
    statistics: string | null;
    inProgress: string | null;
  };

  // Fetch actions
  fetchCommits: (params?: LogParams) => Promise<void>;
  fetchBranches: () => Promise<void>;
  fetchTags: () => Promise<void>;
  fetchRemotes: () => Promise<void>;
  fetchStashes: () => Promise<void>;
  fetchStatus: () => Promise<void>;
  fetchDiff: (params: DiffParams) => Promise<void>;
  fetchDiffStaged: (file?: string) => Promise<void>;
  fetchDiffUnstaged: (file?: string) => Promise<void>;
  fetchBlame: (params: BlameParams) => Promise<void>;
  fetchCommitDetail: (sha: string) => Promise<void>;
  fetchWorktrees: () => Promise<void>;
  fetchStatistics: (since?: string) => Promise<void>;
  fetchInProgress: () => Promise<void>;
  fetchAll: () => Promise<void>;

  // Mutation actions
  commit: (params: CommitParams) => Promise<void>;
  stage: (params: StageParams) => Promise<void>;
  unstage: (params: UnstageParams) => Promise<void>;
  stageAll: () => Promise<void>;
  unstageAll: () => Promise<void>;
  stageHunk: (file: string, patch: string) => Promise<void>;
  unstageHunk: (file: string, patch: string) => Promise<void>;
  checkout: (params: CheckoutParams) => Promise<void>;
  discard: (paths: string[]) => Promise<void>;
  fetchRemote: (params: FetchParams) => Promise<void>;
  pull: (params: PullParams) => Promise<void>;
  push: (params: PushParams) => Promise<void>;
  stash: (params: StashParams) => Promise<void>;
  stashPop: (params: StashPopParams) => Promise<void>;
  stashDrop: (params: StashDropParams) => Promise<void>;
  applyStash: (index: number) => Promise<void>;
  clearStash: () => Promise<void>;
  reset: (params: ResetParams) => Promise<void>;
  cherryPick: (params: CherryPickParams) => Promise<void>;
  cherryPickContinue: () => Promise<void>;
  cherryPickAbort: () => Promise<void>;
  merge: (params: MergeParams) => Promise<void>;
  abortMerge: () => Promise<void>;
  createBranch: (params: BranchCreateParams) => Promise<void>;
  deleteBranch: (params: BranchDeleteParams) => Promise<void>;
  renameBranch: (oldName: string, newName: string) => Promise<void>;
  setUpstream: (branch: string, remoteBranch: string) => Promise<void>;
  createTag: (params: TagCreateParams) => Promise<void>;
  deleteTag: (params: TagDeleteParams) => Promise<void>;
  pushTag: (name: string, remote: string) => Promise<void>;
  addRemote: (params: RemoteAddParams) => Promise<void>;
  removeRemote: (params: RemoteRemoveParams) => Promise<void>;
  pruneRemote: (name: string) => Promise<void>;
  revert: (sha: string) => Promise<void>;
  rebase: (onto?: string, branch?: string) => Promise<void>;
  rebaseContinue: () => Promise<void>;
  rebaseSkip: () => Promise<void>;
  rebaseAbort: () => Promise<void>;
  getConfig: (key: string) => Promise<string>;
  setConfig: (key: string, value: string) => Promise<void>;
  addWorktree: (path: string, refName: string) => Promise<void>;
  removeWorktree: (path: string, force: boolean) => Promise<void>;
  pruneWorktrees: () => Promise<void>;
  createArchive: (output: string, refName: string, format: string) => Promise<void>;
  listSubmodules: () => Promise<void>;
  addSubmodule: (url: string, name?: string, branch?: string) => Promise<void>;
  updateSubmodule: (name?: string, init?: boolean, recursive?: boolean) => Promise<void>;

  // Additional actions (P1-1)
  searchCommits: (params: SearchParams) => Promise<Commit[]>;
  getMergeConflicts: () => Promise<ConflictFile[]>;
  assumeUnchanged: (files: string[], enable: boolean) => Promise<void>;
  skipWorktree: (files: string[], enable: boolean) => Promise<void>;
  addToGitignore: (patterns: string[]) => Promise<void>;
  deleteFiles: (files: string[]) => Promise<void>;
  savePatch: (sha: string, outputDir: string) => Promise<void>;
  applyPatch: (patchFile: string) => Promise<void>;
  getFileHistory: (file: string, limit: number) => Promise<Commit[]>;
  getCommitChildren: (sha: string) => Promise<Commit[]>;
  stashShow: (index: number) => Promise<string>;
  editRemote: (name: string, newUrl: string) => Promise<void>;
  deleteRemoteTag: (name: string, remote: string) => Promise<void>;
  getGitVersion: () => Promise<string>;
  openInFileManager: (path: string) => Promise<void>;
  openInTerminal: (path: string) => Promise<void>;
  openInBrowser: (url: string) => Promise<void>;

  // LFS actions
  lfsIsAvailable: () => Promise<boolean>;
  lfsTrack: (pattern: string) => Promise<void>;
  lfsUntrack: (pattern: string) => Promise<void>;
  lfsListTracks: () => Promise<string[]>;
  lfsFetch: (remote?: string, include?: string, exclude?: string) => Promise<void>;
  lfsPull: (remote?: string, include?: string, exclude?: string) => Promise<void>;
  lfsPush: (remote?: string, include?: string, exclude?: string, all?: boolean) => Promise<void>;
  lfsPrune: (dryRun?: boolean) => Promise<string>;
  lfsLock: (file: string) => Promise<void>;
  lfsUnlock: (file: string, force?: boolean) => Promise<void>;
  lfsListLocks: () => Promise<LfsLock[]>;

  // Rebase additional
  rebaseEditMessage: (message: string) => Promise<void>;
  startInteractiveRebase: (onto?: string) => Promise<void>;
  startInteractiveRebaseWithTodos: (path: string, todos: Array<{ hash: string; action: string }>) => Promise<void>;

  // Branch additional
  queryTrackStatus: (branch: string) => Promise<any>;

  // Submodule additional
  deinitSubmodule: (name: string) => Promise<void>;
  setSubmoduleBranch: (name: string, branch: string) => Promise<void>;
  changeSubmoduleUrl: (name: string, url: string) => Promise<void>;

  // Diff additional
  diffRevisionFiles: (oldRef: string, newRef: string) => Promise<any[]>;
  queryFileContent: (refName: string, filePath: string) => Promise<string>;

  // Statistics additional
  runGc: (aggressive?: boolean, prune?: boolean) => Promise<string>;

  // Platform additional
  findGitExecutable: () => Promise<string>;
  findExternalTools: () => Promise<any[]>;

  // Avatar
  getAvatar: (email: string, name: string) => Promise<string | null>;

  // Mirror
  testMirrorLatency: (url: string) => Promise<number>;
  getMirrorUrl: (originalUrl: string, mirrorType: string) => Promise<string>;

  // AI
  aiGenerateCommitMessage: (diffText: string, provider: string, apiUrl: string, apiKey: string, model: string, extraPrompt: string) => Promise<string>;
  aiFetchModels: (provider: string, apiUrl: string, apiKey: string) => Promise<string[]>;

  // PR
  detectPlatform: (remoteUrl: string) => Promise<string>;
  createPullRequest: (config: { platform: string; apiUrl: string; token: string; owner: string; repo: string; title: string; body: string; head: string; base: string }) => Promise<string>;

  // GitFlow
  gitflowInit: (params: { master?: string; develop?: string; feature?: string; release?: string; hotfix?: string; support?: string; versionTagPrefix?: string }) => Promise<void>;
  gitflowStart: (params: { branchType: string; name: string; base?: string }) => Promise<void>;
  gitflowFinish: (params: { branchType: string; name: string; fetch?: boolean; rebase?: boolean; keepBranch?: boolean; push?: boolean; message?: string }) => Promise<void>;
  gitflowList: () => Promise<any>;

  // Bisect
  bisectStart: (params: { bad?: string; good?: string }) => Promise<void>;
  bisectMark: (params: { state: string; revision?: string }) => Promise<any>;
  bisectReset: () => Promise<void>;
  bisectLog: () => Promise<string>;
  bisectStatus: () => Promise<any>;

  // Custom Action
  executeCustomAction: (params: { action: any; variableValues: Record<string, string> }) => Promise<string>;

  // Repo Config
  getRepoConfig: () => Promise<any>;
  saveRepoConfig: (config: any) => Promise<void>;

  // Command Log
  getCommandLogs: (offset?: number, limit?: number) => Promise<any[]>;
  clearCommandLogs: () => Promise<void>;

  // App
  getAppVersion: () => Promise<string>;

  // Selection
  setSelectedCommitId: (id: string | null) => void;
}

const initialLoading = {
  commits: false,
  branches: false,
  tags: false,
  remotes: false,
  stashes: false,
  status: false,
  diff: false,
  blame: false,
  commitDetail: false,
  worktrees: false,
  statistics: false,
  inProgress: false,
};

const initialErrors = {
  commits: null,
  branches: null,
  tags: null,
  remotes: null,
  stashes: null,
  status: null,
  diff: null,
  blame: null,
  commitDetail: null,
  worktrees: null,
  statistics: null,
  inProgress: null,
};

/** Helper to get the current repo path, throwing if not set */
function requirePath(store: GitStore): string {
  const path = store.repoPath;
  if (!path) throw new Error('No repository path set');
  return path;
}

export const useGitStore = create<GitStore>((set, get) => ({
  repoPath: null,
  setRepoPath: (path: string | null) => set({ repoPath: path }),

  commits: [],
  branches: [],
  tags: [],
  remotes: [],
  stashes: [],
  status: null,
  diff: null,
  blame: null,
  selectedCommitId: null,
  commitDetail: null,
  worktrees: [],
  statistics: null,
  inProgress: null,
  loading: { ...initialLoading },
  errors: { ...initialErrors },

  fetchCommits: async (params?: LogParams) => {
    const path = requirePath(get());
    set((s) => ({ loading: { ...s.loading, commits: true }, errors: { ...s.errors, commits: null } }));
    try {
      const commits: Commit[] = await dedupedInvoke('git_get_commits', {
        path,
        branch: params?.path ?? null,
        limit: params?.max_count ?? 200,
        offset: params?.skip ?? 0,
      });
      set({ commits });
    } catch (e) {
      set((s) => ({ errors: { ...s.errors, commits: String(e) } }));
    } finally {
      set((s) => ({ loading: { ...s.loading, commits: false } }));
    }
  },

  fetchBranches: async () => {
    const path = requirePath(get());
    set((s) => ({ loading: { ...s.loading, branches: true }, errors: { ...s.errors, branches: null } }));
    try {
      const branches: Branch[] = await dedupedInvoke('git_list_branches', { path });
      set({ branches });
    } catch (e) {
      set((s) => ({ errors: { ...s.errors, branches: String(e) } }));
    } finally {
      set((s) => ({ loading: { ...s.loading, branches: false } }));
    }
  },

  fetchTags: async () => {
    const path = requirePath(get());
    set((s) => ({ loading: { ...s.loading, tags: true }, errors: { ...s.errors, tags: null } }));
    try {
      const tags: Tag[] = await dedupedInvoke('git_list_tags', { path });
      set({ tags });
    } catch (e) {
      set((s) => ({ errors: { ...s.errors, tags: String(e) } }));
    } finally {
      set((s) => ({ loading: { ...s.loading, tags: false } }));
    }
  },

  fetchRemotes: async () => {
    const path = requirePath(get());
    set((s) => ({ loading: { ...s.loading, remotes: true }, errors: { ...s.errors, remotes: null } }));
    try {
      const remotes: Remote[] = await dedupedInvoke('git_get_remotes', { path });
      set({ remotes });
    } catch (e) {
      set((s) => ({ errors: { ...s.errors, remotes: String(e) } }));
    } finally {
      set((s) => ({ loading: { ...s.loading, remotes: false } }));
    }
  },

  fetchStashes: async () => {
    const path = requirePath(get());
    set((s) => ({ loading: { ...s.loading, stashes: true }, errors: { ...s.errors, stashes: null } }));
    try {
      const stashes: Stash[] = await dedupedInvoke('git_list_stash', { path });
      set({ stashes });
    } catch (e) {
      set((s) => ({ errors: { ...s.errors, stashes: String(e) } }));
    } finally {
      set((s) => ({ loading: { ...s.loading, stashes: false } }));
    }
  },

  fetchStatus: async () => {
    const path = requirePath(get());
    set((s) => ({ loading: { ...s.loading, status: true }, errors: { ...s.errors, status: null } }));
    try {
      const status: Status = await dedupedInvoke('git_get_status', { path });
      set({ status });
    } catch (e) {
      set((s) => ({ errors: { ...s.errors, status: String(e) } }));
    } finally {
      set((s) => ({ loading: { ...s.loading, status: false } }));
    }
  },

  fetchDiff: async (params: DiffParams) => {
    const path = requirePath(get());
    set((s) => ({ loading: { ...s.loading, diff: true }, errors: { ...s.errors, diff: null } }));
    try {
      const diff: string = await dedupedInvoke('git_get_diff', {
        path,
        old_ref: params.commit1 ?? null,
        new_ref: params.commit2 ?? null,
        path_filter: params.path ?? null,
        ignore_whitespace: params.ignoreWhitespace ?? null,
        context_lines: params.contextLines ?? null,
      });
      set({ diff });
    } catch (e) {
      set((s) => ({ errors: { ...s.errors, diff: String(e) } }));
    } finally {
      set((s) => ({ loading: { ...s.loading, diff: false } }));
    }
  },

  fetchDiffStaged: async (file?: string) => {
    const path = requirePath(get());
    set((s) => ({ loading: { ...s.loading, diff: true }, errors: { ...s.errors, diff: null } }));
    try {
      const diff: string = await dedupedInvoke('git_get_diff_staged', { path, file: file ?? null });
      set({ diff });
    } catch (e) {
      set((s) => ({ errors: { ...s.errors, diff: String(e) } }));
    } finally {
      set((s) => ({ loading: { ...s.loading, diff: false } }));
    }
  },

  fetchDiffUnstaged: async (file?: string) => {
    const path = requirePath(get());
    set((s) => ({ loading: { ...s.loading, diff: true }, errors: { ...s.errors, diff: null } }));
    try {
      const diff: string = await dedupedInvoke('git_get_diff_unstaged', { path, file: file ?? null });
      set({ diff });
    } catch (e) {
      set((s) => ({ errors: { ...s.errors, diff: String(e) } }));
    } finally {
      set((s) => ({ loading: { ...s.loading, diff: false } }));
    }
  },

  fetchBlame: async (params: BlameParams) => {
    const path = requirePath(get());
    set((s) => ({ loading: { ...s.loading, blame: true }, errors: { ...s.errors, blame: null } }));
    try {
      // Backend returns Vec<BlameLine>, wrap into BlameResult
      const lines = (await dedupedInvoke('git_blame', {
        path,
        file: params.path,
        line_start: params.lines?.start ?? null,
        line_end: params.lines?.end ?? null,
      })) as BlameLine[];
      const blame: BlameResult = { path: params.path, lines };
      set({ blame });
    } catch (e) {
      set((s) => ({ errors: { ...s.errors, blame: String(e) } }));
    } finally {
      set((s) => ({ loading: { ...s.loading, blame: false } }));
    }
  },

  fetchCommitDetail: async (sha: string) => {
    const path = requirePath(get());
    set((s) => ({ loading: { ...s.loading, commitDetail: true }, errors: { ...s.errors, commitDetail: null } }));
    try {
      const detail: CommitDetail = await dedupedInvoke('git_get_commit_detail', { path, sha });
      set({ commitDetail: detail });
    } catch (e) {
      set((s) => ({ errors: { ...s.errors, commitDetail: String(e) } }));
    } finally {
      set((s) => ({ loading: { ...s.loading, commitDetail: false } }));
    }
  },

  fetchWorktrees: async () => {
    const path = requirePath(get());
    set((s) => ({ loading: { ...s.loading, worktrees: true }, errors: { ...s.errors, worktrees: null } }));
    try {
      const worktrees: Worktree[] = await dedupedInvoke('git_list_worktrees', { path });
      set({ worktrees });
    } catch (e) {
      set((s) => ({ errors: { ...s.errors, worktrees: String(e) } }));
    } finally {
      set((s) => ({ loading: { ...s.loading, worktrees: false } }));
    }
  },

  fetchStatistics: async (since?: string) => {
    const path = requirePath(get());
    set((s) => ({ loading: { ...s.loading, statistics: true }, errors: { ...s.errors, statistics: null } }));
    try {
      const stats: RepositoryStats = await dedupedInvoke('git_get_statistics', { path, since: since ?? null });
      set({ statistics: stats });
    } catch (e) {
      set((s) => ({ errors: { ...s.errors, statistics: String(e) } }));
    } finally {
      set((s) => ({ loading: { ...s.loading, statistics: false } }));
    }
  },

  fetchAll: async () => {
    await Promise.all([
      get().fetchCommits(),
      get().fetchBranches(),
      get().fetchTags(),
      get().fetchRemotes(),
      get().fetchStashes(),
      get().fetchStatus(),
    ]);
  },

  commit: async (params: CommitParams) => {
    const path = requirePath(get());
    await dedupedInvoke('git_commit', {
      path,
      message: params.message,
      amend: params.amend,
      signoff: false,
      no_verify: false,
    });
    await get().fetchAll();
  },

  stage: async (params: StageParams) => {
    const path = requirePath(get());
    await dedupedInvoke('git_stage', { path, files: params.paths });
    await get().fetchStatus();
  },

  unstage: async (params: UnstageParams) => {
    const path = requirePath(get());
    await dedupedInvoke('git_unstage', { path, files: params.paths });
    await get().fetchStatus();
  },

  stageAll: async () => {
    const path = requirePath(get());
    await dedupedInvoke('git_stage_all', { path });
    await get().fetchStatus();
  },

  unstageAll: async () => {
    const path = requirePath(get());
    await dedupedInvoke('git_unstage_all', { path });
    await get().fetchStatus();
  },

  stageHunk: async (file: string, patch: string) => {
    const path = requirePath(get());
    await dedupedInvoke('git_stage_hunk', { path, file, patch_text: patch });
    await get().fetchStatus();
  },

  unstageHunk: async (file: string, patch: string) => {
    const path = requirePath(get());
    await dedupedInvoke('git_unstage_hunk', { path, file, patch_text: patch });
    await get().fetchStatus();
  },

  checkout: async (params: CheckoutParams) => {
    const path = requirePath(get());
    await dedupedInvoke('git_checkout_branch', { path, name: params.branch });
    await get().fetchAll();
  },

  discard: async (paths: string[]) => {
    const path = requirePath(get());
    await dedupedInvoke('git_discard_changes', { path, files: paths });
    await get().fetchStatus();
  },

  fetchRemote: async (params: FetchParams) => {
    const path = requirePath(get());
    const appHandle = getCurrentWebviewWindow();
    await dedupedInvoke('git_fetch', {
      path,
      remote: params.remote || null,
      prune: params.prune,
      tags: false,
      depth: null,
      appHandle,
    });
    await get().fetchBranches();
    await get().fetchTags();
  },

  pull: async (params: PullParams) => {
    const path = requirePath(get());
    const appHandle = getCurrentWebviewWindow();
    await dedupedInvoke('git_pull', {
      path,
      remote: params.remote || null,
      branch: params.branch || null,
      rebase: params.rebase,
      ff_only: false,
      autostash: false,
      appHandle,
    });
    await get().fetchAll();
  },

  push: async (params: PushParams) => {
    const path = requirePath(get());
    const appHandle = getCurrentWebviewWindow();
    await dedupedInvoke('git_push', {
      path,
      remote: params.remote || null,
      branch: params.branch || null,
      force: params.force,
      force_with_lease: false,
      set_upstream: params.upstream,
      tags: false,
      appHandle,
    });
    await get().fetchBranches();
    await get().fetchStatus();
  },

  stash: async (params: StashParams) => {
    const path = requirePath(get());
    await dedupedInvoke('git_push_stash', {
      path,
      message: params.message || null,
      keep_index: params.keep_index,
      include_untracked: params.include_untracked,
    });
    await get().fetchStashes();
    await get().fetchStatus();
  },

  stashPop: async (params: StashPopParams) => {
    const path = requirePath(get());
    await dedupedInvoke('git_pop_stash', { path, index: params.index });
    await get().fetchStashes();
    await get().fetchStatus();
  },

  stashDrop: async (params: StashDropParams) => {
    const path = requirePath(get());
    await dedupedInvoke('git_drop_stash', { path, index: params.index });
    await get().fetchStashes();
  },

  applyStash: async (index: number) => {
    const path = requirePath(get());
    await dedupedInvoke('git_apply_stash', { path, index });
    await get().fetchStatus();
  },

  clearStash: async () => {
    const path = requirePath(get());
    await dedupedInvoke('git_clear_stash', { path });
    await get().fetchStashes();
  },

  reset: async (params: ResetParams) => {
    const path = requirePath(get());
    await dedupedInvoke('git_reset', { path, sha: params.commit, mode: params.mode });
    await get().fetchAll();
  },

  cherryPick: async (params: CherryPickParams) => {
    const path = requirePath(get());
    // Backend takes a single sha, cherry-pick each commit in sequence
    for (const sha of params.commits) {
      await dedupedInvoke('git_cherry_pick', { path, sha });
    }
    await get().fetchAll();
  },

  cherryPickContinue: async () => {
    const path = requirePath(get());
    await dedupedInvoke('git_cherry_pick_continue', { path });
    await get().fetchAll();
  },

  cherryPickAbort: async () => {
    const path = requirePath(get());
    await dedupedInvoke('git_cherry_pick_abort', { path });
    await get().fetchAll();
  },

  merge: async (params: MergeParams) => {
    const path = requirePath(get());
    await dedupedInvoke('git_merge', {
      path,
      branch: params.branch,
      strategy: null,
      ff_mode: params.ff,
    });
    await get().fetchAll();
  },

  abortMerge: async () => {
    const path = requirePath(get());
    await dedupedInvoke('git_abort_merge', { path });
    await get().fetchAll();
  },

  createBranch: async (params: BranchCreateParams) => {
    const path = requirePath(get());
    await dedupedInvoke('git_create_branch', {
      path,
      name: params.name,
      ref_name: params.ref || null,
    });
    await get().fetchBranches();
  },

  deleteBranch: async (params: BranchDeleteParams) => {
    const path = requirePath(get());
    await dedupedInvoke('git_delete_branch', { path, name: params.name, force: params.force });
    await get().fetchBranches();
  },

  renameBranch: async (oldName: string, newName: string) => {
    const path = requirePath(get());
    await dedupedInvoke('git_rename_branch', { path, old_name: oldName, new_name: newName });
    await get().fetchBranches();
  },

  setUpstream: async (branch: string, remoteBranch: string) => {
    const path = requirePath(get());
    await dedupedInvoke('git_set_upstream', { path, branch, remote_branch: remoteBranch });
    await get().fetchBranches();
  },

  createTag: async (params: TagCreateParams) => {
    const path = requirePath(get());
    await dedupedInvoke('git_create_tag', {
      path,
      name: params.name,
      message: params.message || null,
      ref_name: params.commit || null,
    });
    await get().fetchTags();
  },

  deleteTag: async (params: TagDeleteParams) => {
    const path = requirePath(get());
    await dedupedInvoke('git_delete_tag', { path, name: params.name });
    await get().fetchTags();
  },

  pushTag: async (name: string, remote: string) => {
    const path = requirePath(get());
    await dedupedInvoke('git_push_tag', { path, name, remote });
    await get().fetchTags();
  },

  addRemote: async (params: RemoteAddParams) => {
    const path = requirePath(get());
    await dedupedInvoke('git_add_remote', { path, name: params.name, url: params.url });
    await get().fetchRemotes();
  },

  removeRemote: async (params: RemoteRemoveParams) => {
    const path = requirePath(get());
    await dedupedInvoke('git_remove_remote', { path, name: params.name });
    await get().fetchRemotes();
  },

  pruneRemote: async (name: string) => {
    const path = requirePath(get());
    await dedupedInvoke('git_prune_remote', { path, name });
    await get().fetchRemotes();
  },

  revert: async (sha: string) => {
    const path = requirePath(get());
    await dedupedInvoke('git_revert', { path, sha });
    await get().fetchAll();
  },

  rebase: async (onto?: string, branch?: string) => {
    const path = requirePath(get());
    const appHandle = getCurrentWebviewWindow();
    await dedupedInvoke('git_rebase', {
      path,
      onto: onto ?? null,
      branch: branch ?? null,
      appHandle,
    });
    await get().fetchAll();
  },

  rebaseContinue: async () => {
    const path = requirePath(get());
    await dedupedInvoke('git_rebase_continue', { path });
    await get().fetchAll();
  },

  rebaseSkip: async () => {
    const path = requirePath(get());
    await dedupedInvoke('git_rebase_skip', { path });
    await get().fetchAll();
  },

  rebaseAbort: async () => {
    const path = requirePath(get());
    await dedupedInvoke('git_rebase_abort', { path });
    await get().fetchAll();
  },

  getConfig: async (key: string) => {
    const path = requirePath(get());
    return await dedupedInvoke('git_get_config', { path, key });
  },

  setConfig: async (key: string, value: string) => {
    const path = requirePath(get());
    await dedupedInvoke('git_set_config', { path, key, value });
  },

  addWorktree: async (path: string, refName: string) => {
    const repoPath = requirePath(get());
    await dedupedInvoke('git_add_worktree', { path: repoPath, worktree_path: path, ref_name: refName, branch: null, create_branch: true });
    await get().fetchWorktrees();
  },

  removeWorktree: async (path: string, force: boolean) => {
    const repoPath = requirePath(get());
    await dedupedInvoke('git_remove_worktree', { path: repoPath, worktree_path: path, force });
    await get().fetchWorktrees();
  },

  pruneWorktrees: async () => {
    const path = requirePath(get());
    await dedupedInvoke('git_prune_worktrees', { path });
    await get().fetchWorktrees();
  },

  createArchive: async (output: string, refName: string, format: string) => {
    const path = requirePath(get());
    await dedupedInvoke('git_create_archive', { path, output, ref_name: refName, format });
  },

  listSubmodules: async () => {
    const path = requirePath(get());
    const submodules = await dedupedInvoke('git_list_submodules', { path });
    // Store result if needed; for now just fetches
    console.log('Submodules:', submodules);
  },

  addSubmodule: async (url: string, name?: string, branch?: string) => {
    const path = requirePath(get());
    await dedupedInvoke('git_add_submodule', {
      path,
      url,
      name: name ?? null,
      branch: branch ?? null,
    });
  },

  updateSubmodule: async (name?: string, init?: boolean, recursive?: boolean) => {
    const path = requirePath(get());
    await dedupedInvoke('git_update_submodule', {
      path,
      name: name ?? null,
      init: init ?? false,
      recursive: recursive ?? true,
    });
  },

  setSelectedCommitId: (id: string | null) => {
    set({ selectedCommitId: id });
  },

  fetchInProgress: async () => {
    const path = requirePath(get());
    set((s) => ({ loading: { ...s.loading, inProgress: true }, errors: { ...s.errors, inProgress: null } }));
    try {
      const operationTypeMap: Record<string, InProgressState['type']> = {
        'merge': 'merge',
        'rebase': 'rebase',
        'rebase-merge': 'rebase',
        'rebase-apply': 'rebase',
        'cherry-pick': 'cherry_pick',
        'revert': 'revert',
        'bisect': 'bisect',
      };
      const raw = await dedupedInvoke<{ operation: string; detail: string | null }>('git_get_in_progress', { path });
      const state: InProgressState = raw ? {
        type: operationTypeMap[raw.operation] || 'none',
        details: raw.detail || '',
      } : { type: 'none', details: '' };
      set({ inProgress: state });
    } catch (e) {
      set((s) => ({ errors: { ...s.errors, inProgress: String(e) } }));
    } finally {
      set((s) => ({ loading: { ...s.loading, inProgress: false } }));
    }
  },

  searchCommits: async (params: SearchParams) => {
    const path = requirePath(get());
    return await dedupedInvoke('git_search_commits', {
      path,
      query: params.query ?? null,
      author: params.author ?? null,
      since: params.since ?? null,
      until: params.until ?? null,
      limit: params.limit ?? 100,
    });
  },

  getMergeConflicts: async () => {
    const path = requirePath(get());
    return await dedupedInvoke('git_get_merge_conflicts', { path });
  },

  assumeUnchanged: async (files: string[], enable: boolean) => {
    const path = requirePath(get());
    await dedupedInvoke('git_assume_unchanged', { path, files, enable });
    await get().fetchStatus();
  },

  skipWorktree: async (files: string[], enable: boolean) => {
    const path = requirePath(get());
    await dedupedInvoke('git_skip_worktree', { path, files, enable });
    await get().fetchStatus();
  },

  addToGitignore: async (patterns: string[]) => {
    const path = requirePath(get());
    await dedupedInvoke('git_add_to_gitignore', { path, patterns });
  },

  deleteFiles: async (files: string[]) => {
    const path = requirePath(get());
    await dedupedInvoke('git_delete_files', { path, files });
    await get().fetchStatus();
  },

  savePatch: async (sha: string, outputDir: string) => {
    const path = requirePath(get());
    await dedupedInvoke('git_save_patch', { path, sha, output_dir: outputDir });
  },

  applyPatch: async (patchFile: string) => {
    const path = requirePath(get());
    await dedupedInvoke('git_apply_patch', { path, patch_file: patchFile });
    await get().fetchAll();
  },

  getFileHistory: async (file: string, limit: number) => {
    const path = requirePath(get());
    return await dedupedInvoke('git_get_file_history', { path, file, limit });
  },

  getCommitChildren: async (sha: string) => {
    const path = requirePath(get());
    return await dedupedInvoke('git_get_commit_children', { path, sha });
  },

  stashShow: async (index: number) => {
    const path = requirePath(get());
    return await dedupedInvoke('git_show_stash', { path, index });
  },

  editRemote: async (name: string, newUrl: string) => {
    const path = requirePath(get());
    await dedupedInvoke('git_edit_remote', { path, name, new_url: newUrl });
    await get().fetchRemotes();
  },

  deleteRemoteTag: async (name: string, remote: string) => {
    const path = requirePath(get());
    await dedupedInvoke('git_delete_remote_tag', { path, name, remote });
    await get().fetchTags();
  },

  getGitVersion: async () => {
    return await dedupedInvoke('git_get_version');
  },

  openInFileManager: async (path: string) => {
    await dedupedInvoke('git_open_in_file_manager', { path });
  },

  openInTerminal: async (path: string) => {
    await dedupedInvoke('git_open_in_terminal', { path });
  },

  openInBrowser: async (url: string) => {
    await dedupedInvoke('git_open_in_browser', { url });
  },

  lfsIsAvailable: async () => {
    return await invoke<boolean>('git_lfs_is_available');
  },

  lfsTrack: async (pattern: string) => {
    const path = requirePath(get());
    await dedupedInvoke('git_lfs_track', { path, pattern });
  },

  lfsUntrack: async (pattern: string) => {
    const path = requirePath(get());
    await dedupedInvoke('git_lfs_untrack', { path, pattern });
  },

  lfsListTracks: async () => {
    const path = requirePath(get());
    return await invoke<string[]>('git_lfs_list_tracks', { path });
  },

  lfsFetch: async (remote?: string, include?: string, exclude?: string) => {
    const path = requirePath(get());
    await dedupedInvoke('git_lfs_fetch', {
      path,
      remote: remote ?? null,
      include: include ?? null,
      exclude: exclude ?? null,
    });
  },

  lfsPull: async (remote?: string, include?: string, exclude?: string) => {
    const path = requirePath(get());
    await dedupedInvoke('git_lfs_pull', {
      path,
      remote: remote ?? null,
      include: include ?? null,
      exclude: exclude ?? null,
    });
  },

  lfsPush: async (remote?: string, include?: string, exclude?: string, all?: boolean) => {
    const path = requirePath(get());
    await dedupedInvoke('git_lfs_push', {
      path,
      remote: remote ?? null,
      include: include ?? null,
      exclude: exclude ?? null,
      all: all ?? false,
    });
  },

  lfsPrune: async (dryRun?: boolean) => {
    const path = requirePath(get());
    return await invoke<string>('git_lfs_prune', { path, dry_run: dryRun ?? false });
  },

  lfsLock: async (file: string) => {
    const path = requirePath(get());
    await dedupedInvoke('git_lfs_lock', { path, file });
  },

  lfsUnlock: async (file: string, force?: boolean) => {
    const path = requirePath(get());
    await dedupedInvoke('git_lfs_unlock', { path, file, force: force ?? false });
  },

  lfsListLocks: async () => {
    const path = requirePath(get());
    return await invoke<LfsLock[]>('git_lfs_list_locks', { path });
  },

  // === Rebase additional ===

  rebaseEditMessage: async (message: string) => {
    const path = requirePath(get());
    await dedupedInvoke('git_rebase_edit_message', { path, message });
    await get().fetchAll();
  },

  startInteractiveRebase: async (onto?: string) => {
    const path = requirePath(get());
    const appHandle = getCurrentWebviewWindow();
    await dedupedInvoke('git_start_interactive_rebase', {
      path,
      onto: onto ?? null,
      appHandle,
    });
    await get().fetchAll();
  },

  startInteractiveRebaseWithTodos: async (path: string, todos: Array<{ hash: string; action: string }>) => {
    const repoPath = requirePath(get());
    const todoText = todos.map((t) => `${t.action} ${t.hash}`).join('\n');
    const appHandle = getCurrentWebviewWindow();
    await dedupedInvoke('git_start_interactive_rebase_with_todos', {
      path: repoPath,
      onto: path,
      todo_text: todoText,
      appHandle,
    });
    await get().fetchAll();
  },

  // === Branch additional ===

  queryTrackStatus: async (branch: string) => {
    const path = requirePath(get());
    return await dedupedInvoke('git_query_track_status', { path, branch });
  },

  // === Submodule additional ===

  deinitSubmodule: async (name: string) => {
    const path = requirePath(get());
    await dedupedInvoke('git_deinit_submodule', { path, name });
  },

  setSubmoduleBranch: async (name: string, branch: string) => {
    const path = requirePath(get());
    await dedupedInvoke('git_set_submodule_branch', { path, name, branch });
  },

  changeSubmoduleUrl: async (name: string, url: string) => {
    const path = requirePath(get());
    await dedupedInvoke('git_change_submodule_url', { path, name, url });
  },

  // === Diff additional ===

  diffRevisionFiles: async (oldRef: string, newRef: string) => {
    const path = requirePath(get());
    return await dedupedInvoke('git_diff_revision_files', { path, old_ref: oldRef, new_ref: newRef });
  },

  queryFileContent: async (refName: string, filePath: string) => {
    const path = requirePath(get());
    return await dedupedInvoke('git_query_file_content', { path, ref_name: refName, file_path: filePath });
  },

  // === Statistics additional ===

  runGc: async (aggressive?: boolean, prune?: boolean) => {
    const path = requirePath(get());
    return await dedupedInvoke('git_run_gc', {
      path,
      aggressive: aggressive ?? false,
      prune: prune ?? false,
    });
  },

  // === Platform additional ===

  findGitExecutable: async () => {
    return await dedupedInvoke('git_find_git_executable');
  },

  findExternalTools: async () => {
    return await dedupedInvoke('git_find_external_tools');
  },

  // === Avatar ===

  getAvatar: async (email: string, name: string) => {
    return await dedupedInvoke<string | null>('get_avatar', { email, name });
  },

  // === Mirror ===

  testMirrorLatency: async (url: string) => {
    return await dedupedInvoke<number>('test_mirror_latency', { url });
  },

  getMirrorUrl: async (originalUrl: string, mirrorType: string) => {
    return await dedupedInvoke('get_mirror_url', { original_url: originalUrl, mirror_type: mirrorType });
  },

  // === AI ===

  aiGenerateCommitMessage: async (
    diffText: string,
    provider: string,
    apiUrl: string,
    apiKey: string,
    model: string,
    extraPrompt: string,
  ) => {
    const path = requirePath(get());
    return await dedupedInvoke('ai_generate_commit_message', {
      repo_path: path,
      diff_text: diffText,
      provider,
      api_url: apiUrl,
      api_key: apiKey,
      model,
      extra_prompt: extraPrompt,
    });
  },

  aiFetchModels: async (provider: string, apiUrl: string, apiKey: string) => {
    return await dedupedInvoke<string[]>('ai_fetch_models', { provider, api_url: apiUrl, api_key: apiKey });
  },

  // === PR ===

  detectPlatform: async (remoteUrl: string) => {
    return await dedupedInvoke('detect_platform', { remote_url: remoteUrl });
  },

  createPullRequest: async (config: {
    platform: string;
    apiUrl: string;
    token: string;
    owner: string;
    repo: string;
    title: string;
    body: string;
    head: string;
    base: string;
  }) => {
    return await dedupedInvoke('create_pull_request', {
      platform: config.platform,
      api_url: config.apiUrl,
      token: config.token,
      owner: config.owner,
      repo: config.repo,
      title: config.title,
      body: config.body,
      head: config.head,
      base: config.base,
    });
  },

  // === GitFlow ===

  gitflowInit: async (params: {
    master?: string;
    develop?: string;
    feature?: string;
    release?: string;
    hotfix?: string;
    support?: string;
    versionTagPrefix?: string;
  }) => {
    const path = requirePath(get());
    const branches = {
      master: params.master ?? 'master',
      develop: params.develop ?? 'develop',
      feature: params.feature ?? 'feature/',
      release: params.release ?? 'release/',
      hotfix: params.hotfix ?? 'hotfix/',
      support: params.support ?? 'support/',
      version_tag_prefix: params.versionTagPrefix ?? '',
    };
    await dedupedInvoke('gitflow_init', { path, branches });
    await get().fetchBranches();
  },

  gitflowStart: async (params: { branchType: string; name: string; base?: string }) => {
    const path = requirePath(get());
    await dedupedInvoke('gitflow_start', {
      path,
      branch_type: params.branchType,
      name: params.name,
      base: params.base ?? null,
    });
    await get().fetchBranches();
  },

  gitflowFinish: async (params: {
    branchType: string;
    name: string;
    fetch?: boolean;
    rebase?: boolean;
    keepBranch?: boolean;
    push?: boolean;
    message?: string;
  }) => {
    const path = requirePath(get());
    const options = {
      fetch: params.fetch ?? false,
      rebase: params.rebase ?? false,
      keep_branch: params.keepBranch ?? false,
      push: params.push ?? false,
      message: params.message ?? null,
    };
    await dedupedInvoke('gitflow_finish', {
      path,
      branch_type: params.branchType,
      name: params.name,
      options,
    });
    await get().fetchBranches();
  },

  gitflowList: async () => {
    const path = requirePath(get());
    return await dedupedInvoke('gitflow_list', { path });
  },

  // === Bisect ===

  bisectStart: async (params: { bad?: string; good?: string }) => {
    const path = requirePath(get());
    await dedupedInvoke('git_bisect_start', {
      path,
      bad: params.bad ?? null,
      good: params.good ?? null,
    });
  },

  bisectMark: async (params: { state: string; revision?: string }) => {
    const path = requirePath(get());
    return await dedupedInvoke('git_bisect_mark', {
      path,
      state: params.state,
      revision: params.revision ?? null,
    });
  },

  bisectReset: async () => {
    const path = requirePath(get());
    await dedupedInvoke('git_bisect_reset', { path });
    await get().fetchAll();
  },

  bisectLog: async () => {
    const path = requirePath(get());
    return await dedupedInvoke('git_bisect_log', { path });
  },

  bisectStatus: async () => {
    const path = requirePath(get());
    return await dedupedInvoke('git_bisect_status', { path });
  },

  // === Custom Action ===

  executeCustomAction: async (params: { action: any; variableValues: Record<string, string> }) => {
    const path = requirePath(get());
    const appHandle = getCurrentWebviewWindow();
    return await dedupedInvoke('git_execute_custom_action', {
      path,
      action: params.action,
      variable_values: params.variableValues,
      appHandle,
    });
  },

  // === Repo Config ===

  getRepoConfig: async () => {
    const path = requirePath(get());
    return await dedupedInvoke('git_get_repo_config', { path });
  },

  saveRepoConfig: async (config: any) => {
    const path = requirePath(get());
    await dedupedInvoke('git_save_repo_config', { path, config });
  },

  // === Command Log ===

  getCommandLogs: async (offset?: number, limit?: number) => {
    return await dedupedInvoke('git_get_command_logs', {
      limit: limit ?? 100,
      offset: offset ?? 0,
    });
  },

  clearCommandLogs: async () => {
    await dedupedInvoke('git_clear_command_logs');
  },

  // === App ===

  getAppVersion: async () => {
    return await dedupedInvoke('git_get_app_version');
  },
}));
