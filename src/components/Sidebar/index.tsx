import React, { useState } from 'react';
import {
  GitBranch,
  GitCommit,
  FolderGit2,
  Settings,
  Tag,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { useRepositoryStore } from '@/stores/repository-store';
import { useGitStore } from '@/stores/git-store';
import { useUIStore } from '@/stores/ui-store';
import type { TabType } from '@/types';

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const activeRepo = useRepositoryStore((s) => s.activeRepo);
  const tabs = useRepositoryStore((s) => s.tabs);
  const setActiveTab = useRepositoryStore((s) => s.setActiveTab);
  const closeTab = useRepositoryStore((s) => s.closeTab);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const branches = useGitStore((s) => s.branches);
  const tags = useGitStore((s) => s.tags);
  const remotes = useGitStore((s) => s.remotes);
  const stashes = useGitStore((s) => s.stashes);
  const status = useGitStore((s) => s.status);

  const [activeSection, setActiveSection] = useState<string>('branches');

  if (!sidebarOpen) {
    return (
      <div
        className={`flex flex-col items-center py-2 border-r shrink-0 ${className}`}
        style={{
          width: 40,
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-color)',
        }}
      >
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded transition-colors hover:bg-overlay"
          style={{ color: 'var(--text-secondary)' }}
          title="Expand sidebar"
        >
          <ChevronRight size={16} />
        </button>
        <div className="mt-4 flex flex-col gap-2">
          <SidebarIcon icon={<GitBranch size={18} />} title="Branches" />
          <SidebarIcon icon={<Clock size={18} />} title="History" />
          <SidebarIcon icon={<Tag size={18} />} title="Tags" />
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'branches', label: 'Branches', icon: <GitBranch size={16} />, count: branches.length },
    { id: 'tags', label: 'Tags', icon: <Tag size={16} />, count: tags.length },
    { id: 'remotes', label: 'Remotes', icon: <FolderGit2 size={16} />, count: remotes.length },
    { id: 'stashes', label: 'Stashes', icon: <Clock size={16} />, count: stashes.length },
  ];

  return (
    <div
      className={`flex flex-col border-r shrink-0 overflow-hidden ${className}`}
      style={{
        width: 260,
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b shrink-0"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-2">
          <FolderGit2 size={16} style={{ color: 'var(--accent-mauve)' }} />
          <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {activeRepo ? activeRepo.split('/').pop() : 'No repository'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleSidebar}
            className="p-1 rounded transition-colors hover:bg-overlay"
            style={{ color: 'var(--text-subtle)' }}
            title="Collapse sidebar"
          >
            <ChevronLeft size={14} />
          </button>
        </div>
      </div>

      {/* Status bar */}
      {status && (
        <div
          className="px-3 py-1.5 border-b text-xs flex items-center gap-2 shrink-0"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
        >
          <GitBranch size={12} style={{ color: 'var(--accent-green)' }} />
          <span className="truncate">{status.branch ?? 'HEAD'}</span>
          {status.ahead > 0 && (
            <span style={{ color: 'var(--accent-green)' }}>
              +{status.ahead}
            </span>
          )}
          {status.behind > 0 && (
            <span style={{ color: 'var(--accent-red)' }}>
              -{status.behind}
            </span>
          )}
        </div>
      )}

      {/* Section tabs */}
      <div className="flex border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors"
            style={{
              color: activeSection === section.id ? 'var(--accent-blue)' : 'var(--text-subtle)',
              borderBottom: activeSection === section.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
            }}
          >
            {section.icon}
            <span>{section.label}</span>
            <span style={{ fontSize: 10 }}>{section.count}</span>
          </button>
        ))}
      </div>

      {/* Section content */}
      <div className="flex-1 overflow-y-auto">
        {activeSection === 'branches' && (
          <div className="p-2">
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-colors hover:bg-overlay mb-2"
              style={{ color: 'var(--accent-green)' }}
            >
              <Plus size={12} />
              <span>New Branch</span>
            </button>
            {branches.map((branch) => (
              <button
                key={branch.name}
                className="w-full flex items-center gap-2 px-2 py-1 text-xs rounded transition-colors hover:bg-overlay"
                style={{
                  color: branch.is_current ? 'var(--accent-green)' : 'var(--text-primary)',
                  backgroundColor: branch.is_current ? 'rgba(166, 227, 161, 0.08)' : 'transparent',
                }}
              >
                <GitBranch size={12} />
                <span className="truncate flex-1 text-left">{branch.name}</span>
                {branch.is_current && (
                  <span
                    className="px-1 py-0.5 rounded"
                    style={{ backgroundColor: 'var(--accent-green)', color: 'var(--bg-base)', fontSize: 9 }}
                  >
                    HEAD
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {activeSection === 'tags' && (
          <div className="p-2">
            {tags.map((tag) => (
              <button
                key={tag.name}
                className="w-full flex items-center gap-2 px-2 py-1 text-xs rounded transition-colors hover:bg-overlay"
                style={{ color: 'var(--accent-mauve)' }}
              >
                <Tag size={12} />
                <span className="truncate flex-1 text-left">{tag.name}</span>
              </button>
            ))}
          </div>
        )}

        {activeSection === 'remotes' && (
          <div className="p-2">
            {remotes.map((remote) => (
              <div
                key={remote.name}
                className="flex items-center gap-2 px-2 py-1 text-xs"
                style={{ color: 'var(--accent-peach)' }}
              >
                <FolderGit2 size={12} />
                <span className="font-medium">{remote.name}</span>
                <span className="truncate" style={{ color: 'var(--text-subtle)' }}>
                  {remote.url}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'stashes' && (
          <div className="p-2">
            {stashes.map((stash) => (
              <div
                key={stash.index}
                className="flex items-center gap-2 px-2 py-1 text-xs rounded transition-colors hover:bg-overlay"
                style={{ color: 'var(--accent-yellow)' }}
              >
                <Clock size={12} />
                <span className="truncate flex-1 text-left">{stash.message}</span>
              </div>
            ))}
            {stashes.length === 0 && (
              <div className="px-2 py-4 text-center text-xs" style={{ color: 'var(--text-subtle)' }}>
                No stashes
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const SidebarIcon: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <button
    className="p-1.5 rounded transition-colors hover:bg-overlay"
    style={{ color: 'var(--text-secondary)' }}
    title={title}
  >
    {icon}
  </button>
);
