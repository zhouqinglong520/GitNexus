import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, GitFork, Plus, Trash2, ExternalLink } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useRepositoryStore } from '@/stores/repository-store';
import { useUIStore } from '@/stores/ui-store';
import { useTranslation } from '@/i18n';

interface PlatformEntry {
  name: string;
  url: string;
  color: string;
}

const PLATFORMS: PlatformEntry[] = [
  { name: 'GitHub', url: 'https://github.com', color: 'var(--text-primary)' },
  { name: 'Gitee', url: 'https://gitee.com', color: '#c71d23' },
  { name: 'Coding', url: 'https://coding.net', color: '#0066ff' },
  { name: 'GitLab', url: 'https://gitlab.com', color: '#fc6d26' },
  { name: 'Bitbucket', url: 'https://bitbucket.org', color: '#2684ff' },
];

export const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const recentRepos = useRepositoryStore((s) => s.recentRepos);
  const openRepo = useRepositoryStore((s) => s.openRepo);
  const removeRecentRepo = useRepositoryStore((s) => s.removeRecentRepo);
  const loadRecentRepos = useRepositoryStore((s) => s.loadRecentRepos);
  const addNotification = useUIStore((s) => s.addNotification);
  const { t } = useTranslation();

  const [cloneUrl, setCloneUrl] = useState('');
  const [cloneDest, setCloneDest] = useState('');
  const [initPath, setInitPath] = useState('');
  const [initName, setInitName] = useState('');
  const [showClone, setShowClone] = useState(false);
  const [showInit, setShowInit] = useState(false);

  useEffect(() => {
    loadRecentRepos();
  }, [loadRecentRepos]);

  const handleOpenRepo = async () => {
    try {
      // Pre-check: verify git is available
      try {
        await invoke('git_get_git_version');
      } catch {
        addNotification({
          type: 'error',
          title: 'Git 未安装',
          message: '请先安装 Git 后再使用本工具。下载地址：https://git-scm.com',
          duration: 15000,
        });
        return;
      }

      const selected = await open({ directory: true, multiple: false });
      if (selected && typeof selected === 'string') {
        await openRepo(selected);
        // Only navigate if openRepo actually succeeded (activeRepo was set)
        if (useRepositoryStore.getState().activeRepo) {
          navigate('/repo');
        }
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('welcome.openFailed'),
        message: String(error),
        duration: 8000,
      });
    }
  };

  const handleClone = async () => {
    if (!cloneUrl.trim()) return;
    try {
      addNotification({ type: 'info', title: t('welcome.cloning'), duration: 0 });
      const destPath = cloneDest || '';
      await invoke('git_clone_repo', {
        url: cloneUrl,
        path: destPath,
        depth: null,
        branch: null,
      });
      addNotification({ type: 'success', title: t('welcome.cloneSuccess') });
      setShowClone(false);
      setCloneUrl('');
      setCloneDest('');
      // Navigate to repo if destination was set
      if (destPath) {
        await openRepo(destPath);
        navigate('/repo');
      }
    } catch (error) {
      addNotification({ type: 'error', title: t('welcome.cloneFailed'), message: String(error) });
    }
  };

  const handleInit = async () => {
    if (!initPath.trim() || !initName.trim()) return;
    try {
      const fullPath = `${initPath}/${initName}`.replace(/\/+/g, '/');
      await invoke('git_init_repo', {
        path: fullPath,
        is_bare: false,
      });
      addNotification({ type: 'success', title: t('welcome.initSuccess') });
      setShowInit(false);
      setInitPath('');
      setInitName('');
      // Open the newly initialized repo
      await openRepo(fullPath);
      navigate('/repo');
    } catch (error) {
      addNotification({ type: 'error', title: t('welcome.initFailed'), message: String(error) });
    }
  };

  const handleOpenRecent = async (path: string) => {
    try {
      await openRepo(path);
      if (useRepositoryStore.getState().activeRepo) {
        navigate('/repo');
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('welcome.openFailed'),
        message: String(error),
        duration: 8000,
      });
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center h-full overflow-y-auto"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <div className="w-full max-w-3xl px-8">
        {/* Logo & Title */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ backgroundColor: 'var(--accent-mauve)' }}
          >
            <GitFork size={32} style={{ color: 'var(--bg-base)' }} />
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            GitNexus
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('welcome.subtitle')}
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {/* Open Repository */}
          <ActionCard
            icon={<FolderOpen size={24} />}
            title={t('welcome.openRepo')}
            description={t('welcome.openRepoDesc')}
            color="var(--accent-blue)"
            onClick={handleOpenRepo}
          />

          {/* Clone Repository */}
          <ActionCard
            icon={<GitFork size={24} />}
            title={t('welcome.cloneRepo')}
            description={t('welcome.cloneRepoDesc')}
            color="var(--accent-green)"
            onClick={() => setShowClone(!showClone)}
          />

          {/* Initialize Repository */}
          <ActionCard
            icon={<Plus size={24} />}
            title={t('welcome.initialize')}
            description={t('welcome.initializeDesc')}
            color="var(--accent-mauve)"
            onClick={() => setShowInit(!showInit)}
          />
        </div>

        {/* Clone Form */}
        {showClone && (
          <div
            className="mb-6 p-4 rounded-lg border"
            style={{ backgroundColor: 'var(--bg-overlay)', borderColor: 'var(--border-color)' }}
          >
            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              {t('welcome.cloneTitle')}
            </h3>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder={t('welcome.cloneUrlPlaceholder')}
                value={cloneUrl}
                onChange={(e) => setCloneUrl(e.target.value)}
                className="px-3 py-2 rounded border text-sm"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
              <input
                type="text"
                placeholder={t('welcome.cloneDestPlaceholder')}
                value={cloneDest}
                onChange={(e) => setCloneDest(e.target.value)}
                className="px-3 py-2 rounded border text-sm"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleClone}
                  className="px-4 py-2 rounded text-sm font-medium transition-colors"
                  style={{ backgroundColor: 'var(--accent-green)', color: 'var(--bg-base)' }}
                >
                  {t('welcome.clone')}
                </button>
                <button
                  onClick={() => setShowClone(false)}
                  className="px-4 py-2 rounded text-sm transition-colors"
                  style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Init Form */}
        {showInit && (
          <div
            className="mb-6 p-4 rounded-lg border"
            style={{ backgroundColor: 'var(--bg-overlay)', borderColor: 'var(--border-color)' }}
          >
            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              {t('welcome.initTitle')}
            </h3>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder={t('welcome.initPathPlaceholder')}
                value={initPath}
                onChange={(e) => setInitPath(e.target.value)}
                className="px-3 py-2 rounded border text-sm"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
              <input
                type="text"
                placeholder={t('welcome.initNamePlaceholder')}
                value={initName}
                onChange={(e) => setInitName(e.target.value)}
                className="px-3 py-2 rounded border text-sm"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleInit}
                  className="px-4 py-2 rounded text-sm font-medium transition-colors"
                  style={{ backgroundColor: 'var(--accent-mauve)', color: 'var(--bg-base)' }}
                >
                  {t('welcome.initializeBtn')}
                </button>
                <button
                  onClick={() => setShowInit(false)}
                  className="px-4 py-2 rounded text-sm transition-colors"
                  style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recent Repositories */}
        {recentRepos.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              {t('welcome.recentRepos')}
            </h2>
            <div className="space-y-1">
              {recentRepos.map((repo) => (
                <div
                  key={repo}
                  className="flex items-center gap-3 px-3 py-2 rounded transition-colors hover:bg-overlay cursor-pointer group"
                  onClick={() => handleOpenRecent(repo)}
                >
                  <FolderOpen size={14} style={{ color: 'var(--accent-mauve)' }} />
                  <span className="flex-1 text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {repo}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecentRepo(repo);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all hover:bg-red"
                    style={{ color: 'var(--text-subtle)' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Platform Shortcuts */}
        <div>
          <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
            {t('welcome.quickAccess')}
          </h2>
          <div className="flex gap-3">
            {PLATFORMS.map((platform) => (
              <a
                key={platform.name}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors hover:bg-overlay"
                style={{
                  borderColor: 'var(--border-color)',
                  color: platform.color,
                }}
              >
                <span className="text-sm font-medium">{platform.name}</span>
                <ExternalLink size={12} />
              </a>
            ))}
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="mt-10 text-center">
          <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
            {t('welcome.commandPaletteHint')}
          </p>
        </div>
      </div>
    </div>
  );
};

const ActionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
}> = ({ icon, title, description, color, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-3 p-6 rounded-xl border transition-all hover:scale-105"
    style={{
      backgroundColor: 'var(--bg-overlay)',
      borderColor: 'var(--border-color)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLElement).style.borderColor = color;
      (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 24px rgba(0,0,0,0.3)`;
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)';
      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
    }}
  >
    <div
      className="flex items-center justify-center w-12 h-12 rounded-xl"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {icon}
    </div>
    <div className="text-center">
      <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
        {description}
      </p>
    </div>
  </button>
);
