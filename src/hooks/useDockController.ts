import { useCallback, useEffect, useRef, useState } from 'react';
import { api, isDesktop } from '../api';
import type { DockItem, DockState, Settings, TaskInfo } from '../types';
import { errorText, activeTask, recentApps } from '../lib/dock-utils';
import { sectionInfo } from '../constants';
import type {
  Action,
  DockController,
  ItemModalState,
  Notify,
  Section,
  Toast,
} from '../lib/app-types';
import { useItemActions } from './useItemActions';
import { useDragImport } from './useDragImport';

/**
 * 程序坞主控制器：集中管理全部状态、订阅、加载、异步操作与事件回调。
 * @param dockView 当前是否为 ?view=dock 悬浮窗口视图，影响「回到主界面」的行为。
 * @returns 供页面组合渲染的完整控制器对象。
 */
export function useDockController(dockView: boolean): DockController {
  const [state, setState] = useState<DockState>();
  const [tasks, setTasks] = useState<Record<string, TaskInfo>>({});
  const [section, setSection] = useState<Section>('recent');
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('全部');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextToast = useRef(0);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const busyRef = useRef(new Set<string>());
  const [loadError, setLoadError] = useState('');
  const [itemModal, setItemModal] = useState<ItemModalState>();
  const [removeTarget, setRemoveTarget] = useState<DockItem>();
  const [logId, setLogId] = useState<string>();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMainHidden, setPreviewMainHidden] = useState(false);
  const [allTasksOpen, setAllTasksOpen] = useState(false);

  const notify = useCallback<Notify>((message, tone = 'info') => {
    setToasts(previous => [...previous.slice(-3), { id: ++nextToast.current, message, tone }]);
  }, []);

  const dismiss = useCallback(
    (id: number) => setToasts(previous => previous.filter(toast => toast.id !== id)),
    [],
  );

  const action = useCallback<Action>(
    async (key, operation, success) => {
      if (busyRef.current.has(key)) return false;
      busyRef.current.add(key);
      setBusy(new Set(busyRef.current));
      try {
        await operation();
        if (success) notify(success, isDesktop ? 'success' : 'info');
        return true;
      } catch (error) {
        notify(errorText(error), 'error');
        return false;
      } finally {
        busyRef.current.delete(key);
        setBusy(new Set(busyRef.current));
      }
    },
    [notify],
  );

  const load = useCallback(async () => {
    setLoadError('');
    await action('load', async () => {
      try {
        setState(await api.getState());
      } catch (error) {
        setLoadError(errorText(error));
        throw error;
      }
    });
    await action('load-tasks', async () => {
      const latest = await api.getTasks();
      setTasks(Object.fromEntries(latest.map(task => [task.id, task])));
    });
  }, [action]);

  useEffect(() => {
    const offState = api.onState(setState);
    const offTask = api.onTask(task => setTasks(previous => ({ ...previous, [task.id]: task })));
    void load();
    return () => {
      offState();
      offTask();
    };
  }, [load]);

  useEffect(() => {
    if (state?.warning) notify(state.warning, 'error');
  }, [state?.warning, notify]);

  const itemActions = useItemActions(action, setState, setLogId, busy);
  const drag = useDragImport(action, setState, notify, busy);

  const info = sectionInfo[section];
  const apps = recentApps(state);
  const projects = state?.items.filter(item => item.kind === 'project') ?? [];
  const library = state?.items.filter(item => item.kind !== 'project') ?? [];
  const baseItems =
    section === 'recent'
      ? apps
      : section === 'projects' || section === 'commands'
        ? projects
        : library;
  const groups = [...new Set(baseItems.map(item => item.group || '未分组'))].sort((a, b) =>
    a.localeCompare(b, 'zh-CN'),
  );
  const allGroups = [...new Set(state?.items.map(item => item.group || '未分组') ?? [])];
  const query = search.trim().toLocaleLowerCase();
  const effectiveGroup = group === '全部' || groups.includes(group) ? group : '全部';
  const filtered = baseItems.filter(
    item =>
      (!query ||
        [item.name, item.path, item.group, item.script ?? ''].some(value =>
          value.toLocaleLowerCase().includes(query),
        )) &&
      (effectiveGroup === '全部' || (item.group || '未分组') === effectiveGroup),
  );
  const shownItems =
    section === 'recent'
      ? filtered
      : [...filtered].sort(
        (a, b) => Number(b.pinned) - Number(a.pinned) || a.createdAt - b.createdAt,
      );
  const runningTasks = Object.values(tasks).filter(activeTask);

  const changeSection = useCallback((next: Section) => {
    setSection(next);
    setSearch('');
    setGroup('全部');
  }, []);

  const changeSearch = useCallback((value: string) => setSearch(value), []);
  const changeGroup = useCallback((value: string) => setGroup(value), []);
  const openItemModal = useCallback((modal: ItemModalState) => setItemModal(modal), []);
  const closeItemModal = useCallback(() => setItemModal(undefined), []);
  const openRemoveDialog = useCallback((item: DockItem) => setRemoveTarget(item), []);
  const closeRemoveDialog = useCallback(() => setRemoveTarget(undefined), []);
  const openLog = useCallback((id: string) => setLogId(id), []);
  const closeLog = useCallback(() => setLogId(undefined), []);
  const openTasks = useCallback(() => setAllTasksOpen(true), []);
  const closeTasks = useCallback(() => setAllTasksOpen(false), []);
  const togglePreview = useCallback(() => setPreviewOpen(!previewOpen), [previewOpen]);

  const openPreviewMain = useCallback(() => {
    if (dockView) {
      window.location.search = '?view=main';
      return;
    }
    setPreviewMainHidden(false);
    notify('已回到拾序主界面。这里是浏览器交互预览。');
  }, [dockView, notify]);

  const mainWindowAction = useCallback(
    (kind: 'minimize' | 'hide') => {
      if (isDesktop)
        void action('window', () => (kind === 'minimize' ? api.minimizeMain() : api.hideMain()));
      else {
        setPreviewMainHidden(true);
        setPreviewOpen(true);
      }
    },
    [action],
  );

  const pickPath = useCallback(
    async (
      kind: 'app' | 'file' | 'folder' | 'editor',
      browserHint: string,
    ): Promise<string | null> => {
      try {
        const path = await api.pickPath(kind);
        if (!path && !isDesktop) notify(browserHint);
        return path;
      } catch (error) {
        notify(errorText(error), 'error');
        return null;
      }
    },
    [notify],
  );

  const saveSettings = useCallback(
    (settings: Settings) =>
      action(
        'settings',
        async () => {
          setState(await api.saveSettings(settings));
        },
        isDesktop ? '偏好设置已保存' : '演示偏好已保存，不会修改系统设置',
      ),
    [action],
  );

  const onQuit = useCallback(() => {
    void action('quit', () => api.quit());
  }, [action]);

  const confirmRemove = useCallback(
    (item: DockItem) => {
      void action(
        `item-${item.id}`,
        async () => {
          setState(await api.removeItem(item.id));
          setRemoveTarget(undefined);
        },
        '已移除入口，原始文件未受影响',
      );
    },
    [action],
  );

  return {
    state,
    tasks,
    section,
    search,
    group,
    toasts,
    busy,
    loadError,
    itemModal,
    removeTarget,
    logId,
    previewOpen,
    previewMainHidden,
    allTasksOpen,
    dragOver: drag.dragOver,
    info,
    apps,
    library,
    baseItems,
    groups,
    allGroups,
    query,
    effectiveGroup,
    shownItems,
    runningTasks,
    notify,
    dismiss,
    action,
    load,
    changeSection,
    changeSearch,
    changeGroup,
    openItemModal,
    closeItemModal,
    openRemoveDialog,
    closeRemoveDialog,
    openLog,
    closeLog,
    openTasks,
    closeTasks,
    togglePreview,
    openPreviewMain,
    mainWindowAction,
    launchItem: itemActions.launchItem,
    pinItem: itemActions.pinItem,
    runProject: itemActions.runProject,
    openFolderItem: itemActions.openFolderItem,
    stopProjectItem: itemActions.stopProjectItem,
    itemBusy: itemActions.itemBusy,
    saveItem: itemActions.saveItem,
    saveSettings,
    pickPath,
    onQuit,
    confirmRemove,
    drop: drag.drop,
    onDragEnter: drag.onDragEnter,
    onDragLeave: drag.onDragLeave,
    onDragOver: drag.onDragOver,
  };
}
