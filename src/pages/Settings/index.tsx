import React, { useState } from 'react';
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
} from 'lucide-react';
import { usePreferencesStore } from '@/stores/preferences-store';

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
  | 'about';

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <SettingsIcon size={16} /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
  { id: 'git', label: 'Git', icon: <GitBranch size={16} /> },
  { id: 'integration', label: 'Integration', icon: <Terminal size={16} /> },
  { id: 'keybindings', label: 'Keybindings', icon: <Keyboard size={16} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
  { id: 'security', label: 'Security', icon: <Shield size={16} /> },
  { id: 'storage', label: 'Storage', icon: <Database size={16} /> },
  { id: 'network', label: 'Network', icon: <Globe size={16} /> },
  { id: 'about', label: 'About', icon: <Info size={16} /> },
];

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const preferences = usePreferencesStore((s) => s.preferences);
  const updateGeneral = usePreferencesStore((s) => s.updateGeneral);
  const updateAppearance = usePreferencesStore((s) => s.updateAppearance);
  const updateGit = usePreferencesStore((s) => s.updateGit);
  const updateIntegration = usePreferencesStore((s) => s.updateIntegration);
  const resetToDefaults = usePreferencesStore((s) => s.resetToDefaults);

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

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
            <SettingRow label="Compact Mode" description="Reduce spacing for denser information display">
              <ToggleSwitch
                checked={preferences.appearance.compact_mode}
                onChange={(v) => updateAppearance({ compact_mode: v })}
              />
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
          <SettingsSection title="Git Configuration">
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

      case 'keybindings':
        return (
          <SettingsSection title="Keyboard Shortcuts">
            <div className="space-y-2">
              {[
                { keys: 'Ctrl+P', action: 'Open command palette' },
                { keys: 'Ctrl+Shift+N', action: 'New window' },
                { keys: 'Ctrl+O', action: 'Open repository' },
                { keys: 'Ctrl+B', action: 'Toggle sidebar' },
                { keys: 'Ctrl+Enter', action: 'Commit' },
                { keys: 'Ctrl+Shift+P', action: 'Push' },
                { keys: 'Ctrl+Shift+L', action: 'Pull' },
                { keys: 'Ctrl+S', action: 'Stage all' },
                { keys: 'Ctrl+D', action: 'Discard changes' },
                { keys: 'Ctrl+/', action: 'Toggle comment' },
              ].map((shortcut) => (
                <div key={shortcut.keys} className="flex items-center justify-between py-1.5 px-2 rounded" style={{ backgroundColor: 'var(--bg-surface)' }}>
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{shortcut.action}</span>
                  <kbd className="px-2 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>
                    {shortcut.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </SettingsSection>
        );

      case 'notifications':
        return (
          <SettingsSection title="Notification Settings">
            <SettingRow label="Show Notifications" description="Enable desktop notifications">
              <ToggleSwitch checked={true} onChange={() => {}} />
            </SettingRow>
            <SettingRow label="Sound Effects" description="Play sounds for notifications">
              <ToggleSwitch checked={false} onChange={() => {}} />
            </SettingRow>
            <SettingRow label="Notification Duration" description="How long notifications stay visible (ms)">
              <input
                type="number"
                defaultValue={5000}
                className="px-2 py-1 rounded border text-sm w-24"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                min={1000}
                max={30000}
              />
            </SettingRow>
          </SettingsSection>
        );

      case 'security':
        return (
          <SettingsSection title="Security Settings">
            <SettingRow label="SSH Key Management" description="Manage SSH keys for Git operations">
              <button className="px-3 py-1 rounded text-sm" style={{ backgroundColor: 'var(--accent-blue)', color: 'var(--bg-base)' }}>
                Manage Keys
              </button>
            </SettingRow>
            <SettingRow label="GPG Key Management" description="Manage GPG keys for commit signing">
              <button className="px-3 py-1 rounded text-sm" style={{ backgroundColor: 'var(--accent-mauve)', color: 'var(--bg-base)' }}>
                Manage Keys
              </button>
            </SettingRow>
            <SettingRow label="Credential Cache" description="Cache Git credentials">
              <ToggleSwitch checked={true} onChange={() => {}} />
            </SettingRow>
          </SettingsSection>
        );

      case 'storage':
        return (
          <SettingsSection title="Storage Management">
            <SettingRow label="Cache Size" description="Current cache usage">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Calculating...</span>
            </SettingRow>
            <SettingRow label="Clear Cache" description="Clear all cached data">
              <button className="px-3 py-1 rounded text-sm" style={{ backgroundColor: 'var(--accent-red)', color: 'var(--bg-base)' }}>
                Clear Cache
              </button>
            </SettingRow>
            <SettingRow label="Reset All Settings" description="Reset all settings to defaults">
              <button
                onClick={resetToDefaults}
                className="px-3 py-1 rounded text-sm"
                style={{ backgroundColor: 'var(--accent-red)', color: 'var(--bg-base)' }}
              >
                Reset to Defaults
              </button>
            </SettingRow>
          </SettingsSection>
        );

      case 'network':
        return (
          <SettingsSection title="Network Settings">
            <SettingRow label="Proxy" description="HTTP/HTTPS proxy for Git operations">
              <input
                type="text"
                placeholder="http://proxy:port"
                className="px-2 py-1 rounded border text-sm flex-1"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              />
            </SettingRow>
            <SettingRow label="SSL Verification" description="Verify SSL certificates">
              <ToggleSwitch checked={true} onChange={() => {}} />
            </SettingRow>
            <SettingRow label="Connection Timeout" description="Network timeout in seconds">
              <input
                type="number"
                defaultValue={30}
                className="px-2 py-1 rounded border text-sm w-24"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                min={5}
                max={300}
              />
            </SettingRow>
          </SettingsSection>
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
              <span className="flex-1 text-left">{tab.label}</span>
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
