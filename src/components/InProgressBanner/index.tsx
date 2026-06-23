import React, { useEffect, useState, useCallback } from 'react';
import { useGitStore } from '@/stores/git-store';
import { useUIStore } from '@/stores/ui-store';
import { useTranslation } from '@/i18n';
import {
  AlertTriangle,
  GitMerge,
  GitBranch,
  Cherry,
  RotateCcw,
  Search,
  X,
  Loader2,
} from 'lucide-react';
import type { InProgressState } from '@/types';

interface InProgressBannerProps {
  className?: string;
}

const operationConfig: Record<
  InProgressState['type'],
  { labelKey: string; icon: React.ReactNode; color: string; abortAction: string }
> = {
  merge: {
    labelKey: 'inProgress.merge',
    icon: <GitMerge size={14} />,
    color: 'var(--accent-yellow)',
    abortAction: 'abortMerge',
  },
  rebase: {
    labelKey: 'inProgress.rebase',
    icon: <GitBranch size={14} />,
    color: 'var(--accent-peach)',
    abortAction: 'rebaseAbort',
  },
  cherry_pick: {
    labelKey: 'inProgress.cherryPick',
    icon: <Cherry size={14} />,
    color: 'var(--accent-mauve)',
    abortAction: 'cherryPickAbort',
  },
  revert: {
    labelKey: 'inProgress.revert',
    icon: <RotateCcw size={14} />,
    color: 'var(--accent-blue)',
    abortAction: 'revert',
  },
  bisect: {
    labelKey: 'inProgress.bisect',
    icon: <Search size={14} />,
    color: 'var(--accent-teal)',
    abortAction: 'rebaseAbort', // bisect reset via git bisect reset
  },
  none: {
    labelKey: '',
    icon: null,
    color: '',
    abortAction: '',
  },
};

export const InProgressBanner: React.FC<InProgressBannerProps> = ({ className = '' }) => {
  const inProgress = useGitStore((s) => s.inProgress);
  const fetchInProgress = useGitStore((s) => s.fetchInProgress);
  const inProgressLoading = useGitStore((s) => s.loading.inProgress);
  const addNotification = useUIStore((s) => s.addNotification);
  const abortMerge = useGitStore((s) => s.abortMerge);
  const rebaseAbort = useGitStore((s) => s.rebaseAbort);
  const cherryPickAbort = useGitStore((s) => s.cherryPickAbort);
  const { t } = useTranslation();

  const [dismissed, setDismissed] = useState(false);
  const [aborting, setAborting] = useState(false);

  useEffect(() => {
    fetchInProgress();
  }, [fetchInProgress]);

  // Reset dismissed state when inProgress changes
  useEffect(() => {
    if (inProgress && inProgress.type !== 'none') {
      setDismissed(false);
    }
  }, [inProgress]);

  const handleAbort = useCallback(async () => {
    if (!inProgress || inProgress.type === 'none') return;
    setAborting(true);
    try {
      switch (inProgress.type) {
        case 'merge':
          await abortMerge();
          break;
        case 'rebase':
          await rebaseAbort();
          break;
        case 'cherry_pick':
          await cherryPickAbort();
          break;
        case 'revert':
          // Revert doesn't have a dedicated abort; reset is handled differently
          addNotification({
            type: 'info',
            title: 'Revert in progress',
            message: 'Resolve conflicts manually or reset to complete.',
          });
          break;
        case 'bisect':
          addNotification({
            type: 'info',
            title: 'Bisect in progress',
            message: 'Use "git bisect reset" to abort the bisect operation.',
          });
          break;
      }
      await fetchInProgress();
      addNotification({ type: 'success', title: t('inProgress.abortSuccess') });
    } catch (err) {
      addNotification({ type: 'error', title: t('inProgress.abortFailed'), message: String(err) });
    } finally {
      setAborting(false);
    }
  }, [inProgress, abortMerge, rebaseAbort, cherryPickAbort, fetchInProgress, addNotification]);

  if (dismissed || inProgressLoading || !inProgress || inProgress.type === 'none') {
    return null;
  }

  const config = operationConfig[inProgress.type];

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 border-b shrink-0 ${className}`}
      style={{
        borderColor: 'var(--border-color)',
        backgroundColor: `${config.color}15`,
      }}
    >
      <div className="flex items-center gap-2" style={{ color: config.color }}>
        <AlertTriangle size={14} />
        {config.icon}
        <span className="text-xs font-medium">{t(config.labelKey)}</span>
      </div>

      {inProgress.details && (
        <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
          {inProgress.details}
        </span>
      )}

      {inProgress.current_commit && (
        <span className="text-xs font-mono" style={{ color: 'var(--text-subtle)' }}>
          at {inProgress.current_commit.slice(0, 7)}
        </span>
      )}

      {inProgress.current_step !== undefined && inProgress.total_steps !== undefined && (
        <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
          Step {inProgress.current_step}/{inProgress.total_steps}
        </span>
      )}

      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={handleAbort}
          disabled={aborting}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
          style={{
            backgroundColor: 'var(--accent-red)',
            color: 'var(--bg-base)',
          }}
        >
          {aborting ? (
            <>
              <Loader2 size={10} className="animate-spin" />
              {t('inProgress.aborting')}
            </>
          ) : (
            t('inProgress.abort')
          )}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded transition-colors hover:bg-overlay"
          style={{ color: 'var(--text-subtle)' }}
          title="Dismiss"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};
