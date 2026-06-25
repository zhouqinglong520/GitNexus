import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Palette,
  GitBranch,
  Terminal,
  Globe,
  Bell,
  Shield,
  Keyboard,
  Database,
  Info,
  ChevronRight,
  Save,
  RotateCcw,
  Loader2,
  Trash2,
  FolderOpen,
  Plus,
  X,
  Search,
  Key,
  FileText,
  Play,
  Pencil,
  ClipboardList,
  HardDrive,
  Download,
  Upload,
  RefreshCw,
  Lock,
  Unlock,
  Eraser,
  Bot,
  GitFork,
  Zap,
  MessageSquare,
  Eye,
  EyeOff,
  TestTube,
  ScanSearch,
} from 'lucide-react';
import { usePreferencesStore } from '@/stores/preferences-store';
import { useGitStore } from '@/stores/git-store';
import { useUIStore } from '@/stores/ui-store';
import { invoke } from '@tauri-apps/api/core';
import type { CommandLogEntry, CustomAction, CustomActionVariable } from '@/types';
import { useTranslation } from '@/i18n';
import { SUPPORTED_LOCALES } from '@/i18n';
import type { Locale } from '@/i18n';

type SettingsTab =
  | 'general'
  | 'appearance'
  | 'git'
  | 'integration'
  | 'keybindings'
  | 'notifications'
  | 'security'
  | 'storage'
  | 'network'
  | 'lfs'
  | 'command_log'
  | 'custom_actions'
  | 'ai'
  | 'code_hosting'
  | 'mirror'
  | 'commit'
  | 'about';

const TABS: { id: SettingsTab; labelKey: string; icon: React.ReactNode }[] = [
  { id: 'general', labelKey: 'settings.general', icon: <SettingsIcon size={16} /> },
  { id: 'appearance', labelKey: 'settings.appearance', icon: <Palette size={16} /> },
  { id: 'git', labelKey: 'settings.git', icon: <GitBranch size={16} /> },
  { id: 'ai', labelKey: 'settings.ai', icon: <Bot size={16} /> },
  { id: 'code_hosting', labelKey: 'settings.code_hosting', icon: <GitFork size={16} /> },
  { id: 'mirror', labelKey: 'settings.mirror', icon: <Zap size={16} /> },
  { id: 'commit', labelKey: 'settings.commit', icon: <MessageSquare size={16} /> },
  { id: 'integration', labelKey: 'settings.integration', icon: <Terminal size={16} /> },
  { id: 'keybindings', labelKey: 'settings.keybindings', icon: <Keyboard size={16} /> },
  { id: 'notifications', labelKey: 'settings.notifications', icon: <Bell size={16} /> },
  { id: 'security', labelKey: 'settings.security', icon: <Shield size={16} /> },
  { id: 'storage', labelKey: 'settings.storage', icon: <Database size={16} /> },
  { id: 'network', labelKey: 'settings.network', icon: <Globe size={16} /> },
  { id: 'lfs', labelKey: 'settings.lfs', icon: <HardDrive size={16} /> },
  { id: 'command_log', labelKey: 'settings.command_log', icon: <FileText size={16} /> },
  { id: 'custom_actions', labelKey: 'settings.custom_actions', icon: <ClipboardList size={16} /> },
  { id: 'about', labelKey: 'settings.about', icon: <Info size={16} /> },
];

/** Git config items that can be edited */
const GIT_CONFIG_ITEMS = [
  { key: 'user.name', label: 'User Name', description: 'Name used for commits', type: 'text' as const },
  { key: 'user.email', label: 'User Email', description: 'Email used for commits', type: 'text' as const },
  { key: 'core.autocrlf', label: 'Auto CRLF', description: 'Convert line endings (true/false/input)', type: 'select' as const, options: ['true', 'false', 'input'] },
  { key: 'pull.rebase', label: 'Pull Rebase', description: 'Use rebase when pulling (true/false)', type: 'select' as const, options: ['true', 'false'] },
  { key: 'merge.tool', label: 'Merge Tool', description: 'Default merge tool', type: 'text' as const },
  { key: 'core.editor', label: 'Editor', description: 'Default text editor for git', type: 'text' as const },
  { key: 'push.default', label: 'Push Default', description: 'Default push behavior', type: 'select' as const, options: ['upstream', 'current', 'matching', 'simple'] },
  { key: 'init.defaultBranch', label: 'Default Branch', description: 'Default branch name for new repos', type: 'text' as const },
  { key: 'core.excludesfile', label: 'Excludes File', description: 'Global gitignore file path', type: 'text' as const },
  { key: 'color.ui', label: 'Color UI', description: 'Enable colored output (auto/always/never)', type: 'select' as const, options: ['auto', 'always', 'never'] },
];

/** Keybinding definition */
interface KeybindingEntry {
  name: string;
  keys: string;
  scope: string;
  description: string;
  category: string;
}

