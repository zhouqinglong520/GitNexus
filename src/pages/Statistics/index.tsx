import React, { useEffect, useMemo, useState } from 'react';
import { useGitStore } from '@/stores/git-store';
import { useTranslation } from '@/i18n';
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
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

type TimeDimension = 'all' | 'month' | 'week';

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
  const fetchCommits = useGitStore((s) => s.fetchCommits);
  const { t } = useTranslation();

  const [timeDimension, setTimeDimension] = useState<TimeDimension>('all');
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);

  // Compute since date based on time dimension
  const sinceDate = useMemo(() => {
    if (timeDimension === 'all') return undefined;
    const now = new Date();
    if (timeDimension === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return firstDay.toISOString().split('T')[0];
    }
    if (timeDimension === 'week') {
      const dayOfWeek = now.getDay() || 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - dayOfWeek + 1);
      monday.setHours(0, 0, 0, 0);
      return monday.toISOString().split('T')[0];
    }
    return undefined;
  }, [timeDimension]);

  // Fetch statistics when time dimension changes
  useEffect(() => {
    fetchStatistics(sinceDate);
    // Also fetch commits for author stats
    fetchCommits();
  }, [fetchStatistics, fetchCommits, sinceDate]);

  // Get unique authors from commits
  const allAuthors = useMemo(() => {
    const authorSet = new Set<string>();
    for (const commit of commits) {
      authorSet.add(commit.author_name);
    }
    return Array.from(authorSet).sort();
  }, [commits]);

  // Filter commits by selected author and time dimension
  const filteredCommits = useMemo(() => {
    let filtered = commits;
    if (selectedAuthor) {
      filtered = filtered.filter((c) => c.author_name === selectedAuthor);
    }
    if (timeDimension !== 'all' && sinceDate) {
      const since = new Date(sinceDate).getTime() / 1000;
      filtered = filtered.filter((c) => {
        const commitTime = c.author_time ?? 0;
        return commitTime >= since;
      });
    }
    return filtered;
  }, [commits, selectedAuthor, timeDimension, sinceDate]);

  // Group filtered commits by author for the bar chart
  const authorStats = useMemo(() => {
    const authorMap = new Map<string, number>();
    for (const commit of filteredCommits) {
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
  }, [filteredCommits]);

  // Compute line changes for filtered commits (from shortstat)
  const lineChanges = useMemo(() => {
    if (timeDimension !== 'all' && !sinceDate) {
      return { insertions: 0, deletions: 0 };
    }
    // Use statistics data for line changes (backend handles time filtering)
    return {
      insertions: statistics?.total_insertions ?? 0,
      deletions: statistics?.total_deletions ?? 0,
    };
  }, [statistics, timeDimension, sinceDate]);

  // Monthly commit distribution for the bar chart (last 12 months)
  const monthlyCommitData = useMemo(() => {
    const now = new Date();
    const months: { label: string; value: number; color: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = `${year}-${String(month + 1).padStart(2, '0')}`;
      months.push({ label, value: 0, color: 'var(--accent-blue)' });
    }
    // Count commits per month from the loaded commits
    for (const commit of commits) {
      const commitTime = commit.author_time ?? 0;
      if (commitTime === 0) continue;
      const commitDate = new Date(commitTime * 1000);
      for (let i = 0; i < months.length; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        if (commitDate.getFullYear() === d.getFullYear() && commitDate.getMonth() === d.getMonth()) {
          months[i].value++;
          break;
        }
      }
    }
    return months;
  }, [commits]);

  // Activity heatmap data (last 52 weeks x 7 days)
  const heatmapData = useMemo(() => {
    const now = new Date();
    // Build a map of date string -> commit count
    const dateMap = new Map<string, number>();
    for (const commit of commits) {
      const commitTime = commit.author_time ?? 0;
      if (commitTime === 0) continue;
      const commitDate = new Date(commitTime * 1000);
      // Normalize to date string (YYYY-MM-DD)
      const dateStr = `${commitDate.getFullYear()}-${String(commitDate.getMonth() + 1).padStart(2, '0')}-${String(commitDate.getDate()).padStart(2, '0')}`;
      dateMap.set(dateStr, (dateMap.get(dateStr) ?? 0) + 1);
    }

    // Generate 52 weeks x 7 days grid, starting from the Sunday of ~52 weeks ago
    const grid: { date: string; count: number }[][] = [];
    // Find the most recent Sunday
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = today.getDay(); // 0 = Sunday
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - dayOfWeek);

    // Generate weeks from oldest to newest (top to bottom)
    for (let week = 51; week >= 0; week--) {
      const weekRow: { date: string; count: number }[] = [];
      for (let day = 0; day < 7; day++) {
        const d = new Date(lastSunday);
        d.setDate(lastSunday.getDate() - week * 7 + day);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        weekRow.push({ date: dateStr, count: dateMap.get(dateStr) ?? 0 });
      }
      grid.push(weekRow);
    }

    return grid;
  }, [commits]);

  // Heatmap color function
  const getHeatmapColor = (count: number): string => {
    if (count === 0) return 'var(--bg-overlay)';
    if (count <= 2) return 'rgba(166, 227, 161, 0.3)';
    if (count <= 5) return 'rgba(166, 227, 161, 0.6)';
    return 'rgba(166, 227, 161, 0.9)';
  };

  // Total commits in heatmap
  const heatmapTotalCommits = useMemo(() => {
    let total = 0;
    for (const row of heatmapData) {
      for (const cell of row) {
        total += cell.count;
      }
    }
    return total;
  }, [heatmapData]);

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
        {t('statistics.failedToLoadStatistics')}: {error}
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
        <p className="text-sm">{t('statistics.noStatisticsAvailable')}</p>
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
            {t('statistics.repositoryStatistics')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Time dimension toggle */}
          <div className="flex items-center gap-1">
            {(['all', 'month', 'week'] as TimeDimension[]).map((dim) => (
              <button
                key={dim}
                onClick={() => {
                  setTimeDimension(dim);
                  setSelectedAuthor(null);
                }}
                className="px-2 py-0.5 rounded text-xs transition-colors"
                style={{
                  backgroundColor: timeDimension === dim ? 'var(--accent-blue)' : 'var(--bg-overlay)',
                  color: timeDimension === dim ? 'var(--bg-base)' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                {dim === 'all' ? t('statistics.all') : dim === 'month' ? t('statistics.thisMonth') : t('statistics.thisWeek')}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchStatistics(sinceDate)}
            className="p-1.5 rounded transition-colors hover:bg-overlay"
            style={{ color: 'var(--text-subtle)' }}
            title="Refresh statistics"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Overview cards */}
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
          <StatCard
            icon={<GitCommit size={18} style={{ color: 'var(--accent-mauve)' }} />}
            label={t('statistics.totalCommits')}
            value={timeDimension === 'all' ? statistics.total_commits : filteredCommits.length}
            color="var(--accent-mauve)"
          />
          <StatCard
            icon={<Users size={18} style={{ color: 'var(--accent-lavender)' }} />}
            label={t('statistics.totalAuthors')}
            value={statistics.total_authors}
            color="var(--accent-lavender)"
          />
          <StatCard
            icon={<GitBranch size={18} style={{ color: 'var(--accent-green)' }} />}
            label={t('statistics.totalBranches')}
            value={statistics.total_branches}
            color="var(--accent-green)"
          />
          <StatCard
            icon={<Tag size={18} style={{ color: 'var(--accent-peach)' }} />}
            label={t('statistics.totalTags')}
            value={statistics.total_tags}
            color="var(--accent-peach)"
          />
          <StatCard
            icon={<FileCode size={18} style={{ color: 'var(--accent-teal)' }} />}
            label={t('statistics.totalRemotes')}
            value={statistics.total_remotes}
            color="var(--accent-teal)"
          />
          <StatCard
            icon={<HardDrive size={18} style={{ color: 'var(--accent-yellow)' }} />}
            label={t('statistics.totalStashes')}
            value={statistics.total_stashes}
            color="var(--accent-yellow)"
          />
        </div>

        {/* Line changes cards */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className="flex items-center gap-3 p-4 rounded-lg"
            style={{
              backgroundColor: 'var(--bg-overlay)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div className="p-2 rounded-full" style={{ backgroundColor: 'rgba(166, 227, 161, 0.15)' }}>
              <TrendingUp size={18} style={{ color: 'var(--accent-green)' }} />
            </div>
            <div>
              <div className="text-lg font-bold font-mono" style={{ color: 'var(--accent-green)' }}>
                +{lineChanges.insertions.toLocaleString()}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                {t('statistics.linesAdded')}
              </div>
            </div>
          </div>
          <div
            className="flex items-center gap-3 p-4 rounded-lg"
            style={{
              backgroundColor: 'var(--bg-overlay)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div className="p-2 rounded-full" style={{ backgroundColor: 'rgba(243, 139, 168, 0.15)' }}>
              <TrendingDown size={18} style={{ color: 'var(--accent-red)' }} />
            </div>
            <div>
              <div className="text-lg font-bold font-mono" style={{ color: 'var(--accent-red)' }}>
                -{lineChanges.deletions.toLocaleString()}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                {t('statistics.linesDeleted')}
              </div>
            </div>
          </div>
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
              {t('statistics.repositoryTimeline')}
            </h3>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <div className="text-xs" style={{ color: 'var(--text-subtle)' }}>{t('statistics.firstCommit')}</div>
                {statistics.first_commit_time && (
                  <div className="text-sm font-mono" style={{ color: 'var(--accent-blue)' }}>
                    {new Date(statistics.first_commit_time * 1000).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="flex-1 mx-4 h-px" style={{ backgroundColor: 'var(--border-color)' }} />
              <div className="text-center">
                <div className="text-xs" style={{ color: 'var(--text-subtle)' }}>{t('statistics.lastCommit')}</div>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {t('statistics.commitsByAuthor', authorStats.length)}
              </h3>
              {/* Author filter dropdown */}
              <select
                value={selectedAuthor ?? ''}
                onChange={(e) => setSelectedAuthor(e.target.value || null)}
                className="px-2 py-0.5 rounded text-xs"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <option value="">{t('statistics.allAuthors')}</option>
                {allAuthors.map((author) => (
                  <option key={author} value={author}>
                    {author}
                  </option>
                ))}
              </select>
            </div>
            <div className="px-2">
              <BarChart data={authorStats} />
            </div>
          </div>
        )}

        {/* Monthly commit distribution bar chart */}
        <div
          className="rounded-lg p-4"
          style={{
            backgroundColor: 'var(--bg-overlay)',
            border: '1px solid var(--border-color)',
          }}
        >
          <h3 className="text-xs font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
            {t('statistics.monthlyCommitDistribution')}
          </h3>
          <div className="px-2">
            <BarChart data={monthlyCommitData} />
          </div>
        </div>

        {/* Activity heatmap */}
        <div
          className="rounded-lg p-4"
          style={{
            backgroundColor: 'var(--bg-overlay)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {t('statistics.activityHeatmap')}
            </h3>
            <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
              {heatmapTotalCommits} {t('statistics.totalCommits').toLowerCase()} ({t('statistics.heatmapNote')})
            </span>
          </div>
          <div className="overflow-x-auto">
            <div
              className="grid gap-0.5"
              style={{
                gridTemplateRows: `repeat(${heatmapData.length}, 10px)`,
                gridAutoFlow: 'column',
                gridAutoColumns: '10px',
              }}
            >
              {heatmapData.map((week, weekIdx) =>
                week.map((day, dayIdx) => (
                  <div
                    key={`${weekIdx}-${dayIdx}`}
                    title={`${day.date}: ${day.count === 0 ? t('statistics.noCommits') : t('statistics.commitsOnDay', day.count)}`}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      backgroundColor: getHeatmapColor(day.count),
                      transition: 'background-color 0.15s',
                    }}
                  />
                ))
              )}
            </div>
          </div>
          {/* Legend */}
          <div className="flex items-center justify-end gap-1 mt-2">
            <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>{t('statistics.noCommits')}</span>
            {[0, 1, 3, 6].map((level) => (
              <div
                key={level}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  backgroundColor: getHeatmapColor(level),
                }}
              />
            ))}
            <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>6+</span>
          </div>
        </div>

        {/* Worktrees */}
        <div
          className="rounded-lg p-4"
          style={{
            backgroundColor: 'var(--bg-overlay)',
            border: '1px solid var(--border-color)',
          }}
        >
          <h3 className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
            {t('statistics.otherStatistics')}
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
