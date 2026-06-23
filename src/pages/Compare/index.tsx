import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGitStore } from '@/stores/git-store';
import { useUIStore } from '@/stores/ui-store';
import { DiffView } from '@/components/DiffView';
import { parseDiff } from '@/utils/diff-parser';
import { ArrowLeftRight, GitCompare, Loader2, FilePlus, FileEdit, FileMinus, Plus, Minus } from 'lucide-react';

export const Compare: React.FC = () => {
  const navigate = useNavigate();
  const branches = useGitStore((s) => s.branches);
  const tags = useGitStore((s) => s.tags);
  const diff = useGitStore((s) => s.diff);
  const diffLoading = useGitStore((s) => s.loading.diff);
  const diffError = useGitStore((s) => s.errors.diff);
  const fetchDiff = useGitStore((s) => s.fetchDiff);
  const addNotification = useUIStore((s) => s.addNotification);

  const [oldRef, setOldRef] = useState('');
  const [newRef, setNewRef] = useState('');
  const [hasCompared, setHasCompared] = useState(false);

  // Build revision options from branches and tags
  const revisions = useMemo(() => {
    const items: { label: string; value: string; type: string }[] = [];
    for (const branch of branches) {
      items.push({
        label: `${branch.is_current ? '* ' : ''}${branch.name}`,
        value: branch.name,
        type: 'branch',
      });
    }
    for (const tag of tags) {
      items.push({
        label: `tag: ${tag.name}`,
        value: tag.name,
        type: 'tag',
      });
    }
    return items;
  }, [branches, tags]);

  // Parse diff text into structured data
  const parsedFiles = useMemo(() => {
    if (!diff) return [];
    return parseDiff(diff);
  }, [diff]);

  // Calculate diff statistics
  const diffStats = useMemo(() => {
    let added = 0;
    let modified = 0;
    let deleted = 0;
    let insertions = 0;
    let deletions = 0;
    for (const file of parsedFiles) {
      if (file.status === 'Added') added++;
      else if (file.status === 'Deleted') deleted++;
      else modified++;
      if (file.stats) {
        insertions += file.stats.insertions;
        deletions += file.stats.deletions;
      }
    }
    return { added, modified, deleted, insertions, deletions, total: parsedFiles.length };
  }, [parsedFiles]);

  const handleCompare = useCallback(async () => {
    if (!oldRef.trim() || !newRef.trim()) {
      addNotification({ type: 'warning', title: 'Please select both old and new revisions' });
      return;
    }
    try {
      await fetchDiff({ commit1: oldRef.trim(), commit2: newRef.trim() });
      setHasCompared(true);
    } catch (err) {
      addNotification({ type: 'error', title: 'Failed to compare', message: String(err) });
    }
  }, [oldRef, newRef, fetchDiff, addNotification]);

  const handleSwap = useCallback(() => {
    const tmp = oldRef;
    setOldRef(newRef);
    setNewRef(tmp);
    setHasCompared(false);
  }, [oldRef, newRef]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-2 border-b shrink-0"
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
      >
        <GitCompare size={16} style={{ color: 'var(--accent-blue)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Compare Revisions
        </span>
      </div>

      {/* Revision selectors */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-mantle)' }}
      >
        {/* Old revision */}
        <div className="flex-1">
          <label className="text-xs block mb-1" style={{ color: 'var(--text-subtle)' }}>
            Old Revision
          </label>
          <div className="flex gap-1">
            <select
              value={oldRef}
              onChange={(e) => {
                setOldRef(e.target.value);
                setHasCompared(false);
              }}
              className="flex-1 px-2 py-1.5 rounded border text-xs"
              style={{
                backgroundColor: 'var(--bg-base)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">Select revision...</option>
              {revisions.map((rev) => (
                <option key={`old-${rev.value}`} value={rev.value}>
                  {rev.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={oldRef}
              onChange={(e) => {
                setOldRef(e.target.value);
                setHasCompared(false);
              }}
              placeholder="Branch / Tag / SHA"
              className="w-40 px-2 py-1.5 rounded border text-xs"
              style={{
                backgroundColor: 'var(--bg-base)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {/* Swap button */}
        <button
          onClick={handleSwap}
          className="p-2 rounded transition-colors hover:bg-overlay mt-4"
          style={{ color: 'var(--accent-mauve)' }}
          title="Swap revisions"
        >
          <ArrowLeftRight size={16} />
        </button>

        {/* New revision */}
        <div className="flex-1">
          <label className="text-xs block mb-1" style={{ color: 'var(--text-subtle)' }}>
            New Revision
          </label>
          <div className="flex gap-1">
            <select
              value={newRef}
              onChange={(e) => {
                setNewRef(e.target.value);
                setHasCompared(false);
              }}
              className="flex-1 px-2 py-1.5 rounded border text-xs"
              style={{
                backgroundColor: 'var(--bg-base)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">Select revision...</option>
              {revisions.map((rev) => (
                <option key={`new-${rev.value}`} value={rev.value}>
                  {rev.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newRef}
              onChange={(e) => {
                setNewRef(e.target.value);
                setHasCompared(false);
              }}
              placeholder="Branch / Tag / SHA"
              className="w-40 px-2 py-1.5 rounded border text-xs"
              style={{
                backgroundColor: 'var(--bg-base)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {/* Compare button */}
        <button
          onClick={handleCompare}
          disabled={diffLoading}
          className="px-4 py-1.5 rounded text-xs font-medium transition-colors mt-4 disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent-blue)', color: 'var(--bg-base)' }}
        >
          {diffLoading ? (
            <span className="flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />
              Comparing...
            </span>
          ) : (
            'Compare'
          )}
        </button>
      </div>

      {/* Error */}
      {diffError && (
        <div
          className="px-4 py-2 border-b text-xs"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'rgba(243, 139, 168, 0.1)',
            color: 'var(--accent-red)',
          }}
        >
          {diffError}
        </div>
      )}

      {/* Diff statistics */}
      {hasCompared && parsedFiles.length > 0 && (
        <div
          className="flex items-center gap-4 px-4 py-2 border-b shrink-0"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            {diffStats.total} files changed
          </span>
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent-green)' }}>
            <FilePlus size={12} />
            <span>{diffStats.added} added</span>
          </div>
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent-yellow)' }}>
            <FileEdit size={12} />
            <span>{diffStats.modified} modified</span>
          </div>
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent-red)' }}>
            <FileMinus size={12} />
            <span>{diffStats.deleted} deleted</span>
          </div>
          <div
            className="ml-auto flex items-center gap-3 text-xs font-mono"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span className="flex items-center gap-1" style={{ color: 'var(--accent-green)' }}>
              <Plus size={10} />
              {diffStats.insertions}
            </span>
            <span className="flex items-center gap-1" style={{ color: 'var(--accent-red)' }}>
              <Minus size={10} />
              {diffStats.deletions}
            </span>
          </div>
        </div>
      )}

      {/* Diff content */}
      <div className="flex-1 overflow-hidden">
        {diffLoading ? (
          <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-subtle)' }}>
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : hasCompared && parsedFiles.length > 0 ? (
          <DiffView files={parsedFiles} />
        ) : hasCompared && parsedFiles.length === 0 ? (
          <div
            className="flex items-center justify-center h-full text-sm"
            style={{ color: 'var(--text-subtle)' }}
          >
            No differences found between the selected revisions.
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center h-full gap-2"
            style={{ color: 'var(--text-subtle)' }}
          >
            <GitCompare size={32} />
            <p className="text-sm">Select two revisions and click Compare to view differences</p>
          </div>
        )}
      </div>
    </div>
  );
};
