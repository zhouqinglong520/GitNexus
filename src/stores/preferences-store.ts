import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Preferences, GeneralPreferences, AppearancePreferences, GitPreferences, IntegrationPreferences } from '@/types';

interface PreferencesStore {
  preferences: Preferences;
  updateGeneral: (partial: Partial<GeneralPreferences>) => void;
  updateAppearance: (partial: Partial<AppearancePreferences>) => void;
  updateGit: (partial: Partial<GitPreferences>) => void;
  updateIntegration: (partial: Partial<IntegrationPreferences>) => void;
  resetToDefaults: () => void;
}

const defaultPreferences: Preferences = {
  general: {
    language: 'zh-CN',
    default_repo_directory: '',
    auto_fetch: false,
    auto_fetch_interval: 300,
    recent_repos_count: 10,
    confirm_before_undo: true,
    show_ignored_files: false,
  },
  appearance: {
    theme: 'catppuccin-mocha',
    font_family: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif',
    font_size: 13,
    line_height: 1.5,
    show_commit_graph: true,
    show_avatars: true,
    compact_mode: false,
    diff_mode: 'unified',
    tab_size: 4,
  },
  git: {
    default_branch_name: 'main',
    push_default: 'upstream',
    rebase_when_pull: false,
    sign_commits: false,
    gpg_program: '',
    line_ending: 'auto',
  },
  integration: {
    terminal: '',
    merge_tool: '',
    diff_tool: '',
    editor: '',
    file_manager: '',
  },
};

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      preferences: { ...defaultPreferences },

      updateGeneral: (partial: Partial<GeneralPreferences>) => {
        set((s) => ({
          preferences: {
            ...s.preferences,
            general: { ...s.preferences.general, ...partial },
          },
        }));
      },

      updateAppearance: (partial: Partial<AppearancePreferences>) => {
        set((s) => ({
          preferences: {
            ...s.preferences,
            appearance: { ...s.preferences.appearance, ...partial },
          },
        }));
      },

      updateGit: (partial: Partial<GitPreferences>) => {
        set((s) => ({
          preferences: {
            ...s.preferences,
            git: { ...s.preferences.git, ...partial },
          },
        }));
      },

      updateIntegration: (partial: Partial<IntegrationPreferences>) => {
        set((s) => ({
          preferences: {
            ...s.preferences,
            integration: { ...s.preferences.integration, ...partial },
          },
        }));
      },

      resetToDefaults: () => {
        set({ preferences: { ...defaultPreferences } });
      },
    }),
    {
      name: 'gitui-preferences',
    }
  )
);
