import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Preferences,
  GeneralPreferences,
  AppearancePreferences,
  GitPreferences,
  IntegrationPreferences,
  NotificationPreferences,
  SecurityPreferences,
  NetworkPreferences,
  AIPreferences,
  CodeHostingPreferences,
  MirrorPreferences,
  CommitPreferences,
  DensityLevel,
} from '@/types';

/** CSS variable mapping for density levels */
export const densityConfig: Record<DensityLevel, { rowHeight: string; listGap: string; fontSize: string; padding: string }> = {
  comfortable: { rowHeight: '40px', listGap: '12px', fontSize: '14px', padding: '10px 12px' },
  default: { rowHeight: '32px', listGap: '8px', fontSize: '13px', padding: '6px 12px' },
  compact: { rowHeight: '24px', listGap: '4px', fontSize: '12px', padding: '3px 12px' },
};

interface PreferencesStore {
  preferences: Preferences;
  updateGeneral: (partial: Partial<GeneralPreferences>) => void;
  updateAppearance: (partial: Partial<AppearancePreferences>) => void;
  updateGit: (partial: Partial<GitPreferences>) => void;
  updateIntegration: (partial: Partial<IntegrationPreferences>) => void;
  updateNotifications: (partial: Partial<NotificationPreferences>) => void;
  updateSecurity: (partial: Partial<SecurityPreferences>) => void;
  updateNetwork: (partial: Partial<NetworkPreferences>) => void;
  updateAI: (partial: Partial<AIPreferences>) => void;
  updateCodeHosting: (partial: Partial<CodeHostingPreferences>) => void;
  updateMirror: (partial: Partial<MirrorPreferences>) => void;
  updateCommit: (partial: Partial<CommitPreferences>) => void;
  updateDensity: (density: DensityLevel) => void;
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
    density: 'default',
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
  notifications: {
    enabled: true,
    sound_enabled: false,
    duration: 5,
    position: 'top-right',
  },
  security: {
    ssh_key_path: '',
    ssh_keys: [],
    gpg_key_path: '',
    credential_cache: true,
  },
  network: {
    proxy_host: '',
    proxy_port: 0,
    proxy_username: '',
    proxy_password: '',
    ssl_verify: true,
    connection_timeout: 30,
  },
  ai: {
    provider: 'deepseek',
    api_url: 'https://api.deepseek.com/v1',
    api_key: '',
    model_name: 'deepseek-chat',
    extra_prompt: '',
    read_key_from_env: false,
  },
  code_hosting: {
    gitee_token: '',
    github_token: '',
    gitlab_token: '',
    coding_token: '',
    webee_token: '',
    codehub_token: '',
  },
  mirror: {
    enabled: false,
    source: 'auto',
    custom_url: '',
    clone_only: false,
    exclude_domains: [],
  },
  commit: {
    conventional_commits: true,
    commit_types: [
      { name: 'feat', description: 'A new feature', emoji: 'sparkles' },
      { name: 'fix', description: 'A bug fix', emoji: 'bug' },
      { name: 'docs', description: 'Documentation only changes', emoji: 'memo' },
      { name: 'style', description: 'Changes that do not affect the meaning of the code', emoji: 'lipstick' },
      { name: 'refactor', description: 'A code change that neither fixes a bug nor adds a feature', emoji: 'recycle' },
      { name: 'perf', description: 'A code change that improves performance', emoji: 'zap' },
      { name: 'test', description: 'Adding missing tests or correcting existing tests', emoji: 'white_check_mark' },
      { name: 'build', description: 'Changes that affect the build system or external dependencies', emoji: 'package' },
      { name: 'ci', description: 'Changes to CI configuration files and scripts', emoji: 'green_heart' },
      { name: 'chore', description: 'Other changes that do not modify src or test files', emoji: 'hammer' },
      { name: 'revert', description: 'Reverts a previous commit', emoji: 'rewind' },
    ],
    history_count: 20,
    commit_template: '',
    check_trailing_whitespace: true,
    check_bom: false,
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

      updateNotifications: (partial: Partial<NotificationPreferences>) => {
        set((s) => ({
          preferences: {
            ...s.preferences,
            notifications: { ...s.preferences.notifications, ...partial },
          },
        }));
      },

      updateSecurity: (partial: Partial<SecurityPreferences>) => {
        set((s) => ({
          preferences: {
            ...s.preferences,
            security: { ...s.preferences.security, ...partial },
          },
        }));
      },

      updateNetwork: (partial: Partial<NetworkPreferences>) => {
        set((s) => ({
          preferences: {
            ...s.preferences,
            network: { ...s.preferences.network, ...partial },
          },
        }));
      },

      updateAI: (partial: Partial<AIPreferences>) => {
        set((s) => ({
          preferences: {
            ...s.preferences,
            ai: { ...s.preferences.ai, ...partial },
          },
        }));
      },

      updateCodeHosting: (partial: Partial<CodeHostingPreferences>) => {
        set((s) => ({
          preferences: {
            ...s.preferences,
            code_hosting: { ...s.preferences.code_hosting, ...partial },
          },
        }));
      },

      updateMirror: (partial: Partial<MirrorPreferences>) => {
        set((s) => ({
          preferences: {
            ...s.preferences,
            mirror: { ...s.preferences.mirror, ...partial },
          },
        }));
      },

      updateCommit: (partial: Partial<CommitPreferences>) => {
        set((s) => ({
          preferences: {
            ...s.preferences,
            commit: { ...s.preferences.commit, ...partial },
          },
        }));
      },

      updateDensity: (density: DensityLevel) => {
        set((s) => ({
          preferences: {
            ...s.preferences,
            appearance: { ...s.preferences.appearance, density },
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
