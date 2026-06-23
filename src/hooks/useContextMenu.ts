import { useCallback } from 'react';
import { useUIStore } from '@/stores/ui-store';
import type { ContextMenuItem } from '@/types';

/**
 * Hook to provide context menu functionality
 */
export function useContextMenu() {
  const showContextMenu = useUIStore((s) => s.showContextMenu);
  const closeContextMenu = useUIStore((s) => s.closeContextMenu);

  const openContextMenu = useCallback(
    (e: React.MouseEvent | { clientX: number; clientY: number }, items: ContextMenuItem[]) => {
      if ('preventDefault' in e) {
        e.preventDefault();
      }
      const clientX = 'clientX' in e ? e.clientX : 0;
      const clientY = 'clientY' in e ? e.clientY : 0;
      showContextMenu(clientX, clientY, items);
    },
    [showContextMenu]
  );

  return {
    openContextMenu,
    closeContextMenu,
  };
}
