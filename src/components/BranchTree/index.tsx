import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, GitBranch, Tag as TagIcon, Globe } from 'lucide-react';
import type { Branch, Tag, Remote } from '@/types';

interface BranchTreeProps {
  branches: Branch[];
  tags: Tag[];
  remotes: Remote[];
  currentBranch: string | null;
  onBranchClick: (branch: string) => void;
  onTagClick: (tag: string) => void;
  onRemoteClick: (remote: string) => void;
  className?: string;
}

type TreeSection = 'local' | 'remote' | 'tags';

export const BranchTree: React.FC<BranchTreeProps> = ({
  branches,
  tags,
  remotes,
  currentBranch,
  onBranchClick,
  onTagClick,
  onRemoteClick,
  className = '',
}) => {
  const [expanded, setExpanded] = useState<Record<TreeSection, boolean>>({
    local: true,
    remote: true,
    tags: false,
  });

  const toggleSection = (section: TreeSection) => {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const localBranches = useMemo(
    () => branches.filter((b) => !b.is_remote),
    [branches]
  );

  const remoteBranches = useMemo(
    () => branches.filter((b) => b.is_remote),
    [branches]
  );

  const remoteGroups = useMemo(() => {
    const groups: Record<string, Branch[]> = {};
    for (const branch of remoteBranches) {
      const parts = branch.name.split('/');
      const remote = parts[0];
      if (!groups[remote]) groups[remote] = [];
      groups[remote].push(branch);
    }
    return groups;
  }, [remoteBranches]);

  const renderBranch = (branch: Branch, indent: number = 0) => {
    const isHead = branch.is_current;
    return (
      <button
        key={branch.name}
        onClick={() => onBranchClick(branch.name)}
        className="w-full flex items-center gap-2 px-2 py-1 text-xs rounded transition-colors hover:bg-overlay"
        style={{
          paddingLeft: `${indent * 16 + 8}px`,
          color: isHead ? 'var(--accent-green)' : 'var(--text-primary)',
          backgroundColor: isHead ? 'rgba(166, 227, 161, 0.08)' : 'transparent',
        }}
      >
        <GitBranch size={12} />
        <span className="truncate flex-1 text-left">{branch.name}</span>
        {isHead && (
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ backgroundColor: 'var(--accent-green)', color: 'var(--bg-base)', fontSize: 10 }}
          >
            HEAD
          </span>
        )}
      </button>
    );
  };

  const renderSection = (
    section: TreeSection,
    label: string,
    icon: React.ReactNode,
    count: number,
    content: React.ReactNode
  ) => (
    <div className="mb-1">
      <button
        onClick={() => toggleSection(section)}
        className="w-full flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-colors hover:bg-overlay"
        style={{ color: 'var(--text-secondary)' }}
      >
        {expanded[section] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {icon}
        <span className="flex-1 text-left">{label}</span>
        <span style={{ color: 'var(--text-subtle)' }}>{count}</span>
      </button>
      {expanded[section] && <div className="mt-0.5">{content}</div>}
    </div>
  );

  return (
    <div className={`overflow-y-auto ${className}`} style={{ color: 'var(--text-primary)' }}>
      {/* Local branches */}
      {renderSection(
        'local',
        'Local Branches',
        <GitBranch size={12} style={{ color: 'var(--accent-green)' }} />,
        localBranches.length,
        <div>
          {localBranches.map((b) => renderBranch(b))}
        </div>
      )}

      {/* Remotes */}
      {renderSection(
        'remote',
        'Remotes',
        <Globe size={12} style={{ color: 'var(--accent-peach)' }} />,
        Object.keys(remoteGroups).length,
        <div>
          {Object.entries(remoteGroups).map(([remote, remoteBranches]) => (
            <div key={remote}>
              <button
                onClick={() => onRemoteClick(remote)}
                className="w-full flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors hover:bg-overlay"
                style={{ paddingLeft: '8px', color: 'var(--accent-peach)' }}
              >
                <Globe size={12} />
                <span className="font-medium">{remote}</span>
                <span style={{ color: 'var(--text-subtle)' }}>({remoteBranches.length})</span>
              </button>
              {remoteBranches.map((b) => renderBranch(b, 1))}
            </div>
          ))}
        </div>
      )}

      {/* Tags */}
      {renderSection(
        'tags',
        'Tags',
        <TagIcon size={12} style={{ color: 'var(--accent-mauve)' }} />,
        tags.length,
        <div>
          {tags.map((tag) => (
            <button
              key={tag.name}
              onClick={() => onTagClick(tag.name)}
              className="w-full flex items-center gap-2 px-2 py-1 text-xs rounded transition-colors hover:bg-overlay"
              style={{ paddingLeft: '8px', color: 'var(--accent-mauve)' }}
            >
              <TagIcon size={12} />
              <span className="truncate flex-1 text-left">{tag.name}</span>
              {tag.is_annotated && (
                <span style={{ color: 'var(--text-subtle)', fontSize: 10 }}>annotated</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
