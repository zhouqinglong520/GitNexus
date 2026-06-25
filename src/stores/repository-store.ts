import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { useGitStore } from './git-store';
import type { RepositoryInfo, Tab, TabType } from '@/types';

interface RepositoryStore {
  repos: RepositoryInfo[];
  activeRepo: string | null;
  tabs: Tab[];
  recentRepos: string[];

  // Actions
  openRepo: (path: string) => Promise<void>;
  closeRepo: (path: string) => void;
  setActiveRepo: (path: string) => void;
  addTab: (tab: Omit<Tab, 'id'>) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  loadRecentRepos: () => Promise<void>;
  addRecentRepo: (path: string) => void;
  removeRecentRepo: (path: string) => void;
  fetchRepos: () => Promise<void>;
}

export const useRepositoryStore = create<RepositoryStore>((set, get) => ({
  repos: [],
  activeRepo: null,
  tabs: [],
  recentRepos: [],

  openRepo: async (path: string) => {
    try {
      const repo: RepositoryInfo = await invoke('git_open_repo', { path });
      const existing = get().repos.find((r) => r.path === path);
      if (!existing) {
        set((s) => ({ repos: [...s.repos, repo] }));
      }
      set({ activeRepo: path });

      // Set the repo path in git store so all subsequent commands use it
      useGitStore.getState().setRepoPath(path);

      // Add tab if not exists
      const existingTab = get().tabs.find((t) => t.repoPath === path);
      if (!existingTab) {
        const tab: Tab = {
          id: `tab-${Date.now()}`,
          repoPath: path,
          label: repo.head || repo.path.split('/').pop() || 'Repository',
          type: 'histories',
        };
        set((s) => ({ tabs: [...s.tabs, tab] }));
      }

      get().addRecentRepo(path);
    } catch (error) {
      console.error('Failed to open repository:', error);
    }
  },

  closeRepo: (path: string) => {
    const wasActive = get().activeRepo === path;
    set((s) => ({
      repos: s.repos.filter((r) => r.path !== path),
      tabs: s.tabs.filter((t) => t.repoPath !== path),
      activeRepo: s.activeRepo === path ? (s.repos.filter(r => r.path !== path)[0]?.path ?? null) : s.activeRepo,
    }));
    // Clear git store if closing the active repo
    if (wasActive) {
      useGitStore.getState().setRepoPath(null);
    }
  },

  setActiveRepo: (path: string) => {
    set({ activeRepo: path });
    // Update git store repo path
    useGitStore.getState().setRepoPath(path);
  },

  addTab: (tab: Omit<Tab, 'id'>) => {
    const newTab: Tab = { ...tab, id: `tab-${Date.now()}` };
    set((s) => ({ tabs: [...s.tabs, newTab] }));
  },

  closeTab: (tabId: string) => {
    const tab = get().tabs.find((t) => t.id === tabId);
    set((s) => {
      const newTabs = s.tabs.filter((t) => t.id !== tabId);
      const remaining = newTabs.find((t) => t.repoPath === tab?.repoPath);
      return {
        tabs: newTabs,
        activeRepo: tab && !remaining ? (newTabs[0]?.repoPath ?? null) : s.activeRepo,
      };
    });
  },

  setActiveTab: (tabId: string) => {
    const tab = get().tabs.find((t) => t.id === tabId);
    if (tab) {
      set({ activeRepo: tab.repoPath });
      useGitStore.getState().setRepoPath(tab.repoPath);
    }
  },

  reorderTabs: (fromIndex: number, toIndex: number) => {
    set((s) => {
      const newTabs = [...s.tabs];
      const [moved] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, moved);
      return { tabs: newTabs };
    });
  },

  loadRecentRepos: async () => {
    // Backend does not have get_recent_repos; use localStorage directly
    const stored = localStorage.getItem('recentRepos');
    if (stored) {
      try {
        set({ recentRepos: JSON.parse(stored) });
      } catch {
        set({ recentRepos: [] });
      }
    }
  },

  addRecentRepo: (path: string) => {
    set((s) => {
      const filtered = s.recentRepos.filter((r) => r !== path);
      const updated = [path, ...filtered].slice(0, 10);
      localStorage.setItem('recentRepos', JSON.stringify(updated));
      return { recentRepos: updated };
    });
  },

  removeRecentRepo: (path: string) => {
    set((s) => {
      const updated = s.recentRepos.filter((r) => r !== path);
      localStorage.setItem('recentRepos', JSON.stringify(updated));
      return { recentRepos: updated };
    });
  },

  fetchRepos: async () => {
    // Backend does not have get_open_repos; no-op
  },
}));
