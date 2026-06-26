import { create } from 'zustand';
import type { TabType, ContextMenuState, ContextMenuItem, Notification, DialogState, InProgressOperation, CommandItem } from '@/types';

interface UIStore {
  // Command Palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;

  // Context Menu
  contextMenu: ContextMenuState | null;
  showContextMenu: (x: number, y: number, items: ContextMenuItem[]) => void;
  closeContextMenu: () => void;

  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;

  // Dialogs
  dialog: DialogState | null;
  showDialog: (dialog: DialogState) => void;
  closeDialog: () => void;

  // In-progress operations
  operations: InProgressOperation[];
  addOperation: (operation: Omit<InProgressOperation, 'id'>) => void;
  updateOperation: (id: string, update: Partial<InProgressOperation>) => void;
  removeOperation: (id: string) => void;

  // Commands
  commands: CommandItem[];
  registerCommand: (command: CommandItem) => void;
  unregisterCommand: (id: string) => void;

  // Sidebar
  sidebarOpen: boolean;
  sidebarWidth: number;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;

  // Active View Tab (controlled from sidebar)
  activeViewTab: TabType;
  setActiveViewTab: (tab: TabType) => void;

  // Bottom panel
  bottomPanelOpen: boolean;
  bottomPanelHeight: number;
  toggleBottomPanel: () => void;
  setBottomPanelHeight: (height: number) => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open: boolean) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

  contextMenu: null,
  showContextMenu: (x: number, y: number, items: ContextMenuItem[]) => {
    set({ contextMenu: { x, y, items } });
  },
  closeContextMenu: () => set({ contextMenu: null }),

  notifications: [],
  addNotification: (notification: Omit<Notification, 'id'>) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newNotification: Notification = { ...notification, id };
    set((s) => ({ notifications: [...s.notifications, newNotification] }));

    const duration = notification.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        get().removeNotification(id);
      }, duration);
    }
  },
  removeNotification: (id: string) => {
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
  },

  dialog: null,
  showDialog: (dialog: DialogState) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),

  operations: [],
  addOperation: (operation) => {
    const id = `op-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set((s) => ({ operations: [...s.operations, { ...operation, id }] }));
  },
  updateOperation: (id, update) => {
    set((s) => ({
      operations: s.operations.map((op) => (op.id === id ? { ...op, ...update } : op)),
    }));
  },
  removeOperation: (id) => {
    set((s) => ({ operations: s.operations.filter((op) => op.id !== id) }));
  },

  commands: [],
  registerCommand: (command) => {
    set((s) => {
      const filtered = s.commands.filter((c) => c.id !== command.id);
      return { commands: [...filtered, command] };
    });
  },
  unregisterCommand: (id) => {
    set((s) => ({ commands: s.commands.filter((c) => c.id !== id) }));
  },

  sidebarOpen: true,
  sidebarWidth: 260,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarWidth: (width: number) => set({ sidebarWidth: width }),

  activeViewTab: 'histories' as TabType,
  setActiveViewTab: (tab: TabType) => set({ activeViewTab: tab }),

  bottomPanelOpen: false,
  bottomPanelHeight: 250,
  toggleBottomPanel: () => set((s) => ({ bottomPanelOpen: !s.bottomPanelOpen })),
  setBottomPanelHeight: (height: number) => set({ bottomPanelHeight: height }),
}));
