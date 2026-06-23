import React, { useEffect, useMemo, useState } from 'react';
import { useGitStore } from '@/stores/git-store';
import {
  BarChart3,
  GitCommit,
  Users,
  GitBranch,
  Tag,
  FileCode,
  HardDrive,
  Loader2,
  RefreshCw,
} from 'lucide-react';

/** Simple CSS bar chart component */
const BarChart: React.FC<{
  data: { label: string; value: number; color: string }[];
  maxValue?: number;
}> = ({ data, maxValue }) => {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  const chartHeight = 200;

  return (
    <div className="flex items-end gap-2" style={{ height: chartHeight }}>
      {data.map((item, idx) => {
        const barHeight = (item.value / max) * (chartHeight - 30);
        return (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
            <span
              className="text-xs font-mono"
              style={{ color: 'var(--text-secondary)', fontSize: 10 }}
            >
              {item.value.toLocaleString()}
            </span>
            <div
              className="w-full rounded-t transition-all"
              style={{
                height: Math.max(barHeight, 2),
                backgroundColor: item.color,
                minHeight: 2,
              }}
            />
            <span
              className="text-xs truncate w-full text-center"
              style={{ color: 'var(--text-subtle)', fontSize: 9 }}
              title={item.label}
            >
              {item.label.length > 10 ? item.label.slice(0, 9) + '...' : item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/** Stat card component */
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}> = ({ icon, label, value, color }) => (
  <div
    className="flex flex-col items-center gap-2 p-4 rounded-lg"
    style={{
      backgroundColor: 'var(--bg-overlay)',
      border: '1px solid var(--border-color)',
    }}
  >
    <div
      className="p-2 rounded-full"
      style={{ backgroundColor: `${color}15` }}
    >
      {icon}
    </div>
    <span className="text-lg font-bold font-mono" style={{ color: color }}>
      {typeof value === 'number' ? value.toLocaleString() : value}
    </span>
    <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
      {label}
    </span>
  </div>
);

export const Statistics: React.FC = () => {
  const statistics = useGitStore((s) => s.statistics);
  const commits = useGitStore((s) => s.commits);
  const loading = useGitStore((s) => s.loading.statistics);
  const error = useGitStore((s) => s.errors.statistics);
  const fetchStatistics = useGitStore((s) => s.fetchStatistics);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  // Group commits by author for the bar chart
  const authorStats = useMemo(() => {
    const authorMap = new Map<string, number>();
    for (const commit of commits) {
      const count = authorMap.get(commit.author_name) ?? 0;
      authorMap.set(commit.author_name, count + 1);
    }
    const entries = Array.from(authorMap.entries())
      .map(([name, count]) => ({ label: name, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);

    const colors = [
      'var(--accent-blue)',
      'var(--accent-green)',
      'var(--accent-mauve)',
      'var(--accent-peach)',
      'var(--accent-teal)',
      'var(--accent-yellow)',
      'var(--accent-pink)',
      'var(--accent-lavender)',
      'var(--accent-red)',
      '#89dceb',
      '#a6adc8',
      '#f2cdcd',
      '#f5c2e7',
      '#94e2d5',
      '#fab387',
    ];

    return entries.map((entry, idx) => ({
      ...entry,
      color: colors[idx % colors.length],
    }));
  }, [commits]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-subtle)' }}>
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center h-full text-sm"
        style={{ color: 'var(--accent-red)' }}
      >
        Failed to load statistics: {error}
      </div>
    );
  }

  if (!statistics) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-2"
        style={{ color: 'var(--text-subtle)' }}
      >
        <BarChart3 size={32} />
        <p className="text-sm">No statistics available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b shrink-0"
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
      >
        <div className="flex items-center gap-2">
          <BarChart3 size={16} style={{ color: 'var(--accent-blue)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Repository Statistics
          </span>
        </div>
        <button
          onClick={() => fetchStatistics()}
          className="p-1.5 rounded transition-colors hover:bg-overlay"
          style={{ color: 'var(--text-subtle)' }}
          title="Refresh statistics"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Overview cards */}
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
          <StatCard
            icon={<GitCommit size={18} style={{ color: 'var(--accent-mauve)' }} />}
            label="Total Commits"
            value={statistics.total_commits}
            color="var(--accent-mauve)"
          />
          <StatCard
            icon={<Users size={18} style={{ color: 'var(--accent-lavender)' }} />}
            label="Total Authors"
            value={statistics.total_authors}
            color="var(--accent-lavender)"
          />
          <StatCard
            icon={<GitBranch size={18} style={{ color: 'var(--accent-green)' }} />}
            label="Total Branches"
            value={statistics.total_branches}
            color="var(--accent-green)"
          />
          <StatCard
            icon={<Tag size={18} style={{ color: 'var(--accent-peach)' }} />}
            label="Total Tags"
            value={statistics.total_tags}
            color="var(--accent-peach)"
          />
          <StatCard
            icon={<FileCode size={18} style={{ color: 'var(--accent-teal)' }} />}
            label="Total Remotes"
            value={statistics.total_remotes}
            color="var(--accent-teal)"
          />
          <StatCard
            icon={<HardDrive size={18} style={{ color: 'var(--accent-yellow)' }} />}
            label="Total Stashes"
            value={statistics.total_stashes}
            color="var(--accent-yellow)"
          />
        </div>

        {/* Date range info */}
        {(statistics.first_commit_time || statistics.last_commit_time) && (
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: 'var(--bg-overlay)',
              border: '1px solid var(--border-color)',
            }}
          >
            <h3 className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              Repository Timeline
            </h3>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <div className="text-xs" style={{ color: 'var(--text-subtle)' }}>First Commit</div>
                {statistics.first_commit_time && (
                  <div className="text-sm font-mono" style={{ color: 'var(--accent-blue)' }}>
                    {new Date(statistics.first_commit_time * 1000).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="flex-1 mx-4 h-px" style={{ backgroundColor: 'var(--border-color)' }} />
              <div className="text-center">
                <div className="text-xs" style={{ color: 'var(--text-subtle)' }}>Last Commit</div>
                {statistics.last_commit_time && (
                  <div className="text-sm font-mono" style={{ color: 'var(--accent-green)' }}>
                    {new Date(statistics.last_commit_time * 1000).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Author commits bar chart */}
        {authorStats.length > 0 && (
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: 'var(--bg-overlay)',
              border: '1px solid var(--border-color)',
            }}
          >
            <h3 className="text-xs font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
              Commits by Author (Top {authorStats.length})
            </h3>
            <div className="px-2">
              <BarChart data={authorStats} />
            </div>
          </div>
        )}

        {/* Worktrees */}
        <div
          className="rounded-lg p-4"
          style={{
            backgroundColor: 'var(--bg-overlay)',
            border: '1px solid var(--border-color)',
          }}
        >
          <h3 className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
            Other Statistics
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div
              className="flex items-center justify-between px-3 py-2 rounded"
              style={{ backgroundColor: 'var(--bg-surface)' }}
            >
              <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>Worktrees</span>
              <span className="text-sm font-mono font-medium" style={{ color: 'var(--accent-teal)' }}>
                {statistics.total_worktrees}
              </span>
            </div>
            <div
              className="flex items-center justify-between px-3 py-2 rounded"
              style={{ backgroundColor: 'var(--bg-surface)' }}
            >
              <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>Remotes</span>
              <span className="text-sm font-mono font-medium" style={{ color: 'var(--accent-peach)' }}>
                {statistics.total_remotes}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
