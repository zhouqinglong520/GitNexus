import React, { useEffect, useState, useCallback } from 'react';
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
import { X, Loader2, FolderOpen, Copy } from 'lucide-react';
import type { TabType, ContextMenuItem } from '@/types';

/**
 * Repository 主页面
 *
 * 布局仿照 SourceGit 的 Repository.axaml：
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │ Tab Bar（仓库标签 - 可拖拽排序）                               │
 * ├──────────────────┬───┬──────────────────────────────────────┤
 * │                  │ 3 │ InProgress 警告栏（条件渲染）            │
 * │   左侧边栏        │px │ Bisect 警告栏（条件渲染）              │
 * │   （可拖拽宽度      │   ├──────────────────────────────────────┤
 * │   200-500px）      │   │                                      │
 * │                  │   │  内容区                                │
 * │                  │   │  ├── Histories                        │
 * │                  │   │  ├── WorkingCopy                      │
 * │                  │   │  └── Stashes                           │
 * └──────────────────┴───┴──────────────────────────────────────┘
 *
 * 视图切换（histories / working-copy / stashes）由侧边栏的视图选择器控制，
 * 通过 ui-store 的 activeViewTab 驱动。
 */
export const Repository: React.FC = () => {
  const navigate = useNavigate();
  const activeRepo = useRepositoryStore((s) => s.activeRepo);
  const tabs = useRepositoryStore((s) => s.tabs);
  const closeTab = useRepositoryStore((s) => s.closeTab);
  const setActiveTab = useRepositoryStore((s) => s.setActiveTab);
  const reorderTabs = useRepositoryStore((s) => s.reorderTabs);
  const operations = useUIStore((s) => s.operations);
  const fetchAll = useGitStore((s) => s.fetchAll);
  const openInFileManager = useGitStore((s) => s.openInFileManager);
  const loading = useGitStore((s) => s.loading);
  const showContextMenu = useUIStore((s) => s.showContextMenu);
  const activeViewTab = useUIStore((s) => s.activeViewTab);
  const { t } = useTranslation();

  // 追踪是否完成过首次数据加载（避免 loading 初始 false 导致跳过骨架屏）
  const [initialLoaded, setInitialLoaded] = useState(false);

  // 监听仓库文件系统变化，自动刷新 status / branches 等
  useGitWatcher(activeRepo);

  const isLoading = loading.commits || loading.branches || loading.tags || loading.remotes || loading.status;
  const showLoading = !initialLoaded || isLoading;
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);

  // 无活跃仓库时跳转首页
  useEffect(() => {
    if (!activeRepo) {
      navigate('/');
    }
  }, [activeRepo, navigate]);

  // 打开仓库后加载初始数据
  useEffect(() => {
    if (activeRepo) {
      setInitialLoaded(false);
      fetchAll().then(() => {
        setInitialLoaded(true);
      }).catch((err) => {
        console.error('Failed to load repository data:', err);
        setInitialLoaded(true); // 即使失败也标记已加载，显示空内容而不是永远转圈
      });
    }
  }, [activeRepo, fetchAll]);

  if (!activeRepo) return null;

  // 当前视图类型：优先使用当前 tab 记录的类型，否则使用 ui-store 全局 activeViewTab
  const currentTab = tabs.find((t) => t.repoPath === activeRepo);
  const tabType = currentTab?.type ?? activeViewTab;

  // ── Tab 右键菜单 ──────────────────────────────────────────
  const handleTabContextMenu = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.preventDefault();
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return;

      const tabIndex = tabs.findIndex((t) => t.id === tabId);
      const items: ContextMenuItem[] = [
        {
          id: 'close-tab',
          label: t('repository.closeTab'),
          action: () => closeTab(tabId),
        },
        {
          id: 'close-others',
          label: t('repository.closeOtherTabs'),
          action: () => {
            tabs.forEach((t) => {
              if (t.id !== tabId) closeTab(t.id);
            });
          },
          disabled: tabs.length <= 1,
        },
        {
          id: 'close-right',
          label: t('repository.closeRightTabs'),
          action: () => {
            const rightTabs = tabs.filter((t) => tabs.indexOf(t) > tabIndex);
            rightTabs.forEach((t) => closeTab(t.id));
          },
          disabled: tabIndex >= tabs.length - 1,
        },
        {
          id: 'close-all',
          label: t('repository.closeAllTabs'),
          action: () => {
            tabs.forEach((t) => closeTab(t.id));
          },
        },
        { id: 'sep1', label: '', separator: true },
        {
          id: 'copy-path',
          label: t('repository.copyRepoPath'),
          icon: <Copy size={12} />,
          action: () => navigator.clipboard.writeText(tab.repoPath),
        },
        {
          id: 'open-in-file-manager',
          label: t('repository.openInFileManager'),
          icon: <FolderOpen size={12} />,
          action: () => {
            openInFileManager(tab.repoPath).catch((err) => {
              console.error('Failed to open file manager:', err);
            });
          },
        },
      ];
      showContextMenu(e.clientX, e.clientY, items);
    },
    [tabs, closeTab, showContextMenu, t, openInFileManager]
  );

  // ── Tab 拖拽排序处理 ──────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragSourceIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      setDragOverIndex(null);
      const fromIndex = dragSourceIndex;
      if (fromIndex !== null && fromIndex !== toIndex) {
        reorderTabs(fromIndex, toIndex);
      }
      setDragSourceIndex(null);
    },
    [dragSourceIndex, reorderTabs]
  );

  const handleDragEnd = useCallback(() => {
    setDragSourceIndex(null);
    setDragOverIndex(null);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* ── 顶部 Tab Bar：仓库标签栏（可拖拽排序） ─────────── */}
      <div
        className="flex items-center border-b shrink-0"
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
      >
        {/* 仓库标签列表 */}
        <div className="flex flex-1 overflow-x-auto">
          {tabs.map((tab, index) => (
            <div
              key={tab.id}
              draggable
              onClick={() => setActiveTab(tab.id)}
              onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer transition-colors border-r"
              style={{
                backgroundColor: tab.repoPath === activeRepo ? 'var(--bg-base)' : 'var(--bg-surface)',
                borderColor: 'var(--border-color)',
                color: tab.repoPath === activeRepo ? 'var(--text-primary)' : 'var(--text-subtle)',
                borderBottom:
                  tab.repoPath === activeRepo ? '2px solid var(--accent-blue)' : '2px solid transparent',
                opacity: dragSourceIndex === index ? 0.5 : 1,
                borderLeft:
                  dragOverIndex === index && dragSourceIndex !== index
                    ? '2px solid var(--accent-blue)'
                    : undefined,
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
      </div>

      {/* ── 主体区域：左 Sidebar + 右内容（两列布局） ──────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧边栏 */}
        <Sidebar />

        {/* 3px 分隔线 */}
        <div
          className="shrink-0"
          style={{ width: 3, backgroundColor: 'var(--border-color)' }}
        />

        {/* 右侧内容区 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* InProgress 警告栏（Height=28，条件渲染） */}
          {operations.length > 0 && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 border-b shrink-0"
              style={{
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--bg-mantle)',
                height: 28,
              }}
            >
              {operations.map((op) => (
                <div
                  key={op.id}
                  className="flex items-center gap-2 text-xs"
                  style={{ color: 'var(--accent-yellow)' }}
                >
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

          {/* InProgress 横幅（merge / rebase / cherry-pick / revert / bisect） */}
          <InProgressBanner />

          {/* 内容区：根据 activeViewTab 显示对应视图 */}
          <div className="flex-1 overflow-hidden">
            {showLoading ? (
              /* Loading 骨架屏 */
              <div
                className="flex flex-col items-center justify-center h-full gap-3"
                style={{ color: 'var(--text-subtle)' }}
              >
                <div
                  className="animate-spin w-6 h-6 border-2 rounded-full"
                  style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }}
                />
                <span className="text-sm">Loading repository...</span>
              </div>
            ) : (
              <>
                {tabType === 'histories' && <Histories />}
                {tabType === 'working-copy' && <WorkingCopy />}
                {tabType === 'stashes' && <Stashes />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
