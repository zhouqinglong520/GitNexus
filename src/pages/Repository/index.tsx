import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRepositoryStore } from '@/stores/repository-store';
import { useGitStore } from '@/stores/git-store';
import { useUIStore } from '@/stores/ui-store';
import { useTranslation } from '@/i18n';
import { Sidebar } from '@/components/Sidebar';
import { InProgressBanner } from '@/components/InProgressBanner';
import { Histories } from '@/pages/Histories';
import { WorkingCopy } from '@/pages/WorkingCopy';
import { Stashes } from '@/pages/Stashes';
import { useGitWatcher } from '@/hooks/useGitWatcher';
import { X, Loader2 } from 'lucide-react';
import type { TabType } from '@/types';

export const Repository: React.FC = () => {
  const navigate = useNavigate();
  const activeRepo = useRepositoryStore((s) => s.activeRepo);
  const tabs = useRepositoryStore((s) => s.tabs);
  const closeTab = useRepositoryStore((s) => s.closeTab);
  const setActiveTab = useRepositoryStore((s) => s.setActiveTab);
  const operations = useUIStore((s) => s.operations);
  const fetchAll = useGitStore((s) => s.fetchAll);
  const { t } = useTranslation();

  // Watch for repository changes (auto-refresh status, branches, etc.)
  useGitWatcher(activeRepo);

  const [activeTabType, setActiveTabType] = useState<TabType>('histories');

  useEffect(() => {
    if (!activeRepo) {
      navigate('/');
    }
  }, [activeRepo, navigate]);

  // Load initial data when repository is opened
  useEffect(() => {
    if (activeRepo) {
      fetchAll().catch((err) => {
        console.error('Failed to load repository data:', err);
      });
    }
  }, [activeRepo, fetchAll]);

  if (!activeRepo) return null;

  const currentTab = tabs.find((t) => t.repoPath === activeRepo);
  const tabType = currentTab?.type ?? activeTabType;

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab Bar */}
        <div
          className="flex items-center border-b shrink-0"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
        >
          {/* Repo tabs */}
          <div className="flex flex-1 overflow-x-auto">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer transition-colors border-r"
                style={{
                  backgroundColor: tab.repoPath === activeRepo ? 'var(--bg-base)' : 'var(--bg-surface)',
                  borderColor: 'var(--border-color)',
                  color: tab.repoPath === activeRepo ? 'var(--text-primary)' : 'var(--text-subtle)',
                  borderBottom: tab.repoPath === activeRepo ? '2px solid var(--accent-blue)' : '2px solid transparent',
                }}
              >
                <span className="truncate max-w-32">{tab.label}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="p-0.5 rounded transition-colors hover:bg-overlay"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>

          {/* View tabs */}
          <div className="flex shrink-0">
            {(['histories', 'working-copy', 'stashes'] as TabType[]).map((type) => (
              <button
                key={type}
                onClick={() => setActiveTabType(type)}
                className="px-4 py-2 text-xs transition-colors"
                style={{
                  color: tabType === type ? 'var(--accent-blue)' : 'var(--text-subtle)',
                  borderBottom: tabType === type ? '2px solid var(--accent-blue)' : '2px solid transparent',
                }}
              >
                {type === 'histories' ? t('repository.histories') : type === 'working-copy' ? t('repository.workingCopy') : t('repository.stashes')}
              </button>
            ))}
          </div>
        </div>

        {/* In-progress operations bar */}
        {operations.length > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 border-b shrink-0"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--bg-mantle)',
            }}
          >
            {operations.map((op) => (
              <div key={op.id} className="flex items-center gap-2 text-xs" style={{ color: 'var(--accent-yellow)' }}>
                <Loader2 size={12} className="animate-spin" />
                <span>{op.message}</span>
                {op.progress !== undefined && op.total !== undefined && (
                  <span style={{ color: 'var(--text-subtle)' }}>
                    {op.progress}/{op.total}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* In-progress git operation banner (merge/rebase/cherry-pick/revert/bisect) */}
        <InProgressBanner />

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {tabType === 'histories' && <Histories />}
          {tabType === 'working-copy' && <WorkingCopy />}
          {tabType === 'stashes' && <Stashes />}
        </div>
      </div>
    </div>
  );
};
