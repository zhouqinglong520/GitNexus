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
  fetchStatistics: () => Promise<void>;
  fetchInProgress: () => Promise<void>;
  fetchAll: () => Promise<void>;

  // Mutation actions
  commit: (params: CommitParams) => Promise<void>;
  stage: (params: StageParams) => Promise<void>;
  unstage: (params: UnstageParams) => Promise<void>;
  stageAll: () => Promise<void>;
  unstageAll: () => Promise<void>;
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
      const commits: Commit[] = await invoke('git_get_commits', {
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
      const branches: Branch[] = await invoke('git_list_branches', { path });
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
      const tags: Tag[] = await invoke('git_list_tags', { path });
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
      const remotes: Remote[] = await invoke('git_get_remotes', { path });
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
      const stashes: Stash[] = await invoke('git_list_stash', { path });
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
      const status: Status = await invoke('git_get_status', { path });
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
      const diff: string = await invoke('git_get_diff', {
        path,
        oldRef: params.commit1 ?? null,
        newRef: params.commit2 ?? null,
        pathFilter: params.path ?? null,
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
      const diff: string = await invoke('git_get_diff_staged', { path, file: file ?? null });
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
      const diff: string = await invoke('git_get_diff_unstaged', { path, file: file ?? null });
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
      const lines = (await invoke('git_blame', {
        path,
        file: params.path,
        lineStart: params.lines?.start ?? null,
        lineEnd: params.lines?.end ?? null,
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
      const detail: CommitDetail = await invoke('git_get_commit_detail', { path, sha });
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
      const worktrees: Worktree[] = await invoke('git_list_worktrees', { path });
      set({ worktrees });
    } catch (e) {
      set((s) => ({ errors: { ...s.errors, worktrees: String(e) } }));
    } finally {
      set((s) => ({ loading: { ...s.loading, worktrees: false } }));
    }
  },

  fetchStatistics: async () => {
    const path = requirePath(get());
    set((s) => ({ loading: { ...s.loading, statistics: true }, errors: { ...s.errors, statistics: null } }));
    try {
      const stats: RepositoryStats = await invoke('git_get_statistics', { path });
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
    await invoke('git_commit', {
      path,
      message: params.message,
      amend: params.amend,
      signoff: false,
      noVerify: false,
    });
    await get().fetchAll();
  },

  stage: async (params: StageParams) => {
    const path = requirePath(get());
    await invoke('git_stage', { path, files: params.paths });
    await get().fetchStatus();
  },

  unstage: async (params: UnstageParams) => {
    const path = requirePath(get());
    await invoke('git_unstage', { path, files: params.paths });
    await get().fetchStatus();
  },

  stageAll: async () => {
    const path = requirePath(get());
    await invoke('git_stage_all', { path });
    await get().fetchStatus();
  },

  unstageAll: async () => {
    const path = requirePath(get());
    await invoke('git_unstage_all', { path });
    await get().fetchStatus();
  },

  checkout: async (params: CheckoutParams) => {
    const path = requirePath(get());
    await invoke('git_checkout_branch', { path, name: params.branch });
    await get().fetchAll();
  },

  discard: async (paths: string[]) => {
    const path = requirePath(get());
    await invoke('git_discard_changes', { path, files: paths });
    await get().fetchStatus();
  },

  fetchRemote: async (params: FetchParams) => {
    const path = requirePath(get());
    const appHandle = getCurrentWebviewWindow();
    await invoke('git_fetch', {
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
    await invoke('git_pull', {
      path,
      remote: params.remote || null,
      branch: params.branch || null,
      rebase: params.rebase,
      ffOnly: false,
      autostash: false,
      appHandle,
    });
    await get().fetchAll();
  },

  push: async (params: PushParams) => {
    const path = requirePath(get());
    const appHandle = getCurrentWebviewWindow();
    await invoke('git_push', {
      path,
      remote: params.remote || null,
      branch: params.branch || null,
      force: params.force,
      forceWithLease: false,
      setUpstream: params.upstream,
      tags: false,
      appHandle,
    });
    await get().fetchBranches();
    await get().fetchStatus();
  },

  stash: async (params: StashParams) => {
    const path = requirePath(get());
    // TODO: pass include_untracked once backend git_push_stash supports it
    await invoke('git_push_stash', {
      path,
      message: params.message || null,
      keepIndex: params.keep_index,
      // includeUntracked: params.include_untracked,
    });
    await get().fetchStashes();
    await get().fetchStatus();
  },

  stashPop: async (params: StashPopParams) => {
    const path = requirePath(get());
    await invoke('git_pop_stash', { path, index: params.index });
    await get().fetchStashes();
    await get().fetchStatus();
  },

  stashDrop: async (params: StashDropParams) => {
    const path = requirePath(get());
    await invoke('git_drop_stash', { path, index: params.index });
    await get().fetchStashes();
  },

  applyStash: async (index: number) => {
    const path = requirePath(get());
    await invoke('git_apply_stash', { path, index });
    await get().fetchStatus();
  },

  clearStash: async () => {
    const path = requirePath(get());
    await invoke('git_clear_stash', { path });
    await get().fetchStashes();
  },

  reset: async (params: ResetParams) => {
    const path = requirePath(get());
    await invoke('git_reset', { path, sha: params.commit, mode: params.mode });
    await get().fetchAll();
  },

  cherryPick: async (params: CherryPickParams) => {
    const path = requirePath(get());
    // Backend takes a single sha, cherry-pick each commit in sequence
    for (const sha of params.commits) {
      await invoke('git_cherry_pick', { path, sha });
    }
    await get().fetchAll();
  },

  cherryPickContinue: async () => {
    const path = requirePath(get());
    await invoke('git_cherry_pick_continue', { path });
    await get().fetchAll();
  },

  cherryPickAbort: async () => {
    const path = requirePath(get());
    await invoke('git_cherry_pick_abort', { path });
    await get().fetchAll();
  },

  merge: async (params: MergeParams) => {
    const path = requirePath(get());
    await invoke('git_merge', {
      path,
      branch: params.branch,
      strategy: null,
      ffMode: params.ff,
    });
    await get().fetchAll();
  },

  abortMerge: async () => {
    const path = requirePath(get());
    await invoke('git_abort_merge', { path });
    await get().fetchAll();
  },

  createBranch: async (params: BranchCreateParams) => {
    const path = requirePath(get());
    await invoke('git_create_branch', {
      path,
      name: params.name,
      refName: params.ref || null,
    });
    await get().fetchBranches();
  },

  deleteBranch: async (params: BranchDeleteParams) => {
    const path = requirePath(get());
    await invoke('git_delete_branch', { path, name: params.name, force: params.force });
    await get().fetchBranches();
  },

  renameBranch: async (oldName: string, newName: string) => {
    const path = requirePath(get());
    await invoke('git_rename_branch', { path, oldName, newName });
    await get().fetchBranches();
  },

  setUpstream: async (branch: string, remoteBranch: string) => {
    const path = requirePath(get());
    await invoke('git_set_upstream', { path, branch, remoteBranch });
    await get().fetchBranches();
  },

  createTag: async (params: TagCreateParams) => {
    const path = requirePath(get());
    await invoke('git_create_tag', {
      path,
      name: params.name,
      message: params.message || null,
      refName: params.commit || null,
    });
    await get().fetchTags();
  },

  deleteTag: async (params: TagDeleteParams) => {
    const path = requirePath(get());
    await invoke('git_delete_tag', { path, name: params.name });
    await get().fetchTags();
  },

  pushTag: async (name: string, remote: string) => {
    const path = requirePath(get());
    await invoke('git_push_tag', { path, name, remote });
    await get().fetchTags();
  },

  addRemote: async (params: RemoteAddParams) => {
    const path = requirePath(get());
    await invoke('git_add_remote', { path, name: params.name, url: params.url });
    await get().fetchRemotes();
  },

  removeRemote: async (params: RemoteRemoveParams) => {
    const path = requirePath(get());
    await invoke('git_remove_remote', { path, name: params.name });
    await get().fetchRemotes();
  },

  pruneRemote: async (name: string) => {
    const path = requirePath(get());
    await invoke('git_prune_remote', { path, name });
    await get().fetchRemotes();
  },

  revert: async (sha: string) => {
    const path = requirePath(get());
    await invoke('git_revert', { path, sha });
    await get().fetchAll();
  },

  rebase: async (onto?: string, branch?: string) => {
    const path = requirePath(get());
    const appHandle = getCurrentWebviewWindow();
    await invoke('git_rebase', {
      path,
      onto: onto ?? null,
      branch: branch ?? null,
      appHandle,
    });
    await get().fetchAll();
  },

  rebaseContinue: async () => {
    const path = requirePath(get());
    await invoke('git_rebase_continue', { path });
    await get().fetchAll();
  },

  rebaseSkip: async () => {
    const path = requirePath(get());
    await invoke('git_rebase_skip', { path });
    await get().fetchAll();
  },

  rebaseAbort: async () => {
    const path = requirePath(get());
    await invoke('git_rebase_abort', { path });
    await get().fetchAll();
  },

  getConfig: async (key: string) => {
    const path = requirePath(get());
    return await invoke('git_get_config', { path, key });
  },

  setConfig: async (key: string, value: string) => {
    const path = requirePath(get());
    await invoke('git_set_config', { path, key, value });
  },

  addWorktree: async (path: string, refName: string) => {
    const repoPath = requirePath(get());
    await invoke('git_add_worktree', { path: repoPath, worktreePath: path, refName });
    await get().fetchWorktrees();
  },

  removeWorktree: async (path: string, force: boolean) => {
    const repoPath = requirePath(get());
    await invoke('git_remove_worktree', { path: repoPath, worktreePath: path, force });
    await get().fetchWorktrees();
  },

  pruneWorktrees: async () => {
    const path = requirePath(get());
    await invoke('git_prune_worktrees', { path });
    await get().fetchWorktrees();
  },

  createArchive: async (output: string, refName: string, format: string) => {
    const path = requirePath(get());
    await invoke('git_create_archive', { path, output, refName, format });
  },

  listSubmodules: async () => {
    const path = requirePath(get());
    const submodules = await invoke('git_list_submodules', { path });
    // Store result if needed; for now just fetches
    console.log('Submodules:', submodules);
  },

  addSubmodule: async (url: string, name?: string, branch?: string) => {
    const path = requirePath(get());
    await invoke('git_add_submodule', {
      path,
      url,
      name: name ?? null,
      branch: branch ?? null,
    });
  },

  updateSubmodule: async (name?: string, init?: boolean, recursive?: boolean) => {
    const path = requirePath(get());
    await invoke('git_update_submodule', {
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
      const state: InProgressState = await invoke('git_get_in_progress', { path });
      set({ inProgress: state });
    } catch (e) {
      set((s) => ({ errors: { ...s.errors, inProgress: String(e) } }));
    } finally {
      set((s) => ({ loading: { ...s.loading, inProgress: false } }));
    }
  },

  searchCommits: async (params: SearchParams) => {
    const path = requirePath(get());
    return await invoke('git_search_commits', {
      path,
      query: params.query ?? null,
      author: params.author ?? null,
      since: params.since ?? null,
      until: params.until ?? null,
    });
  },

  getMergeConflicts: async () => {
    const path = requirePath(get());
    return await invoke('git_get_merge_conflicts', { path });
  },

  assumeUnchanged: async (files: string[], enable: boolean) => {
    const path = requirePath(get());
    await invoke('git_assume_unchanged', { path, files, enable });
    await get().fetchStatus();
  },

  skipWorktree: async (files: string[], enable: boolean) => {
    const path = requirePath(get());
    await invoke('git_skip_worktree', { path, files, enable });
    await get().fetchStatus();
  },

  addToGitignore: async (patterns: string[]) => {
    const path = requirePath(get());
    await invoke('git_add_to_gitignore', { path, patterns });
  },

  deleteFiles: async (files: string[]) => {
    const path = requirePath(get());
    await invoke('git_delete_files', { path, files });
    await get().fetchStatus();
  },

  savePatch: async (sha: string, outputDir: string) => {
    const path = requirePath(get());
    await invoke('git_save_patch', { path, sha, outputDir });
  },

  applyPatch: async (patchFile: string) => {
    const path = requirePath(get());
    await invoke('git_apply_patch', { path, patchFile });
    await get().fetchAll();
  },

  getFileHistory: async (file: string, limit: number) => {
    const path = requirePath(get());
    return await invoke('git_get_file_history', { path, file, limit });
  },

  getCommitChildren: async (sha: string) => {
    const path = requirePath(get());
    return await invoke('git_get_commit_children', { path, sha });
  },

  stashShow: async (index: number) => {
    const path = requirePath(get());
    return await invoke('git_stash_show', { path, index });
  },

  editRemote: async (name: string, newUrl: string) => {
    const path = requirePath(get());
    await invoke('git_edit_remote', { path, name, newUrl });
    await get().fetchRemotes();
  },

  deleteRemoteTag: async (name: string, remote: string) => {
    const path = requirePath(get());
    await invoke('git_delete_remote_tag', { path, name, remote });
    await get().fetchTags();
  },

  getGitVersion: async () => {
    return await invoke('git_get_version');
  },

  openInFileManager: async (path: string) => {
    await invoke('open_in_file_manager', { path });
  },

  openInTerminal: async (path: string) => {
    await invoke('open_in_terminal', { path });
  },

  openInBrowser: async (url: string) => {
    await invoke('open_in_browser', { url });
  },

  lfsIsAvailable: async () => {
    return await invoke<boolean>('git_lfs_is_available');
  },

  lfsTrack: async (pattern: string) => {
    const path = requirePath(get());
    await invoke('git_lfs_track', { path, pattern });
  },

  lfsUntrack: async (pattern: string) => {
    const path = requirePath(get());
    await invoke('git_lfs_untrack', { path, pattern });
  },

  lfsListTracks: async () => {
    const path = requirePath(get());
    return await invoke<string[]>('git_lfs_list_tracks', { path });
  },

  lfsFetch: async (remote?: string, include?: string, exclude?: string) => {
    const path = requirePath(get());
    await invoke('git_lfs_fetch', {
      path,
      remote: remote ?? null,
      include: include ?? null,
      exclude: exclude ?? null,
    });
  },

  lfsPull: async (remote?: string, include?: string, exclude?: string) => {
    const path = requirePath(get());
    await invoke('git_lfs_pull', {
      path,
      remote: remote ?? null,
      include: include ?? null,
      exclude: exclude ?? null,
    });
  },

  lfsPush: async (remote?: string, include?: string, exclude?: string, all?: boolean) => {
    const path = requirePath(get());
    await invoke('git_lfs_push', {
      path,
      remote: remote ?? null,
      include: include ?? null,
      exclude: exclude ?? null,
      all: all ?? false,
    });
  },

  lfsPrune: async (dryRun?: boolean) => {
    const path = requirePath(get());
    return await invoke<string>('git_lfs_prune', { path, dryRun: dryRun ?? false });
  },

  lfsLock: async (file: string) => {
    const path = requirePath(get());
    await invoke('git_lfs_lock', { path, file });
  },

  lfsUnlock: async (file: string, force?: boolean) => {
    const path = requirePath(get());
    await invoke('git_lfs_unlock', { path, file, force: force ?? false });
  },

  lfsListLocks: async () => {
    const path = requirePath(get());
    return await invoke<LfsLock[]>('git_lfs_list_locks', { path });
  },
}));
