import { useEffect, useRef, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useGitStore } from '@/stores/git-store';
import { useUIStore } from '@/stores/ui-store';
import type { InProgressOperation } from '@/types';

/**
 * Hook to watch for file system changes in the repository
 * Listens to Tauri events for git operations and file changes
 */
export function useGitWatcher(repoPath: string | null) {
  const fetchStatus = useGitStore((s) => s.fetchStatus);
  const fetchBranches = useGitStore((s) => s.fetchBranches);
  const addOperation = useUIStore((s) => s.addOperation);
  const removeOperation = useUIStore((s) => s.removeOperation);
  const addNotification = useUIStore((s) => s.addNotification);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debouncedFetch = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Set up polling for status changes
  useEffect(() => {
    if (!repoPath) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial fetch
    fetchStatus();

    // Poll every 5 seconds (increased from 3s to reduce CPU usage)
    intervalRef.current = setInterval(() => {
      fetchStatus();
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [repoPath, fetchStatus]);

  // Listen to Tauri events for git operations
  useEffect(() => {
    if (!repoPath) return;

    const unlisteners: Array<() => void> = [];

    const setupListeners = async () => {
      try {
        // Listen for git operation start
        const unlisten1 = await listen<{ type: string; message: string }>('git-operation-start', (event) => {
          const op: Omit<InProgressOperation, 'id'> = {
            type: event.payload.type as InProgressOperation['type'],
            message: event.payload.message,
          };
          addOperation(op);
        });
        unlisteners.push(unlisten1);

        // Listen for git operation progress
        const unlisten2 = await listen<{ id: string; progress: number; total: number }>('git-operation-progress', (event) => {
          const { id, progress, total } = event.payload;
          useUIStore.getState().updateOperation(id, { progress, total });
        });
        unlisteners.push(unlisten2);

        // Listen for git operation complete
        const unlisten3 = await listen<{ id: string; success: boolean; message?: string }>('git-operation-complete', (event) => {
          const { id, success, message } = event.payload;
          removeOperation(id);

          if (success) {
            addNotification({ type: 'success', title: message ?? 'Operation completed' });
            // Mutation operations already call fetchAll internally, no need to refresh here
          } else {
            addNotification({ type: 'error', title: message ?? 'Operation failed' });
          }
        });
        unlisteners.push(unlisten3);

        // Listen for file system changes with 500ms debounce
        const unlisten4 = await listen<string>('fs-change', () => {
          if (debouncedFetch.current) clearTimeout(debouncedFetch.current);
          debouncedFetch.current = setTimeout(() => {
            fetchStatus();
          }, 500);
        });
        unlisteners.push(unlisten4);
      } catch (error) {
        console.error('Failed to set up git watchers:', error);
      }
    };

    setupListeners();

    return () => {
      unlisteners.forEach((unlisten) => unlisten());
      if (debouncedFetch.current) {
        clearTimeout(debouncedFetch.current);
        debouncedFetch.current = null;
      }
    };
  }, [repoPath, fetchStatus, fetchBranches, addOperation, removeOperation, addNotification]);

  // Manual refresh
  const refresh = useCallback(() => {
    fetchStatus();
    fetchBranches();
  }, [fetchStatus, fetchBranches]);

  return { refresh };
}