/** Complete keybinding map extracted from codebase */
const KEYBINDINGS: KeybindingEntry[] = [
  // Global
  { name: 'Command Palette', keys: 'Ctrl+P', scope: 'Global', description: 'Open the command palette for quick actions', category: 'Global' },
  { name: 'New Window', keys: 'Ctrl+Shift+N', scope: 'Global', description: 'Open a new application window', category: 'Global' },
  { name: 'Open Repository', keys: 'Ctrl+O', scope: 'Global', description: 'Open a file dialog to select a repository', category: 'Global' },
  { name: 'Toggle Sidebar', keys: 'Ctrl+B', scope: 'Global', description: 'Show or hide the sidebar panel', category: 'Global' },
  { name: 'Settings', keys: 'Ctrl+,', scope: 'Global', description: 'Open the settings page', category: 'Global' },

  // Git Operations
  { name: 'Commit', keys: 'Ctrl+Enter', scope: 'Repository', description: 'Open the commit dialog with staged changes', category: 'Git Operations' },
  { name: 'Push', keys: 'Ctrl+Shift+P', scope: 'Repository', description: 'Push current branch to remote', category: 'Git Operations' },
  { name: 'Pull', keys: 'Ctrl+Shift+L', scope: 'Repository', description: 'Pull changes from remote', category: 'Git Operations' },
  { name: 'Fetch', keys: 'Ctrl+Shift+F', scope: 'Repository', description: 'Fetch from remote without merging', category: 'Git Operations' },
  { name: 'Stage All', keys: 'Ctrl+S', scope: 'Working Copy', description: 'Stage all changes in the working copy', category: 'Git Operations' },
  { name: 'Discard Changes', keys: 'Ctrl+D', scope: 'Working Copy', description: 'Discard all unstaged changes', category: 'Git Operations' },
  { name: 'Toggle Comment', keys: 'Ctrl+/', scope: 'Editor', description: 'Toggle line comment in editor', category: 'Git Operations' },
  { name: 'Undo', keys: 'Ctrl+Z', scope: 'Global', description: 'Undo the last operation', category: 'Git Operations' },
  { name: 'Redo', keys: 'Ctrl+Shift+Z', scope: 'Global', description: 'Redo the last undone operation', category: 'Git Operations' },

  // Navigation
  { name: 'Go to Histories', keys: 'Ctrl+1', scope: 'Repository', description: 'Switch to the commit history view', category: 'Navigation' },
  { name: 'Go to Working Copy', keys: 'Ctrl+2', scope: 'Repository', description: 'Switch to the working copy view', category: 'Navigation' },
  { name: 'Go to Stashes', keys: 'Ctrl+3', scope: 'Repository', description: 'Switch to the stash list view', category: 'Navigation' },
  { name: 'Go to Next Tab', keys: 'Ctrl+Tab', scope: 'Global', description: 'Switch to the next open tab', category: 'Navigation' },
  { name: 'Go to Previous Tab', keys: 'Ctrl+Shift+Tab', scope: 'Global', description: 'Switch to the previous open tab', category: 'Navigation' },
  { name: 'Close Tab', keys: 'Ctrl+W', scope: 'Global', description: 'Close the current tab', category: 'Navigation' },

  // Search
  { name: 'Quick Search', keys: 'Ctrl+K', scope: 'Global', description: 'Open quick search for commits and files', category: 'Search' },
  { name: 'Find in File', keys: 'Ctrl+F', scope: 'Editor', description: 'Find text in the current file view', category: 'Search' },

  // View
  { name: 'Toggle Bottom Panel', keys: 'Ctrl+J', scope: 'Global', description: 'Show or hide the bottom panel', category: 'View' },
  { name: 'Toggle Diff Mode', keys: 'Ctrl+Shift+D', scope: 'Diff', description: 'Toggle between unified and side-by-side diff', category: 'View' },
  { name: 'Zoom In', keys: 'Ctrl+=', scope: 'Global', description: 'Increase the UI font size', category: 'View' },
  { name: 'Zoom Out', keys: 'Ctrl+-', scope: 'Global', description: 'Decrease the UI font size', category: 'View' },
  { name: 'Reset Zoom', keys: 'Ctrl+0', scope: 'Global', description: 'Reset the UI font size to default', category: 'View' },
];

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const preferences = usePreferencesStore((s) => s.preferences);
  const updateGeneral = usePreferencesStore((s) => s.updateGeneral);
  const updateAppearance = usePreferencesStore((s) => s.updateAppearance);
  const updateGit = usePreferencesStore((s) => s.updateGit);
  const updateIntegration = usePreferencesStore((s) => s.updateIntegration);
  const updateNotifications = usePreferencesStore((s) => s.updateNotifications);
  const updateSecurity = usePreferencesStore((s) => s.updateSecurity);
  const updateNetwork = usePreferencesStore((s) => s.updateNetwork);
  const updateAI = usePreferencesStore((s) => s.updateAI);
  const updateCodeHosting = usePreferencesStore((s) => s.updateCodeHosting);
  const updateMirror = usePreferencesStore((s) => s.updateMirror);
  const updateCommit = usePreferencesStore((s) => s.updateCommit);
  const updateDensity = usePreferencesStore((s) => s.updateDensity);
  const resetToDefaults = usePreferencesStore((s) => s.resetToDefaults);

  const getConfig = useGitStore((s) => s.getConfig);
  const setConfig = useGitStore((s) => s.setConfig);
  const lfsIsAvailable = useGitStore((s) => s.lfsIsAvailable);
  const lfsTrack = useGitStore((s) => s.lfsTrack);
  const lfsUntrack = useGitStore((s) => s.lfsUntrack);
  const lfsListTracks = useGitStore((s) => s.lfsListTracks);
  const lfsFetch = useGitStore((s) => s.lfsFetch);
  const lfsPull = useGitStore((s) => s.lfsPull);
  const lfsPush = useGitStore((s) => s.lfsPush);
  const lfsPrune = useGitStore((s) => s.lfsPrune);
  const lfsUnlock = useGitStore((s) => s.lfsUnlock);
  const lfsListLocks = useGitStore((s) => s.lfsListLocks);
  const addNotification = useUIStore((s) => s.addNotification);

  const { t, locale, setLocale } = useTranslation();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // Git config state
  const [gitConfigValues, setGitConfigValues] = useState<Record<string, string>>({});
  const [gitConfigLoading, setGitConfigLoading] = useState(false);
  const [gitConfigSaving, setGitConfigSaving] = useState(false);
  const [gitConfigLoaded, setGitConfigLoaded] = useState(false);

  // Keybindings search
  const [keybindingSearch, setKeybindingSearch] = useState('');

  // Storage state
  const [storageSize, setStorageSize] = useState<string>('Calculating...');
  const [storageKeyCount, setStorageKeyCount] = useState(0);

  // Security state
  const [newSshKeyPath, setNewSshKeyPath] = useState('');

  // Command Log state
  const [commandLogs, setCommandLogs] = useState<CommandLogEntry[]>([]);
  const [commandLogCount, setCommandLogCount] = useState(0);
  const [commandLogLoading, setCommandLogLoading] = useState(false);

  // Custom Actions state
  const [customActions, setCustomActions] = useState<CustomAction[]>([]);
  const [customActionsLoading, setCustomActionsLoading] = useState(false);
  const [editingAction, setEditingAction] = useState<CustomAction | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionOutput, setActionOutput] = useState<string>('');

  // LFS state
  const [lfsAvailable, setLfsAvailable] = useState(false);
  const [lfsTracks, setLfsTracks] = useState<string[]>([]);
  const [lfsTracksLoading, setLfsTracksLoading] = useState(false);
  const [lfsNewPattern, setLfsNewPattern] = useState('');
  const [lfsLocks, setLfsLocks] = useState<Array<{ file: string; locked_by: string | null; locked_at: string | null }>>([]);
  const [lfsLocksLoading, setLfsLocksLoading] = useState(false);
  const [lfsOperating, setLfsOperating] = useState(false);
  const [lfsOperatingAction, setLfsOperatingAction] = useState('');

  // AI service state
  const [aiShowApiKey, setAiShowApiKey] = useState(false);
  const [aiModels, setAiModels] = useState<string[]>([]);
  const [aiModelsLoading, setAiModelsLoading] = useState(false);
  const [aiTestMessage, setAiTestMessage] = useState('');
  const [aiTestLoading, setAiTestLoading] = useState(false);

  // Mirror state
  const [mirrorExcludeInput, setMirrorExcludeInput] = useState('');
  const [mirrorLatencyResult, setMirrorLatencyResult] = useState<Record<string, number>>({});
  const [mirrorLatencyLoading, setMirrorLatencyLoading] = useState(false);

  // Commit types JSON editor state
  const [commitTypesJson, setCommitTypesJson] = useState('');
  const [commitTypesJsonError, setCommitTypesJsonError] = useState('');

  // AI provider default URL mapping
  const AI_PROVIDER_URLS: Record<string, string> = {
    deepseek: 'https://api.deepseek.com/v1',
    qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    wenxin: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1',
    openai: 'https://api.openai.com/v1',
    ollama: 'http://localhost:11434/v1',
    custom: '',
  };

  // Load git config values when switching to git tab
  useEffect(() => {
    if (activeTab === 'git' && !gitConfigLoaded) {
      loadGitConfig();
    }
  }, [activeTab, gitConfigLoaded]);

  // Calculate localStorage usage when switching to storage tab
  useEffect(() => {
    if (activeTab === 'storage') {
      calculateStorageUsage();
    }
  }, [activeTab]);

  // Load LFS data when switching to lfs tab
  useEffect(() => {
    if (activeTab === 'lfs') {
      handleLfsCheckAvailability();
      handleLfsRefreshTracks();
      handleLfsRefreshLocks();
    }
  }, [activeTab]);

  const handleLfsCheckAvailability = useCallback(async () => {
    try {
      const available = await lfsIsAvailable();
      setLfsAvailable(available);
    } catch {
      setLfsAvailable(false);
    }
  }, [lfsIsAvailable]);

  const handleLfsRefreshTracks = useCallback(async () => {
    setLfsTracksLoading(true);
    try {
      const tracks = await lfsListTracks();
      setLfsTracks(tracks);
    } catch (err) {
      addNotification({ type: 'error', title: 'Failed to load LFS tracks', message: String(err) });
      setLfsTracks([]);
    } finally {
      setLfsTracksLoading(false);
    }
  }, [lfsListTracks, addNotification]);

  const handleLfsTrack = useCallback(async () => {
    const pattern = lfsNewPattern.trim();
    if (!pattern) return;
    try {
      await lfsTrack(pattern);
      setLfsNewPattern('');
      addNotification({ type: 'success', title: 'LFS track added', message: pattern });
      await handleLfsRefreshTracks();
    } catch (err) {
      addNotification({ type: 'error', title: 'Failed to track pattern', message: String(err) });
    }
  }, [lfsNewPattern, lfsTrack, addNotification, handleLfsRefreshTracks]);

  const handleLfsUntrack = useCallback(async (pattern: string) => {
    try {
      await lfsUntrack(pattern);
      addNotification({ type: 'success', title: 'LFS track removed', message: pattern });
      await handleLfsRefreshTracks();
    } catch (err) {
      addNotification({ type: 'error', title: 'Failed to untrack pattern', message: String(err) });
    }
  }, [lfsUntrack, addNotification, handleLfsRefreshTracks]);

  const handleLfsOperation = useCallback(async (operation: 'fetch' | 'pull' | 'push' | 'prune') => {
    setLfsOperating(true);
    setLfsOperatingAction(operation.charAt(0).toUpperCase() + operation.slice(1));
    try {
      switch (operation) {
        case 'fetch':
          await lfsFetch();
          addNotification({ type: 'success', title: 'LFS fetch completed' });
          break;
        case 'pull':
          await lfsPull();
          addNotification({ type: 'success', title: 'LFS pull completed' });
          break;
        case 'push':
          await lfsPush();
          addNotification({ type: 'success', title: 'LFS push completed' });
          break;
        case 'prune': {
          const result = await lfsPrune(true);
          addNotification({ type: 'success', title: 'LFS prune (dry-run)', message: result || 'No output' });
          break;
        }
      }
    } catch (err) {
      addNotification({ type: 'error', title: `LFS ${operation} failed`, message: String(err) });
    } finally {
      setLfsOperating(false);
      setLfsOperatingAction('');
    }
  }, [lfsFetch, lfsPull, lfsPush, lfsPrune, addNotification]);

  const handleLfsRefreshLocks = useCallback(async () => {
    setLfsLocksLoading(true);
    try {
      const locks = await lfsListLocks();
      setLfsLocks(locks);
    } catch (err) {
      addNotification({ type: 'error', title: 'Failed to load LFS locks', message: String(err) });
      setLfsLocks([]);
    } finally {
      setLfsLocksLoading(false);
    }
  }, [lfsListLocks, addNotification]);

  const handleLfsUnlock = useCallback(async (file: string) => {
    try {
      await lfsUnlock(file, true);
      addNotification({ type: 'success', title: 'LFS file unlocked', message: file });
      await handleLfsRefreshLocks();
    } catch (err) {
      addNotification({ type: 'error', title: 'Failed to unlock file', message: String(err) });
    }
  }, [lfsUnlock, addNotification, handleLfsRefreshLocks]);

  // AI service handlers
  const handleAIProviderChange = useCallback((provider: string) => {
    updateAI({ provider: provider as any, api_url: AI_PROVIDER_URLS[provider] || '' });
    setAiModels([]);
  }, [updateAI]);

  const handleAIFetchModels = useCallback(async () => {
    setAiModelsLoading(true);
    try {
      const models = await invoke<string[]>('ai_fetch_models', {
        provider: preferences.ai.provider,
        apiUrl: preferences.ai.api_url,
        apiKey: preferences.ai.api_key,
      });
      setAiModels(models);
    } catch (err) {
      addNotification({ type: 'error', title: 'Failed to fetch models', message: String(err) });
      setAiModels([]);
    } finally {
      setAiModelsLoading(false);
    }
  }, [preferences.ai, addNotification]);

  const handleAITestGenerate = useCallback(async () => {
    setAiTestLoading(true);
    setAiTestMessage('');
    try {
      const message = await invoke<string>('ai_generate_commit_message', {
        provider: preferences.ai.provider,
        apiUrl: preferences.ai.api_url,
        apiKey: preferences.ai.api_key,
        model: preferences.ai.model_name,
        extraPrompt: preferences.ai.extra_prompt,
        diff: 'test diff content',
      });
      setAiTestMessage(message);
    } catch (err) {
      setAiTestMessage(`Error: ${err}`);
    } finally {
      setAiTestLoading(false);
    }
  }, [preferences.ai]);

  // Mirror handlers
  const handleMirrorAddExclude = useCallback(() => {
    const trimmed = mirrorExcludeInput.trim();
    if (!trimmed) return;
    if (preferences.mirror.exclude_domains.includes(trimmed)) return;
    updateMirror({ exclude_domains: [...preferences.mirror.exclude_domains, trimmed] });
    setMirrorExcludeInput('');
  }, [mirrorExcludeInput, preferences.mirror.exclude_domains, updateMirror]);

  const handleMirrorRemoveExclude = useCallback((domain: string) => {
    updateMirror({ exclude_domains: preferences.mirror.exclude_domains.filter((d) => d !== domain) });
  }, [preferences.mirror.exclude_domains, updateMirror]);

  const handleMirrorTestLatency = useCallback(async () => {
    setMirrorLatencyLoading(true);
    setMirrorLatencyResult({});
    try {
      const result = await invoke<Record<string, number>>('test_mirror_latency', {
        enabled: preferences.mirror.enabled,
        source: preferences.mirror.source,
        customUrl: preferences.mirror.custom_url,
      });
      setMirrorLatencyResult(result);
    } catch (err) {
      addNotification({ type: 'error', title: 'Mirror latency test failed', message: String(err) });
    } finally {
      setMirrorLatencyLoading(false);
    }
  }, [preferences.mirror, addNotification]);

  // Commit types JSON handlers
  const handleCommitTypesJsonChange = useCallback((json: string) => {
    setCommitTypesJson(json);
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        setCommitTypesJsonError('');
        updateCommit({ commit_types: parsed });
      } else {
        setCommitTypesJsonError('JSON must be an array');
      }
    } catch {
      setCommitTypesJsonError('Invalid JSON');
    }
  }, [updateCommit]);

  const loadGitConfig = useCallback(async () => {
    setGitConfigLoading(true);
    const values: Record<string, string> = {};
    try {
      for (const item of GIT_CONFIG_ITEMS) {
        try {
          const val = await getConfig(item.key);
          values[item.key] = val;
        } catch {
          values[item.key] = '';
        }
      }
      setGitConfigValues(values);
      setGitConfigLoaded(true);
    } catch (err) {
      addNotification({ type: 'error', title: 'Failed to load git config', message: String(err) });
    } finally {
      setGitConfigLoading(false);
    }
  }, [getConfig, addNotification]);

  const handleGitConfigSave = useCallback(async () => {
    setGitConfigSaving(true);
    try {
      for (const item of GIT_CONFIG_ITEMS) {
        const value = gitConfigValues[item.key];
        if (value !== undefined && value !== '') {
          try {
            await setConfig(item.key, value);
          } catch (err) {
            addNotification({ type: 'warning', title: `Failed to set ${item.key}`, message: String(err) });
          }
        }
      }
      addNotification({ type: 'success', title: 'Git config saved' });
    } catch (err) {
      addNotification({ type: 'error', title: 'Failed to save git config', message: String(err) });
    } finally {
      setGitConfigSaving(false);
    }
  }, [gitConfigValues, setConfig, addNotification]);

  const handleGitConfigReset = useCallback(() => {
    setGitConfigLoaded(false);
    loadGitConfig();
  }, [loadGitConfig]);

  const calculateStorageUsage = useCallback(() => {
    try {
      let totalSize = 0;
      let keyCount = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += key.length + value.length;
          }
          keyCount++;
        }
      }
      // Convert to human-readable format (approximate bytes for UTF-16)
      const bytes = totalSize * 2;
      if (bytes < 1024) {
        setStorageSize(`${bytes} B`);
      } else if (bytes < 1024 * 1024) {
        setStorageSize(`${(bytes / 1024).toFixed(2)} KB`);
      } else {
        setStorageSize(`${(bytes / (1024 * 1024)).toFixed(2)} MB`);
      }
      setStorageKeyCount(keyCount);
    } catch {
      setStorageSize('Unable to calculate');
    }
  }, []);

  const handleClearCache = useCallback(() => {
    try {
      // Clear all localStorage except preferences
      const preferencesData = localStorage.getItem('gitui-preferences');
      localStorage.clear();
      if (preferencesData) {
        localStorage.setItem('gitui-preferences', preferencesData);
      }
      calculateStorageUsage();
      addNotification({ type: 'success', title: 'Cache cleared', message: 'All cached data has been removed.' });
    } catch (err) {
      addNotification({ type: 'error', title: 'Failed to clear cache', message: String(err) });
    }
  }, [addNotification, calculateStorageUsage]);

  const handleAddSshKey = useCallback(() => {
    const trimmed = newSshKeyPath.trim();
    if (!trimmed) return;
    const currentKeys = preferences.security.ssh_keys;
    if (currentKeys.includes(trimmed)) {
      addNotification({ type: 'warning', title: 'SSH key already exists', message: 'This path is already in the SSH key list.' });
      return;
    }
    updateSecurity({ ssh_keys: [...currentKeys, trimmed] });
    setNewSshKeyPath('');
    addNotification({ type: 'success', title: 'SSH key added', message: trimmed });
  }, [newSshKeyPath, preferences.security.ssh_keys, updateSecurity, addNotification]);

  const handleRemoveSshKey = useCallback((path: string) => {
    updateSecurity({
      ssh_keys: preferences.security.ssh_keys.filter((k) => k !== path),
    });
    addNotification({ type: 'success', title: 'SSH key removed', message: path });
  }, [preferences.security.ssh_keys, updateSecurity, addNotification]);

  // Command Log handlers
  const loadCommandLogs = useCallback(async () => {
    setCommandLogLoading(true);
    try {
      const [logs, count] = await Promise.all([
        invoke<CommandLogEntry[]>('git_get_command_logs', { limit: 200, offset: 0 }),
        invoke<number>('git_get_command_log_count'),
      ]);
      setCommandLogs(logs);
      setCommandLogCount(count);
    } catch (err) {
      addNotification({ type: 'error', title: 'Failed to load command logs', message: String(err) });
    } finally {
      setCommandLogLoading(false);
    }
  }, [addNotification]);

  const handleClearCommandLogs = useCallback(async () => {
    try {
      await invoke('git_clear_command_logs');
      setCommandLogs([]);
      setCommandLogCount(0);
      addNotification({ type: 'success', title: 'Command logs cleared' });
    } catch (err) {
      addNotification({ type: 'error', title: 'Failed to clear command logs', message: String(err) });
    }
  }, [addNotification]);

  // Custom Action handlers
  const loadCustomActions = useCallback(async () => {
    setCustomActionsLoading(true);
    try {
      const repoPath = useGitStore.getState().repoPath;
      if (!repoPath) {
        setCustomActions([]);
        return;
      }
      const config = await invoke<any>('git_get_repo_config', { path: repoPath });
      setCustomActions(config.custom_actions || []);
    } catch (err) {
      addNotification({ type: 'error', title: 'Failed to load custom actions', message: String(err) });
    } finally {
      setCustomActionsLoading(false);
    }
  }, [addNotification]);

  const handleSaveCustomActions = useCallback(async (actions: CustomAction[]) => {
    try {
      const repoPath = useGitStore.getState().repoPath;
      if (!repoPath) return;
      const currentConfig = await invoke<any>('git_get_repo_config', { path: repoPath });
      await invoke('git_save_repo_config', { path: repoPath, config: { ...currentConfig, custom_actions: actions } });
      setCustomActions(actions);
      addNotification({ type: 'success', title: 'Custom actions saved' });
    } catch (err) {
      addNotification({ type: 'error', title: 'Failed to save custom actions', message: String(err) });
    }
  }, [addNotification]);

  const handleAddCustomAction = useCallback(() => {
    const newAction: CustomAction = {
      id: Date.now().toString(),
      name: '',
      command: '',
      working_directory: 'repo',
      scope: 'repository',
      variables: [],
      wait_for_completion: true,
    };
    setEditingAction(newAction);
    setActionDialogOpen(true);
  }, []);

  const handleEditCustomAction = useCallback((action: CustomAction) => {
    setEditingAction({ ...action });
    setActionDialogOpen(true);
  }, []);

  const handleDeleteCustomAction = useCallback(async (id: string) => {
    const updated = customActions.filter((a) => a.id !== id);
    await handleSaveCustomActions(updated);
  }, [customActions, handleSaveCustomActions]);

  const handleSaveActionDialog = useCallback(async () => {
    if (!editingAction) return;
    if (!editingAction.name.trim() || !editingAction.command.trim()) {
      addNotification({ type: 'warning', title: 'Name and command are required' });
      return;
    }
    const existing = customActions.findIndex((a) => a.id === editingAction.id);
    let updated: CustomAction[];
    if (existing >= 0) {
      updated = [...customActions];
      updated[existing] = editingAction;
    } else {
      updated = [...customActions, editingAction];
    }
    await handleSaveCustomActions(updated);
    setActionDialogOpen(false);
    setEditingAction(null);
  }, [editingAction, customActions, handleSaveCustomActions, addNotification]);

  const handleTestAction = useCallback(async (action: CustomAction) => {
    try {
      const repoPath = useGitStore.getState().repoPath;
      if (!repoPath) return;
      setActionOutput('Running...');
      const result = await invoke<string>('git_execute_custom_action', {
        path: repoPath,
        action,
        variableValues: {},
      });
      setActionOutput(result || '(no output)');
    } catch (err) {
      setActionOutput(`Error: ${err}`);
    }
  }, [addNotification]);

  // Filtered keybindings
  const filteredKeybindings = useMemo(() => {
    if (!keybindingSearch.trim()) return KEYBINDINGS;
    const q = keybindingSearch.toLowerCase();
    return KEYBINDINGS.filter(
      (kb) =>
        kb.name.toLowerCase().includes(q) ||
        kb.keys.toLowerCase().includes(q) ||
        kb.description.toLowerCase().includes(q) ||
        kb.scope.toLowerCase().includes(q) ||
        kb.category.toLowerCase().includes(q)
    );
  }, [keybindingSearch]);

  // Grouped keybindings by category
  const groupedKeybindings = useMemo(() => {
    const groups: Record<string, KeybindingEntry[]> = {};
    for (const kb of filteredKeybindings) {
      if (!groups[kb.category]) groups[kb.category] = [];
      groups[kb.category].push(kb);
    }
    return groups;
  }, [filteredKeybindings]);

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <SettingsSection title="General Settings">
            <SettingRow label="Language" description="Application language">
              <select
                value={preferences.general.language}
                onChange={(e) => updateGeneral({ language: e.target.value })}
                className="px-2 py-1 rounded border text-sm"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              >
                <option value="zh-CN">Chinese (Simplified)</option>
                <option value="en">English</option>
                <option value="ja">Japanese</option>
              </select>
            </SettingRow>
            <SettingRow label="Default Repository Directory" description="Default path for opening repositories">
              <input
                type="text"
                value={preferences.general.default_repo_directory}
                onChange={(e) => updateGeneral({ default_repo_directory: e.target.value })}
                className="px-2 py-1 rounded border text-sm flex-1"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                placeholder="/path/to/repos"
              />
            </SettingRow>
            <SettingRow label="Auto Fetch" description="Automatically fetch from remotes">
              <ToggleSwitch
                checked={preferences.general.auto_fetch}
                onChange={(v) => updateGeneral({ auto_fetch: v })}
              />
            </SettingRow>
            <SettingRow label="Auto Fetch Interval (seconds)" description="Interval between auto-fetches">
              <input
                type="number"
                value={preferences.general.auto_fetch_interval}
                onChange={(e) => updateGeneral({ auto_fetch_interval: Number(e.target.value) })}
                className="px-2 py-1 rounded border text-sm w-24"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                min={30}
              />
            </SettingRow>
            <SettingRow label="Confirm Before Undo" description="Show confirmation dialog before undo operations">
              <ToggleSwitch
                checked={preferences.general.confirm_before_undo}
                onChange={(v) => updateGeneral({ confirm_before_undo: v })}
              />
            </SettingRow>
            <SettingRow label="Show Ignored Files" description="Show files in .gitignore">
              <ToggleSwitch
                checked={preferences.general.show_ignored_files}
                onChange={(v) => updateGeneral({ show_ignored_files: v })}
              />
            </SettingRow>
          </SettingsSection>
        );

      case 'appearance':
        return (
          <SettingsSection title="Appearance">
            <SettingRow label="Language" description="Application display language">
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                className="px-2 py-1 rounded border text-sm"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              >
                {SUPPORTED_LOCALES.map((loc) => (
                  <option key={loc.value} value={loc.value}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </SettingRow>
            <SettingRow label="Theme" description="Application color theme">
              <select
                value={preferences.appearance.theme}
                onChange={(e) => updateAppearance({ theme: e.target.value as any })}
                className="px-2 py-1 rounded border text-sm"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              >
                <option value="catppuccin-mocha">Catppuccin Mocha</option>
                <option value="catppuccin-latte">Catppuccin Latte</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </SettingRow>
            <SettingRow label="Font Size" description="Base font size in pixels">
              <input
                type="number"
                value={preferences.appearance.font_size}
                onChange={(e) => updateAppearance({ font_size: Number(e.target.value) })}
                className="px-2 py-1 rounded border text-sm w-24"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                min={10}
                max={24}
              />
            </SettingRow>
            <SettingRow label="Line Height" description="Code line height multiplier">
              <input
                type="number"
                value={preferences.appearance.line_height}
                onChange={(e) => updateAppearance({ line_height: Number(e.target.value) })}
                className="px-2 py-1 rounded border text-sm w-24"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                min={1}
                max={3}
                step={0.1}
              />
            </SettingRow>
            <SettingRow label="Show Commit Graph" description="Display commit graph in history view">
              <ToggleSwitch
                checked={preferences.appearance.show_commit_graph}
                onChange={(v) => updateAppearance({ show_commit_graph: v })}
              />
            </SettingRow>
            <SettingRow label="Show Avatars" description="Show author avatars in commit list">
              <ToggleSwitch
                checked={preferences.appearance.show_avatars}
                onChange={(v) => updateAppearance({ show_avatars: v })}
              />
            </SettingRow>
            <SettingRow label={t('settings.density')} description={t('settings.densityDesc')}>
              <div className="flex gap-1">
                {(['comfortable', 'default', 'compact'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => updateDensity(level)}
                    className="px-3 py-1 rounded text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: preferences.appearance.density === level ? 'var(--accent-blue)' : 'var(--bg-overlay)',
                      color: preferences.appearance.density === level ? 'var(--bg-base)' : 'var(--text-secondary)',
                    }}
                  >
                    {t(`settings.density_${level}`)}
                  </button>
                ))}
              </div>
            </SettingRow>
            <SettingRow label="Diff Mode" description="Default diff display mode">
              <select
                value={preferences.appearance.diff_mode}
                onChange={(e) => updateAppearance({ diff_mode: e.target.value as any })}
                className="px-2 py-1 rounded border text-sm"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              >
                <option value="unified">Unified</option>
                <option value="side-by-side">Side by Side</option>
              </select>
            </SettingRow>
            <SettingRow label="Tab Size" description="Number of spaces per tab">
              <input
                type="number"
                value={preferences.appearance.tab_size}
                onChange={(e) => updateAppearance({ tab_size: Number(e.target.value) })}
                className="px-2 py-1 rounded border text-sm w-24"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                min={2}
                max={8}
              />
            </SettingRow>
          </SettingsSection>
        );

      case 'git':
        return (
          <div className="space-y-6">
            {/* Git Preferences (local app settings) */}
            <SettingsSection title="Git Preferences">
              <SettingRow label="Default Branch Name" description="Name for new repository initial branch">
                <input
                  type="text"
                  value={preferences.git.default_branch_name}
                  onChange={(e) => updateGit({ default_branch_name: e.target.value })}
                  className="px-2 py-1 rounded border text-sm"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                />
              </SettingRow>
              <SettingRow label="Push Default" description="Default push behavior">
                <select
                  value={preferences.git.push_default}
                  onChange={(e) => updateGit({ push_default: e.target.value as any })}
                  className="px-2 py-1 rounded border text-sm"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                >
                  <option value="upstream">Upstream</option>
                  <option value="current">Current</option>
                  <option value="matching">Matching</option>
                </select>
              </SettingRow>
              <SettingRow label="Rebase When Pull" description="Use rebase instead of merge when pulling">
                <ToggleSwitch
                  checked={preferences.git.rebase_when_pull}
                  onChange={(v) => updateGit({ rebase_when_pull: v })}
                />
              </SettingRow>
              <SettingRow label="Sign Commits" description="GPG sign commits by default">
                <ToggleSwitch
                  checked={preferences.git.sign_commits}
                  onChange={(v) => updateGit({ sign_commits: v })}
                />
              </SettingRow>
              <SettingRow label="GPG Program" description="Path to GPG program">
                <input
                  type="text"
                  value={preferences.git.gpg_program}
                  onChange={(e) => updateGit({ gpg_program: e.target.value })}
                  className="px-2 py-1 rounded border text-sm flex-1"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="gpg"
                />
              </SettingRow>
              <SettingRow label="Line Ending" description="Default line ending style">
                <select
                  value={preferences.git.line_ending}
                  onChange={(e) => updateGit({ line_ending: e.target.value as any })}
                  className="px-2 py-1 rounded border text-sm"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                >
                  <option value="auto">Auto (OS default)</option>
                  <option value="lf">LF (Unix)</option>
                  <option value="crlf">CRLF (Windows)</option>
                </select>
              </SettingRow>
            </SettingsSection>

            {/* Git Config (read from / write to git config) */}
            <SettingsSection title="Git Configuration (git config)">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                  Read from and write to git config. Changes take effect immediately.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGitConfigReset}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    title="Reload from git"
                  >
                    <RotateCcw size={12} />
                    Reload
                  </button>
                  <button
                    onClick={handleGitConfigSave}
                    disabled={gitConfigSaving}
                    className="flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'var(--accent-green)', color: 'var(--bg-base)' }}
                  >
                    {gitConfigSaving ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={12} />
                        Save
                      </>
                    )}
                  </button>
                </div>
              </div>

              {gitConfigLoading ? (
                <div className="flex items-center justify-center py-8" style={{ color: 'var(--text-subtle)' }}>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Loading git config...
                </div>
              ) : (
                <div className="space-y-3">
                  {GIT_CONFIG_ITEMS.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-start gap-4 px-3 py-2 rounded"
                      style={{ backgroundColor: 'var(--bg-overlay)' }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {item.label}
                          </span>
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--accent-yellow)' }}>
                            {item.key}
                          </span>
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>
                          {item.description}
                        </div>
                      </div>
                      <div className="shrink-0" style={{ minWidth: 180 }}>
                        {item.type === 'select' && item.options ? (
                          <select
                            value={gitConfigValues[item.key] || ''}
                            onChange={(e) =>
                              setGitConfigValues((prev) => ({ ...prev, [item.key]: e.target.value }))
                            }
                            className="w-full px-2 py-1 rounded border text-xs"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-color)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            <option value="">(not set)</option>
                            {item.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={gitConfigValues[item.key] || ''}
                            onChange={(e) =>
                              setGitConfigValues((prev) => ({ ...prev, [item.key]: e.target.value }))
                            }
                            className="w-full px-2 py-1 rounded border text-xs"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-color)',
                              color: 'var(--text-primary)',
                            }}
                            placeholder="(not set)"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SettingsSection>
          </div>
        );

      case 'lfs':
        return (
          <div className="space-y-6">
            <SettingsSection title="Git LFS">
              <div className="text-xs mb-3" style={{ color: 'var(--text-subtle)' }}>
                Git Large File Storage (LFS) replaces large files such as audio samples, videos, datasets, and graphics with text pointers inside Git, while storing the file contents on a remote server.
              </div>

              {/* LFS availability status */}
              <div
                className="flex items-center gap-3 px-4 py-3 rounded"
                style={{ backgroundColor: 'var(--bg-surface)' }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: lfsAvailable ? 'var(--accent-green)' : 'var(--accent-red)',
                  }}
                />
                <div>
                  <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {lfsAvailable ? 'git-lfs is available' : 'git-lfs is NOT installed'}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>
                    {lfsAvailable
                      ? 'LFS operations are ready to use.'
                      : 'Install git-lfs to enable LFS support.'}
                  </div>
                </div>
              </div>
            </SettingsSection>

            {/* Tracked patterns */}
            <SettingsSection title="Tracked Patterns">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                  Patterns tracked by Git LFS (from .gitattributes)
                </span>
                <button
                  onClick={handleLfsRefreshTracks}
                  disabled={lfsTracksLoading}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Refresh tracked patterns"
                >
                  <RotateCcw size={12} className={lfsTracksLoading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>

              {lfsTracksLoading ? (
                <div className="flex items-center justify-center py-4" style={{ color: 'var(--text-subtle)' }}>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Loading...
                </div>
              ) : (
                <>
                  <div className="space-y-1.5 mb-3">
                    {lfsTracks.length > 0 ? (
                      lfsTracks.map((pattern, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-3 py-2 rounded"
                          style={{ backgroundColor: 'var(--bg-surface)' }}
                        >
                          <HardDrive size={14} style={{ color: 'var(--accent-blue)' }} />
                          <span className="text-xs font-mono flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                            {pattern}
                          </span>
                          <button
                            onClick={() => handleLfsUntrack(pattern)}
                            className="p-1 rounded transition-colors"
                            style={{ color: 'var(--accent-red)' }}
                            title="Untrack this pattern"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs py-4 text-center rounded" style={{ color: 'var(--text-subtle)', backgroundColor: 'var(--bg-surface)' }}>
                        No LFS patterns tracked.
                      </div>
                    )}
                  </div>

                  {/* Add new pattern */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={lfsNewPattern}
                      onChange={(e) => setLfsNewPattern(e.target.value)}
                      className="flex-1 px-2 py-1 rounded border text-xs"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                      placeholder="e.g., *.psd, *.zip, assets/*"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleLfsTrack();
                      }}
                    />
                    <button
                      onClick={handleLfsTrack}
                      disabled={!lfsNewPattern.trim() || !lfsAvailable}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                      style={{ backgroundColor: 'var(--accent-blue)', color: 'var(--bg-base)' }}
                    >
                      <Plus size={12} />
                      Track
                    </button>
                  </div>
                </>
              )}
            </SettingsSection>

            {/* LFS Operations */}
            <SettingsSection title="LFS Operations">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleLfsOperation('fetch')}
                  disabled={!lfsAvailable || lfsOperating}
                  className="flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--bg-overlay)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                >
                  <Download size={14} style={{ color: 'var(--accent-blue)' }} />
                  Fetch LFS
                </button>
                <button
                  onClick={() => handleLfsOperation('pull')}
                  disabled={!lfsAvailable || lfsOperating}
                  className="flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--bg-overlay)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                >
                  <Download size={14} style={{ color: 'var(--accent-green)' }} />
                  Pull LFS
                </button>
                <button
                  onClick={() => handleLfsOperation('push')}
                  disabled={!lfsAvailable || lfsOperating}
                  className="flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--bg-overlay)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                >
                  <Upload size={14} style={{ color: 'var(--accent-mauve)' }} />
                  Push LFS
                </button>
                <button
                  onClick={() => handleLfsOperation('prune')}
                  disabled={!lfsAvailable || lfsOperating}
                  className="flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--bg-overlay)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                >
                  <Eraser size={14} style={{ color: 'var(--accent-red)' }} />
                  Prune LFS
                </button>
              </div>
              {lfsOperating && (
                <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'var(--text-subtle)' }}>
                  <Loader2 size={14} className="animate-spin" />
                  {lfsOperatingAction}...
                </div>
              )}
            </SettingsSection>

            {/* LFS Locks */}
            <SettingsSection title="LFS Locks">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                  View and manage file locks
                </span>
                <button
                  onClick={handleLfsRefreshLocks}
                  disabled={lfsLocksLoading}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Refresh locks"
                >
                  <RefreshCw size={12} className={lfsLocksLoading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>

              {lfsLocksLoading ? (
                <div className="flex items-center justify-center py-4" style={{ color: 'var(--text-subtle)' }}>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Loading locks...
                </div>
              ) : (
                <div className="space-y-1.5">
                  {lfsLocks.length > 0 ? (
                    lfsLocks.map((lock, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-2 rounded"
                        style={{ backgroundColor: 'var(--bg-surface)' }}
                      >
                        <Lock size={14} style={{ color: 'var(--accent-yellow)' }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-mono truncate" style={{ color: 'var(--text-primary)' }}>
                            {lock.file}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>
                            {lock.locked_by && <span>by {lock.locked_by}</span>}
                            {lock.locked_by && lock.locked_at && <span> at {lock.locked_at}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleLfsUnlock(lock.file)}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                          style={{ color: 'var(--accent-red)' }}
                          title="Unlock this file"
                        >
                          <Unlock size={12} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs py-4 text-center rounded" style={{ color: 'var(--text-subtle)', backgroundColor: 'var(--bg-surface)' }}>
                      No active LFS locks.
                    </div>
                  )}
                </div>
              )}
            </SettingsSection>
          </div>
        );

      case 'integration':
        return (
          <SettingsSection title="External Tools">
            <SettingRow label="Terminal" description="External terminal application">
              <input
                type="text"
                value={preferences.integration.terminal}
                onChange={(e) => updateIntegration({ terminal: e.target.value })}
                className="px-2 py-1 rounded border text-sm flex-1"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                placeholder="e.g., /usr/bin/alacritty"
              />
            </SettingRow>
            <SettingRow label="Merge Tool" description="External merge tool">
              <input
                type="text"
                value={preferences.integration.merge_tool}
                onChange={(e) => updateIntegration({ merge_tool: e.target.value })}
                className="px-2 py-1 rounded border text-sm flex-1"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                placeholder="e.g., meld, vimdiff"
              />
            </SettingRow>
            <SettingRow label="Diff Tool" description="External diff tool">
              <input
                type="text"
                value={preferences.integration.diff_tool}
                onChange={(e) => updateIntegration({ diff_tool: e.target.value })}
                className="px-2 py-1 rounded border text-sm flex-1"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                placeholder="e.g., meld, kdiff3"
              />
            </SettingRow>
            <SettingRow label="Editor" description="External text editor">
              <input
                type="text"
                value={preferences.integration.editor}
                onChange={(e) => updateIntegration({ editor: e.target.value })}
                className="px-2 py-1 rounded border text-sm flex-1"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                placeholder="e.g., code, vim, nano"
              />
            </SettingRow>
            <SettingRow label="File Manager" description="External file manager">
              <input
                type="text"
                value={preferences.integration.file_manager}
                onChange={(e) => updateIntegration({ file_manager: e.target.value })}
                className="px-2 py-1 rounded border text-sm flex-1"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                placeholder="e.g., nautilus, explorer"
              />
            </SettingRow>
          </SettingsSection>
        );

      // ============================================================
      // Keybindings Tab - Full implementation
      // ============================================================
      case 'keybindings':
        return (
          <div className="space-y-4">
            <SettingsSection title="Keyboard Shortcuts">
              <div className="text-xs mb-3" style={{ color: 'var(--text-subtle)' }}>
                Shortcuts are defined in code and cannot be edited at runtime. Modifying shortcuts requires code changes and a restart.
              </div>

              {/* Search bar */}
              <div className="relative mb-4">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-subtle)' }} />
                <input
                  type="text"
                  value={keybindingSearch}
                  onChange={(e) => setKeybindingSearch(e.target.value)}
                  placeholder="Search shortcuts by name, key, or description..."
                  className="w-full pl-8 pr-3 py-1.5 rounded border text-sm"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* Summary */}
              <div className="flex items-center gap-4 mb-4 text-xs" style={{ color: 'var(--text-subtle)' }}>
                <span>{filteredKeybindings.length} shortcuts found</span>
                <span>{Object.keys(groupedKeybindings).length} categories</span>
              </div>

              {/* Grouped keybinding list */}
              {Object.entries(groupedKeybindings).map(([category, entries]) => (
                <div key={category} className="mb-4">
                  <div
                    className="text-xs font-semibold uppercase tracking-wider mb-2 px-2 py-1 rounded"
                    style={{ color: 'var(--accent-mauve)', backgroundColor: 'rgba(203, 166, 247, 0.08)' }}
                  >
                    {category}
                  </div>
                  <div className="space-y-1">
                    {entries.map((kb) => (
                      <div
                        key={kb.name}
                        className="flex items-center gap-3 px-3 py-2 rounded transition-colors"
                        style={{ backgroundColor: 'var(--bg-surface)' }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {kb.name}
                          </div>
                          <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-subtle)' }}>
                            {kb.description}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'rgba(137, 180, 250, 0.1)', color: 'var(--accent-blue)' }}
                          >
                            {kb.scope}
                          </span>
                          <kbd
                            className="px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap"
                            style={{
                              backgroundColor: 'var(--bg-overlay)',
                              color: 'var(--accent-yellow)',
                              border: '1px solid var(--border-color)',
                            }}
                          >
                            {kb.keys}
                          </kbd>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {filteredKeybindings.length === 0 && (
                <div className="text-center py-8 text-sm" style={{ color: 'var(--text-subtle)' }}>
                  No shortcuts matching "{keybindingSearch}"
                </div>
              )}
            </SettingsSection>
          </div>
        );

      // ============================================================
      // Notifications Tab - Full implementation
      // ============================================================
      case 'notifications':
        return (
          <div className="space-y-6">
            <SettingsSection title="Notification Settings">
              <SettingRow label="Enable Notifications" description="Show in-app notifications for operations">
                <ToggleSwitch
                  checked={preferences.notifications.enabled}
                  onChange={(v) => updateNotifications({ enabled: v })}
                />
              </SettingRow>
              <SettingRow label="Sound Effects" description="Play sounds for notifications">
                <ToggleSwitch
                  checked={preferences.notifications.sound_enabled}
                  onChange={(v) => updateNotifications({ sound_enabled: v })}
                />
              </SettingRow>
              <SettingRow label="Duration (seconds)" description="How long notifications stay visible">
                <input
                  type="number"
                  value={preferences.notifications.duration}
                  onChange={(e) => updateNotifications({ duration: Math.max(1, Math.min(60, Number(e.target.value))) })}
                  className="px-2 py-1 rounded border text-sm w-24"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  min={1}
                  max={60}
                  step={1}
                />
              </SettingRow>
              <SettingRow label="Position" description="Where notifications appear on screen">
                <select
                  value={preferences.notifications.position}
                  onChange={(e) => updateNotifications({ position: e.target.value as any })}
                  className="px-2 py-1 rounded border text-sm"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                >
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                </select>
              </SettingRow>
            </SettingsSection>

            {/* Preview section */}
            <SettingsSection title="Preview">
              <div className="text-xs mb-3" style={{ color: 'var(--text-subtle)' }}>
                Click the button below to test notification behavior with current settings.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    addNotification({
                      type: 'success',
                      title: 'Notification Test',
                      message: `Duration: ${preferences.notifications.duration}s, Position: ${preferences.notifications.position}`,
                      duration: preferences.notifications.duration * 1000,
                    })
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                  style={{ backgroundColor: 'var(--accent-green)', color: 'var(--bg-base)' }}
                >
                  <Bell size={12} />
                  Test Success
                </button>
                <button
                  onClick={() =>
                    addNotification({
                      type: 'error',
                      title: 'Notification Test',
                      message: 'This is an error notification preview.',
                      duration: preferences.notifications.duration * 1000,
                    })
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                  style={{ backgroundColor: 'var(--accent-red)', color: 'var(--bg-base)' }}
                >
                  <Bell size={12} />
                  Test Error
                </button>
                <button
                  onClick={() =>
                    addNotification({
                      type: 'warning',
                      title: 'Notification Test',
                      message: 'This is a warning notification preview.',
                      duration: preferences.notifications.duration * 1000,
                    })
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                  style={{ backgroundColor: 'var(--accent-yellow)', color: 'var(--bg-base)' }}
                >
                  <Bell size={12} />
                  Test Warning
                </button>
              </div>
            </SettingsSection>
          </div>
        );

      // ============================================================
      // Security Tab - Full implementation
      // ============================================================
      case 'security':
        return (
          <div className="space-y-6">
            <SettingsSection title="SSH Key Management">
              <SettingRow label="Default SSH Key Path" description="Path to the default SSH private key for Git operations">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={preferences.security.ssh_key_path}
                    onChange={(e) => updateSecurity({ ssh_key_path: e.target.value })}
                    className="px-2 py-1 rounded border text-sm flex-1"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    placeholder="~/.ssh/id_rsa"
                  />
                  <button
                    onClick={async () => {
                      try {
                        const { open } = await import('@tauri-apps/plugin-dialog');
                        const selected = await open({
                          multiple: false,
                          directory: false,
                          title: 'Select SSH Private Key',
                        });
                        if (selected && typeof selected === 'string') {
                          updateSecurity({ ssh_key_path: selected });
                        }
                      } catch {
                        // Dialog not available in browser preview
                        addNotification({ type: 'warning', title: 'Dialog unavailable', message: 'File dialog requires Tauri runtime.' });
                      }
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                    style={{ backgroundColor: 'var(--bg-overlay)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                    title="Browse for SSH key"
                  >
                    <FolderOpen size={12} />
                    Browse
                  </button>
                </div>
              </SettingRow>

              {/* SSH Key List */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Known SSH Keys
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                    {preferences.security.ssh_keys.length} key(s)
                  </span>
                </div>

                {preferences.security.ssh_keys.length > 0 ? (
                  <div className="space-y-1.5">
                    {preferences.security.ssh_keys.map((keyPath) => (
                      <div
                        key={keyPath}
                        className="flex items-center gap-2 px-3 py-2 rounded"
                        style={{ backgroundColor: 'var(--bg-surface)' }}
                      >
                        <Key size={14} style={{ color: 'var(--accent-yellow)' }} />
                        <span className="text-xs font-mono flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                          {keyPath}
                        </span>
                        <button
                          onClick={() => handleRemoveSshKey(keyPath)}
                          className="p-1 rounded transition-colors"
                          style={{ color: 'var(--accent-red)' }}
                          title="Remove key"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs py-4 text-center rounded" style={{ color: 'var(--text-subtle)', backgroundColor: 'var(--bg-surface)' }}>
                    No SSH keys configured. Add one below.
                  </div>
                )}

                {/* Add new SSH key */}
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="text"
                    value={newSshKeyPath}
                    onChange={(e) => setNewSshKeyPath(e.target.value)}
                    className="flex-1 px-2 py-1 rounded border text-xs"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    placeholder="Enter SSH key path (e.g., ~/.ssh/id_ed25519)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddSshKey();
                    }}
                  />
                  <button
                    onClick={handleAddSshKey}
                    disabled={!newSshKeyPath.trim()}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'var(--accent-blue)', color: 'var(--bg-base)' }}
                  >
                    <Plus size={12} />
                    Add
                  </button>
                </div>
              </div>
            </SettingsSection>

            <SettingsSection title="GPG & Credentials">
              <SettingRow label="GPG Key Path" description="Path to GPG key for commit signing">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={preferences.security.gpg_key_path}
                    onChange={(e) => updateSecurity({ gpg_key_path: e.target.value })}
                    className="px-2 py-1 rounded border text-sm flex-1"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    placeholder="gpg"
                  />
                </div>
              </SettingRow>
              <SettingRow label="Credential Cache" description="Cache Git credentials locally">
                <ToggleSwitch
                  checked={preferences.security.credential_cache}
                  onChange={(v) => updateSecurity({ credential_cache: v })}
                />
              </SettingRow>
            </SettingsSection>
          </div>
        );

      // ============================================================
      // Storage Tab - Full implementation
      // ============================================================
      case 'storage':
        return (
          <div className="space-y-6">
            <SettingsSection title="Storage Management">
              {/* Storage usage info */}
              <div className="space-y-3">
                <div
                  className="flex items-center justify-between px-4 py-3 rounded"
                  style={{ backgroundColor: 'var(--bg-surface)' }}
                >
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      localStorage Usage
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>
                      Browser local storage for preferences and cached data
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold" style={{ color: 'var(--accent-blue)' }}>
                      {storageSize}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                      {storageKeyCount} key(s)
                    </div>
                  </div>
                </div>

                {/* Storage keys detail */}
                <div
                  className="rounded overflow-hidden"
                  style={{ border: '1px solid var(--border-color)' }}
                >
                  <div
                    className="px-3 py-2 text-xs font-medium"
                    style={{ backgroundColor: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}
                  >
                    Stored Keys
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).map((key) => {
                      if (!key) return null;
                      const value = localStorage.getItem(key);
                      const size = value ? (key.length + value.length) * 2 : 0;
                      const sizeStr = size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`;
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between px-3 py-1.5 text-xs"
                          style={{ borderBottom: '1px solid var(--border-color)' }}
                        >
                          <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                            {key}
                          </span>
                          <span style={{ color: 'var(--text-subtle)' }}>{sizeStr}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </SettingsSection>

            <SettingsSection title="Actions">
              <div className="space-y-3">
                <SettingRow label="Clear Cache" description="Remove all cached data except preferences">
                  <button
                    onClick={handleClearCache}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                    style={{ backgroundColor: 'var(--accent-red)', color: 'var(--bg-base)' }}
                  >
                    <Trash2 size={12} />
                    Clear Cache
                  </button>
                </SettingRow>
                <SettingRow label="Reset All Settings" description="Reset all settings to factory defaults">
                  <button
                    onClick={() => {
                      resetToDefaults();
                      addNotification({ type: 'success', title: 'Settings reset', message: 'All settings have been reset to defaults.' });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                    style={{ backgroundColor: 'var(--accent-red)', color: 'var(--bg-base)' }}
                  >
                    <RotateCcw size={12} />
                    Reset to Defaults
                  </button>
                </SettingRow>
              </div>
            </SettingsSection>
          </div>
        );

      // ============================================================
      // Network Tab - Full implementation
      // ============================================================
      case 'network':
        return (
          <div className="space-y-6">
            <SettingsSection title="HTTP Proxy">
              <SettingRow label="Proxy Host" description="HTTP/HTTPS proxy server hostname or IP">
                <input
                  type="text"
                  value={preferences.network.proxy_host}
                  onChange={(e) => updateNetwork({ proxy_host: e.target.value })}
                  className="px-2 py-1 rounded border text-sm flex-1"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="proxy.example.com"
                />
              </SettingRow>
              <SettingRow label="Proxy Port" description="HTTP/HTTPS proxy server port">
                <input
                  type="number"
                  value={preferences.network.proxy_port || ''}
                  onChange={(e) => updateNetwork({ proxy_port: Number(e.target.value) })}
                  className="px-2 py-1 rounded border text-sm w-24"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="8080"
                  min={1}
                  max={65535}
                />
              </SettingRow>
            </SettingsSection>

            <SettingsSection title="Proxy Authentication">
              <SettingRow label="Username" description="Username for proxy authentication">
                <input
                  type="text"
                  value={preferences.network.proxy_username}
                  onChange={(e) => updateNetwork({ proxy_username: e.target.value })}
                  className="px-2 py-1 rounded border text-sm flex-1"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="username"
                  autoComplete="off"
                />
              </SettingRow>
              <SettingRow label="Password" description="Password for proxy authentication">
                <input
                  type="password"
                  value={preferences.network.proxy_password}
                  onChange={(e) => updateNetwork({ proxy_password: e.target.value })}
                  className="px-2 py-1 rounded border text-sm flex-1"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="password"
                  autoComplete="off"
                />
              </SettingRow>
            </SettingsSection>

            <SettingsSection title="Connection">
              <SettingRow label="SSL Verification" description="Verify SSL certificates for HTTPS connections">
                <ToggleSwitch
                  checked={preferences.network.ssl_verify}
                  onChange={(v) => updateNetwork({ ssl_verify: v })}
                />
              </SettingRow>
              <SettingRow label="Connection Timeout (seconds)" description="Timeout for network operations">
                <input
                  type="number"
                  value={preferences.network.connection_timeout}
                  onChange={(e) => updateNetwork({ connection_timeout: Math.max(5, Math.min(300, Number(e.target.value))) })}
                  className="px-2 py-1 rounded border text-sm w-24"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  min={5}
                  max={300}
                  step={5}
                />
              </SettingRow>
            </SettingsSection>

            {/* Proxy status indicator */}
            <SettingsSection title="Status">
              <div
                className="flex items-center gap-3 px-4 py-3 rounded"
                style={{ backgroundColor: 'var(--bg-surface)' }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: preferences.network.proxy_host
                      ? 'var(--accent-green)'
                      : 'var(--text-subtle)',
                  }}
                />
                <div>
                  <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {preferences.network.proxy_host
                      ? `Proxy configured: ${preferences.network.proxy_host}:${preferences.network.proxy_port || 'default'}`
                      : 'No proxy configured'}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>
                    {preferences.network.ssl_verify
                      ? 'SSL verification enabled'
                      : 'SSL verification disabled (insecure)'}
                    {' | '}
                    Timeout: {preferences.network.connection_timeout}s
                  </div>
                </div>
              </div>
            </SettingsSection>
          </div>
        );

      case 'command_log':
        return (
          <div className="space-y-6">
            <SettingsSection title="Command Log">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                  {commandLogCount} log entries recorded. Shows recent git commands executed by the application.
                </span>
                <button
                  onClick={handleClearCommandLogs}
                  className="flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-colors"
                  style={{ backgroundColor: 'var(--accent-red)', color: 'var(--bg-base)' }}
                >
                  <Trash2 size={12} />
                  Clear All
                </button>
              </div>

              {commandLogLoading ? (
                <div className="flex items-center justify-center py-8" style={{ color: 'var(--text-subtle)' }}>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Loading command logs...
                </div>
              ) : commandLogs.length === 0 ? (
                <div className="text-center py-8 text-sm" style={{ color: 'var(--text-subtle)' }}>
                  No command logs recorded yet. Execute git operations to see logs here.
                </div>
              ) : (
                <div
                  className="rounded overflow-hidden"
                  style={{ border: '1px solid var(--border-color)' }}
                >
                  {/* Header */}
                  <div
                    className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium"
                    style={{ backgroundColor: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}
                  >
                    <div className="col-span-2">Time</div>
                    <div className="col-span-2">Command</div>
                    <div className="col-span-4">Arguments</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-1">Duration</div>
                    <div className="col-span-2">Exit Code</div>
                  </div>
                  {/* Rows */}
                  <div className="max-h-96 overflow-y-auto">
                    {commandLogs.map((entry) => (
                      <div
                        key={entry.id}
                        className="grid grid-cols-12 gap-2 px-3 py-2 text-xs transition-colors"
                        style={{ borderBottom: '1px solid var(--border-color)' }}
                      >
                        <div className="col-span-2 font-mono" style={{ color: 'var(--text-subtle)' }}>
                          {new Date(entry.timestamp * 1000).toLocaleTimeString()}
                        </div>
                        <div className="col-span-2 font-mono" style={{ color: 'var(--accent-blue)' }}>
                          {entry.command}
                        </div>
                        <div className="col-span-4 font-mono truncate" style={{ color: 'var(--text-primary)' }} title={entry.args}>
                          {entry.args}
                        </div>
                        <div className="col-span-1">
                          <span
                            className="px-1.5 py-0.5 rounded text-xs"
                            style={{
                              backgroundColor: entry.success ? 'rgba(166, 227, 161, 0.15)' : 'rgba(243, 139, 168, 0.15)',
                              color: entry.success ? 'var(--accent-green)' : 'var(--accent-red)',
                            }}
                          >
                            {entry.success ? 'OK' : 'FAIL'}
                          </span>
                        </div>
                        <div className="col-span-1 font-mono" style={{ color: 'var(--text-subtle)' }}>
                          {entry.duration_ms}ms
                        </div>
                        <div className="col-span-2 font-mono" style={{ color: 'var(--text-subtle)' }}>
                          {entry.exit_code}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SettingsSection>
          </div>
        );

      case 'custom_actions':
        return (
          <div className="space-y-6">
            <SettingsSection title="Custom Actions">
              <div className="text-xs mb-3" style={{ color: 'var(--text-subtle)' }}>
                Define custom shell commands that can be run on your repository. Variables like {'{RepoPath}'}, {'{Branch}'}, {'{CommitSHA}'} are auto-replaced.
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                  {customActions.length} action(s) configured
                </span>
                <button
                  onClick={handleAddCustomAction}
                  className="flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-colors"
                  style={{ backgroundColor: 'var(--accent-green)', color: 'var(--bg-base)' }}
                >
                  <Plus size={12} />
                  Add Action
                </button>
              </div>

              {customActionsLoading ? (
                <div className="flex items-center justify-center py-8" style={{ color: 'var(--text-subtle)' }}>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Loading custom actions...
                </div>
              ) : customActions.length === 0 ? (
                <div className="text-center py-8 text-sm rounded" style={{ color: 'var(--text-subtle)', backgroundColor: 'var(--bg-surface)' }}>
                  No custom actions configured. Click "Add Action" to create one.
                </div>
              ) : (
                <div className="space-y-2">
                  {customActions.map((action) => (
                    <div
                      key={action.id}
                      className="flex items-center gap-3 px-4 py-3 rounded"
                      style={{ backgroundColor: 'var(--bg-surface)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {action.name}
                          </span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'rgba(137, 180, 250, 0.1)', color: 'var(--accent-blue)' }}
                          >
                            {action.scope}
                          </span>
                        </div>
                        <div className="text-xs font-mono mt-1 truncate" style={{ color: 'var(--text-subtle)' }}>
                          {action.command}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleTestAction(action)}
                          className="p-1.5 rounded transition-colors"
                          style={{ color: 'var(--accent-green)' }}
                          title="Test run"
                        >
                          <Play size={14} />
                        </button>
                        <button
                          onClick={() => handleEditCustomAction(action)}
                          className="p-1.5 rounded transition-colors"
                          style={{ color: 'var(--accent-blue)' }}
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomAction(action.id)}
                          className="p-1.5 rounded transition-colors"
                          style={{ color: 'var(--accent-red)' }}
                          title="Delete"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Test output */}
              {actionOutput && (
                <div
                  className="rounded overflow-hidden"
                  style={{ border: '1px solid var(--border-color)' }}
                >
                  <div
                    className="px-3 py-2 text-xs font-medium"
                    style={{ backgroundColor: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}
                  >
                    Test Output
                  </div>
                  <pre
                    className="p-3 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto"
                    style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)' }}
                  >
                    {actionOutput}
                  </pre>
                </div>
              )}
            </SettingsSection>

            {/* Action Edit Dialog */}
            {actionDialogOpen && editingAction && (
              <div
                className="fixed inset-0 flex items-center justify-center z-50"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                onClick={() => { setActionDialogOpen(false); setEditingAction(null); }}
              >
                <div
                  className="w-full max-w-lg rounded-lg p-6 space-y-4"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {customActions.find((a) => a.id === editingAction.id) ? 'Edit Custom Action' : 'New Custom Action'}
                    </h3>
                    <button
                      onClick={() => { setActionDialogOpen(false); setEditingAction(null); }}
                      style={{ color: 'var(--text-subtle)' }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Name</label>
                      <input
                        type="text"
                        value={editingAction.name}
                        onChange={(e) => setEditingAction({ ...editingAction, name: e.target.value })}
                        className="w-full px-2 py-1.5 rounded border text-sm"
                        style={{ backgroundColor: 'var(--bg-overlay)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                        placeholder="e.g., Run Tests"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Command</label>
                      <input
                        type="text"
                        value={editingAction.command}
                        onChange={(e) => setEditingAction({ ...editingAction, command: e.target.value })}
                        className="w-full px-2 py-1.5 rounded border text-sm font-mono"
                        style={{ backgroundColor: 'var(--bg-overlay)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                        placeholder="e.g., npm test"
                      />
                      <div className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
                        Variables: {'{RepoPath}'}, {'{Branch}'}, {'{CommitSHA}'}, {'{FilePath}'}, {'{TagName}'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Working Directory</label>
                        <select
                          value={editingAction.working_directory}
                          onChange={(e) => setEditingAction({ ...editingAction, working_directory: e.target.value })}
                          className="w-full px-2 py-1.5 rounded border text-sm"
                          style={{ backgroundColor: 'var(--bg-overlay)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                        >
                          <option value="repo">Repository Root</option>
                          <option value="home">Home Directory</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Scope</label>
                        <select
                          value={editingAction.scope}
                          onChange={(e) => setEditingAction({ ...editingAction, scope: e.target.value })}
                          className="w-full px-2 py-1.5 rounded border text-sm"
                          style={{ backgroundColor: 'var(--bg-overlay)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                        >
                          <option value="repository">Repository</option>
                          <option value="commit">Commit</option>
                          <option value="branch">Branch</option>
                          <option value="tag">Tag</option>
                          <option value="remote">Remote</option>
                          <option value="file">File</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Variables</label>
                      {editingAction.variables.length === 0 && (
                        <div className="text-xs py-2" style={{ color: 'var(--text-subtle)' }}>
                          No variables defined. Add variables for user input prompts.
                        </div>
                      )}
                      {editingAction.variables.map((v, i) => (
                        <div key={i} className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={v.name}
                            onChange={(e) => {
                              const newVars = [...editingAction.variables];
                              newVars[i] = { ...newVars[i], name: e.target.value };
                              setEditingAction({ ...editingAction, variables: newVars });
                            }}
                            className="flex-1 px-2 py-1 rounded border text-xs"
                            style={{ backgroundColor: 'var(--bg-overlay)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                            placeholder="Variable name"
                          />
                          <select
                            value={v.control_type}
                            onChange={(e) => {
                              const newVars = [...editingAction.variables];
                              newVars[i] = { ...newVars[i], control_type: e.target.value as CustomActionVariable['control_type'] };
                              setEditingAction({ ...editingAction, variables: newVars });
                            }}
                            className="px-2 py-1 rounded border text-xs"
                            style={{ backgroundColor: 'var(--bg-overlay)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                          >
                            <option value="textbox">Text</option>
                            <option value="path_selector">Path</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="combobox">Combo</option>
                          </select>
                          <input
                            type="text"
                            value={v.default_value}
                            onChange={(e) => {
                              const newVars = [...editingAction.variables];
                              newVars[i] = { ...newVars[i], default_value: e.target.value };
                              setEditingAction({ ...editingAction, variables: newVars });
                            }}
                            className="w-24 px-2 py-1 rounded border text-xs"
                            style={{ backgroundColor: 'var(--bg-overlay)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                            placeholder="Default"
                          />
                          <button
                            onClick={() => {
                              const newVars = editingAction.variables.filter((_, j) => j !== i);
                              setEditingAction({ ...editingAction, variables: newVars });
                            }}
                            style={{ color: 'var(--accent-red)' }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          setEditingAction({
                            ...editingAction,
                            variables: [...editingAction.variables, { name: '', control_type: 'textbox', default_value: '', options: [] }],
                          });
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                        style={{ color: 'var(--accent-blue)', border: '1px dashed var(--border-color)' }}
                      >
                        <Plus size={10} />
                        Add Variable
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => { setActionDialogOpen(false); setEditingAction(null); }}
                      className="px-3 py-1.5 rounded text-xs"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveActionDialog}
                      className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                      style={{ backgroundColor: 'var(--accent-green)', color: 'var(--bg-base)' }}
                    >
                      <Save size={12} />
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      // ============================================================
      // AI Service Tab
      // ============================================================
      case 'ai':
        return (
          <div className="space-y-6">
            <SettingsSection title={t('settings.ai')}>
              <SettingRow label={t('settings.aiProvider')} description={t('settings.aiProviderDesc')}>
                <select
                  value={preferences.ai.provider}
                  onChange={(e) => handleAIProviderChange(e.target.value)}
                  className="px-2 py-1 rounded border text-sm"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                >
                  <option value="deepseek">DeepSeek</option>
                  <option value="qwen">{t('settings.aiQwen')}</option>
                  <option value="wenxin">{t('settings.aiWenxin')}</option>
                  <option value="openai">OpenAI</option>
                  <option value="ollama">Ollama</option>
                  <option value="custom">{t('settings.aiCustom')}</option>
                </select>
              </SettingRow>

              <SettingRow label="API URL" description={t('settings.aiUrlDesc')}>
                <input
                  type="text"
                  value={preferences.ai.api_url}
                  onChange={(e) => updateAI({ api_url: e.target.value })}
                  className="px-2 py-1 rounded border text-sm flex-1"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="https://api.example.com/v1"
                />
              </SettingRow>

              <SettingRow label="API Key" description={t('settings.aiKeyDesc')}>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type={aiShowApiKey ? 'text' : 'password'}
                    value={preferences.ai.api_key}
                    onChange={(e) => updateAI({ api_key: e.target.value })}
                    className="px-2 py-1 rounded border text-sm flex-1"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    placeholder="sk-..."
                    autoComplete="off"
                  />
                  <button
                    onClick={() => setAiShowApiKey(!aiShowApiKey)}
                    className="p-1.5 rounded transition-colors"
                    style={{ color: 'var(--text-subtle)' }}
                    title={aiShowApiKey ? t('settings.hideKey') : t('settings.showKey')}
                  >
                    {aiShowApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </SettingRow>

              <SettingRow label={t('settings.aiModel')} description={t('settings.aiModelDesc')}>
                <input
                  type="text"
                  value={preferences.ai.model_name}
                  onChange={(e) => updateAI({ model_name: e.target.value })}
                  className="px-2 py-1 rounded border text-sm flex-1"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="gpt-3.5-turbo"
                />
              </SettingRow>

              <SettingRow label={t('settings.aiExtraPrompt')} description={t('settings.aiExtraPromptDesc')}>
                <textarea
                  value={preferences.ai.extra_prompt}
                  onChange={(e) => updateAI({ extra_prompt: e.target.value })}
                  className="w-full px-2 py-1.5 rounded border text-sm font-mono"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', minHeight: 60, resize: 'vertical' }}
                  placeholder={t('settings.aiExtraPromptPlaceholder')}
                  rows={3}
                />
              </SettingRow>

              <SettingRow label={t('settings.aiReadKeyFromEnv')} description={t('settings.aiReadKeyFromEnvDesc')}>
                <ToggleSwitch
                  checked={preferences.ai.read_key_from_env}
                  onChange={(v) => updateAI({ read_key_from_env: v })}
                />
              </SettingRow>
            </SettingsSection>

            {/* AI Actions */}
            <SettingsSection title={t('settings.aiActions')}>
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={handleAIFetchModels}
                  disabled={aiModelsLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent-blue)', color: 'var(--bg-base)' }}
                >
                  {aiModelsLoading ? <Loader2 size={12} className="animate-spin" /> : <ScanSearch size={12} />}
                  {t('settings.aiFetchModels')}
                </button>
                <button
                  onClick={handleAITestGenerate}
                  disabled={aiTestLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent-green)', color: 'var(--bg-base)' }}
                >
                  {aiTestLoading ? <Loader2 size={12} className="animate-spin" /> : <TestTube size={12} />}
                  {t('settings.aiTestGenerate')}
                </button>
              </div>

              {/* Models list */}
              {aiModels.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs mb-1.5" style={{ color: 'var(--text-subtle)' }}>
                    {t('settings.aiAvailableModels')} ({aiModels.length})
                  </div>
                  <div
                    className="rounded overflow-hidden max-h-32 overflow-y-auto"
                    style={{ border: '1px solid var(--border-color)' }}
                  >
                    {aiModels.map((model, idx) => (
                      <button
                        key={idx}
                        onClick={() => updateAI({ model_name: model })}
                        className="w-full text-left px-3 py-1.5 text-xs font-mono transition-colors"
                        style={{
                          backgroundColor: preferences.ai.model_name === model ? 'rgba(137, 180, 250, 0.1)' : 'var(--bg-surface)',
                          color: preferences.ai.model_name === model ? 'var(--accent-blue)' : 'var(--text-primary)',
                          borderBottom: '1px solid var(--border-color)',
                        }}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Test message result */}
              {aiTestMessage && (
                <div
                  className="rounded overflow-hidden"
                  style={{ border: '1px solid var(--border-color)' }}
                >
                  <div
                    className="px-3 py-2 text-xs font-medium"
                    style={{ backgroundColor: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}
                  >
                    {t('settings.aiTestResult')}
                  </div>
                  <pre
                    className="p-3 text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto"
                    style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)' }}
                  >
                    {aiTestMessage}
                  </pre>
                </div>
              )}
            </SettingsSection>
          </div>
        );

      // ============================================================
      // Code Hosting Tab
      // ============================================================
      case 'code_hosting':
        return (
          <div className="space-y-6">
            <SettingsSection title={t('settings.code_hosting')}>
              <div className="text-xs mb-3" style={{ color: 'var(--text-subtle)' }}>
                {t('settings.codeHostingDesc')}
              </div>

              {([
                { key: 'gitee_token' as const, label: 'Gitee', icon: <GitFork size={14} style={{ color: 'var(--accent-red)' }} /> },
                { key: 'github_token' as const, label: 'GitHub', icon: <GitBranch size={14} style={{ color: 'var(--text-primary)' }} /> },
                { key: 'gitlab_token' as const, label: 'GitLab', icon: <GitFork size={14} style={{ color: 'var(--accent-orange)' }} /> },
                { key: 'coding_token' as const, label: 'Coding', icon: <GitFork size={14} style={{ color: 'var(--accent-blue)' }} /> },
                { key: 'webee_token' as const, label: t('settings.webee'), icon: <GitFork size={14} style={{ color: 'var(--accent-yellow)' }} /> },
                { key: 'codehub_token' as const, label: 'CodeHub', icon: <GitFork size={14} style={{ color: 'var(--accent-teal)' }} /> },
              ]).map((platform) => (
                <div
                  key={platform.key}
                  className="flex items-center gap-3 px-4 py-3 rounded"
                  style={{ backgroundColor: 'var(--bg-surface)' }}
                >
                  {platform.icon}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {platform.label}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" style={{ minWidth: 300 }}>
                    <input
                      type="password"
                      value={preferences.code_hosting[platform.key]}
                      onChange={(e) => updateCodeHosting({ [platform.key]: e.target.value })}
                      className="flex-1 px-2 py-1 rounded border text-xs"
                      style={{ backgroundColor: 'var(--bg-overlay)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                      placeholder={`${platform.label} Token`}
                      autoComplete="off"
                    />
                    <button
                      onClick={() => addNotification({ type: 'success', title: `${platform.label} token saved` })}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
                      style={{ backgroundColor: 'var(--accent-green)', color: 'var(--bg-base)' }}
                    >
                      <Save size={12} />
                      {t('common.save')}
                    </button>
                  </div>
                </div>
              ))}
            </SettingsSection>

            {/* Auto detect remote platform */}
            <SettingsSection title={t('settings.autoDetect')}>
              <div className="text-xs mb-3" style={{ color: 'var(--text-subtle)' }}>
                {t('settings.autoDetectDesc')}
              </div>
              <button
                onClick={async () => {
                  try {
                    const repoPath = useGitStore.getState().repoPath;
                    if (!repoPath) {
                      addNotification({ type: 'warning', title: 'No repository open' });
                      return;
                    }
                    const remotes = useGitStore.getState().remotes;
                    const detectedPlatforms = new Set<string>();
                    for (const remote of remotes) {
                      const url = remote.url.toLowerCase();
                      if (url.includes('gitee.com')) detectedPlatforms.add('Gitee');
                      else if (url.includes('github.com')) detectedPlatforms.add('GitHub');
                      else if (url.includes('gitlab.com')) detectedPlatforms.add('GitLab');
                      else if (url.includes('coding.net')) detectedPlatforms.add('Coding');
                    }
                    if (detectedPlatforms.size > 0) {
                      addNotification({
                        type: 'success',
                        title: t('settings.detectedPlatforms'),
                        message: Array.from(detectedPlatforms).join(', '),
                      });
                    } else {
                      addNotification({ type: 'info', title: t('settings.noPlatformsDetected') });
                    }
                  } catch (err) {
                    addNotification({ type: 'error', title: 'Detection failed', message: String(err) });
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={{ backgroundColor: 'var(--accent-blue)', color: 'var(--bg-base)' }}
              >
                <ScanSearch size={12} />
                {t('settings.detectRemotePlatform')}
              </button>
            </SettingsSection>
          </div>
        );

      // ============================================================
      // Mirror Tab
      // ============================================================
      case 'mirror':
        return (
          <div className="space-y-6">
            <SettingsSection title={t('settings.mirror')}>
              <SettingRow label={t('settings.mirrorEnable')} description={t('settings.mirrorEnableDesc')}>
                <ToggleSwitch
                  checked={preferences.mirror.enabled}
                  onChange={(v) => updateMirror({ enabled: v })}
                />
              </SettingRow>

              <SettingRow label={t('settings.mirrorSource')} description={t('settings.mirrorSourceDesc')}>
                <select
                  value={preferences.mirror.source}
                  onChange={(e) => updateMirror({ source: e.target.value as any })}
                  className="px-2 py-1 rounded border text-sm"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                >
                  <option value="auto">{t('settings.mirrorAuto')}</option>
                  <option value="gitee">Gitee</option>
                  <option value="fastgit">FastGit</option>
                  <option value="ghproxy">GhProxy</option>
                  <option value="kkgithub">KKGitHub</option>
                  <option value="custom">{t('settings.mirrorCustom')}</option>
                </select>
              </SettingRow>

              {preferences.mirror.source === 'custom' && (
                <SettingRow label={t('settings.mirrorCustomUrl')} description={t('settings.mirrorCustomUrlDesc')}>
                  <input
                    type="text"
                    value={preferences.mirror.custom_url}
                    onChange={(e) => updateMirror({ custom_url: e.target.value })}
                    className="px-2 py-1 rounded border text-sm flex-1"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    placeholder="https://mirror.example.com"
                  />
                </SettingRow>
              )}

              <SettingRow label={t('settings.mirrorCloneOnly')} description={t('settings.mirrorCloneOnlyDesc')}>
                <ToggleSwitch
                  checked={preferences.mirror.clone_only}
                  onChange={(v) => updateMirror({ clone_only: v })}
                />
              </SettingRow>
            </SettingsSection>

            {/* Exclude domains */}
            <SettingsSection title={t('settings.mirrorExcludeDomains')}>
              <div className="text-xs mb-3" style={{ color: 'var(--text-subtle)' }}>
                {t('settings.mirrorExcludeDomainsDesc')}
              </div>

              <div className="space-y-1.5 mb-3">
                {preferences.mirror.exclude_domains.map((domain) => (
                  <div
                    key={domain}
                    className="flex items-center gap-2 px-3 py-2 rounded"
                    style={{ backgroundColor: 'var(--bg-surface)' }}
                  >
                    <span className="text-xs font-mono flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                      {domain}
                    </span>
                    <button
                      onClick={() => handleMirrorRemoveExclude(domain)}
                      className="p-1 rounded transition-colors"
                      style={{ color: 'var(--accent-red)' }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={mirrorExcludeInput}
                  onChange={(e) => setMirrorExcludeInput(e.target.value)}
                  className="flex-1 px-2 py-1 rounded border text-xs"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="e.g., github.com"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleMirrorAddExclude(); }}
                />
                <button
                  onClick={handleMirrorAddExclude}
                  disabled={!mirrorExcludeInput.trim()}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent-blue)', color: 'var(--bg-base)' }}
                >
                  <Plus size={12} />
                  {t('common.add')}
                </button>
              </div>
            </SettingsSection>

            {/* Latency test */}
            <SettingsSection title={t('settings.mirrorLatencyTest')}>
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={handleMirrorTestLatency}
                  disabled={mirrorLatencyLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent-blue)', color: 'var(--bg-base)' }}
                >
                  {mirrorLatencyLoading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                  {t('settings.mirrorTestLatency')}
                </button>
              </div>

              {Object.keys(mirrorLatencyResult).length > 0 && (
                <div className="space-y-1.5">
                  {Object.entries(mirrorLatencyResult).map(([name, latency]) => (
                    <div
                      key={name}
                      className="flex items-center gap-3 px-3 py-2 rounded"
                      style={{ backgroundColor: 'var(--bg-surface)' }}
                    >
                      <span className="text-xs font-medium flex-1" style={{ color: 'var(--text-primary)' }}>
                        {name}
                      </span>
                      <span
                        className="text-xs font-mono"
                        style={{
                          color: latency < 200 ? 'var(--accent-green)' : latency < 500 ? 'var(--accent-yellow)' : 'var(--accent-red)',
                        }}
                      >
                        {latency}ms
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </SettingsSection>
          </div>
        );

      // ============================================================
      // Commit Settings Tab
      // ============================================================
      case 'commit':
        return (
          <div className="space-y-6">
            <SettingsSection title={t('settings.commit')}>
              <SettingRow label={t('settings.conventionalCommits')} description={t('settings.conventionalCommitsDesc')}>
                <ToggleSwitch
                  checked={preferences.commit.conventional_commits}
                  onChange={(v) => updateCommit({ conventional_commits: v })}
                />
              </SettingRow>

              <SettingRow label={t('settings.commitHistoryCount')} description={t('settings.commitHistoryCountDesc')}>
                <input
                  type="number"
                  value={preferences.commit.history_count}
                  onChange={(e) => updateCommit({ history_count: Math.max(1, Math.min(50, Number(e.target.value))) })}
                  className="px-2 py-1 rounded border text-sm w-24"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  min={1}
                  max={50}
                />
              </SettingRow>

              <SettingRow label={t('settings.commitTemplate')} description={t('settings.commitTemplateDesc')}>
                <textarea
                  value={preferences.commit.commit_template}
                  onChange={(e) => updateCommit({ commit_template: e.target.value })}
                  className="w-full px-2 py-1.5 rounded border text-sm font-mono"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', minHeight: 60, resize: 'vertical' }}
                  placeholder={t('settings.commitTemplatePlaceholder')}
                  rows={3}
                />
              </SettingRow>

              <SettingRow label={t('settings.checkTrailingWhitespace')} description={t('settings.checkTrailingWhitespaceDesc')}>
                <ToggleSwitch
                  checked={preferences.commit.check_trailing_whitespace}
                  onChange={(v) => updateCommit({ check_trailing_whitespace: v })}
                />
              </SettingRow>

              <SettingRow label={t('settings.checkBom')} description={t('settings.checkBomDesc')}>
                <ToggleSwitch
                  checked={preferences.commit.check_bom}
                  onChange={(v) => updateCommit({ check_bom: v })}
                />
              </SettingRow>
            </SettingsSection>

            {/* Commit Types JSON Editor */}
            <SettingsSection title={t('settings.commitTypes')}>
              <div className="text-xs mb-3" style={{ color: 'var(--text-subtle)' }}>
                {t('settings.commitTypesDesc')}
              </div>
              <textarea
                value={commitTypesJson || JSON.stringify(preferences.commit.commit_types, null, 2)}
                onChange={(e) => handleCommitTypesJsonChange(e.target.value)}
                className="w-full px-2 py-1.5 rounded border text-xs font-mono"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: commitTypesJsonError ? 'var(--accent-red)' : 'var(--border-color)',
                  color: 'var(--text-primary)',
                  minHeight: 200,
                  resize: 'vertical',
                }}
                rows={10}
                onFocus={() => {
                  if (!commitTypesJson) {
                    setCommitTypesJson(JSON.stringify(preferences.commit.commit_types, null, 2));
                  }
                }}
              />
              {commitTypesJsonError && (
                <div className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>
                  {commitTypesJsonError}
                </div>
              )}
            </SettingsSection>
          </div>
        );

      case 'about':
        return (
          <SettingsSection title="About GitUI">
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ backgroundColor: 'var(--accent-mauve)' }}>
                <GitBranch size={32} style={{ color: 'var(--bg-base)' }} />
              </div>
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>GitUI</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Version 1.0.0</p>
              <p className="text-xs mb-2" style={{ color: 'var(--text-subtle)' }}>
                A modern Git GUI client built with Tauri 2.x + React + TypeScript
              </p>
              <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                Catppuccin Mocha Theme
              </p>
            </div>
          </SettingsSection>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-full">
      {/* Tab list */}
      <div
        className="w-48 border-r overflow-y-auto shrink-0"
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
      >
        <div className="p-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors mb-0.5"
              style={{
                backgroundColor: activeTab === tab.id ? 'rgba(137, 180, 250, 0.1)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
              }}
            >
              {tab.icon}
              <span className="flex-1 text-left">{t(tab.labelKey)}</span>
              {activeTab === tab.id && <ChevronRight size={12} />}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {renderContent()}
      </div>
    </div>
  );
};

// Sub-components

const SettingsSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{title}</h2>
    <div className="space-y-4">{children}</div>
  </div>
);

const SettingRow: React.FC<{
  label: string;
  description: string;
  children: React.ReactNode;
}> = ({ label, description, children }) => (
  <div className="flex items-start gap-4">
    <div className="flex-1">
      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>{description}</div>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (value: boolean) => void }> = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className="relative w-10 h-5 rounded-full transition-colors"
    style={{ backgroundColor: checked ? 'var(--accent-blue)' : 'var(--bg-overlay)' }}
  >
    <div
      className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
      style={{
        backgroundColor: 'white',
        left: checked ? '22px' : '2px',
      }}
    />
  </button>
);
