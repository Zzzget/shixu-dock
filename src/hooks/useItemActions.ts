import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { api, isDesktop } from '../api';
import type { DockItem, DockState, ItemDraft } from '../types';
import type { Action } from '../lib/app-types';

/**
 * 集中处理入口相关的异步操作：启动、置顶、保存、运行脚本、打开文件夹与停止任务。
 * @param action 包装异步操作的通用执行器，负责加载态与错误提示。
 * @param setState 更新完整程序坞状态的状态设置函数。
 * @param setLogId 设置当前查看日志的项目入口 id。
 * @param busy 当前加载态标识集合，用于判断某个入口是否忙碌。
 * @returns 一组绑定到入口的事件回调。
 */
export function useItemActions(
  action: Action,
  setState: Dispatch<SetStateAction<DockState | undefined>>,
  setLogId: (id: string) => void,
  busy: Set<string>,
) {
  const itemBusy = useCallback(
    (item: DockItem) => busy.has(`item-${item.id}`) || busy.has(`launch-${item.id}`),
    [busy],
  );

  const itemAction = useCallback(
    (item: DockItem, operation: () => Promise<unknown>, success: string) => {
      void action(`item-${item.id}`, operation, success);
    },
    [action],
  );

  const launchItem = useCallback(
    (item: DockItem) => {
      void action(
        `launch-${item.id}`,
        () => api.launch(item.id),
        isDesktop
          ? `已请求${item.kind === 'project' ? '用编辑器打开' : '打开'} ${item.name}`
          : `演示：已选择 ${item.name}，不会打开真实${item.kind === 'project' ? '编辑器' : '程序或文件'}。`,
      );
    },
    [action],
  );

  const pinItem = useCallback(
    (item: DockItem) =>
      itemAction(
        item,
        async () => {
          setState(
            await api.saveItem({
              id: item.id,
              kind: item.kind,
              name: item.name,
              path: item.path,
              group: item.group,
              editorPath: item.editorPath,
              script: item.script,
              pinned: !item.pinned,
            }),
          );
        },
        item.pinned ? '已取消置顶' : '已置顶入口（最近使用仍按打开顺序排列）',
      ),
    [itemAction, setState],
  );

  const saveItem = useCallback(
    (draft: ItemDraft) =>
      action(
        'save-item',
        async () => {
          setState(await api.saveItem(draft));
        },
        isDesktop ? '入口已保存' : '演示入口已保存到浏览器',
      ),
    [action, setState],
  );

  const runProject = useCallback(
    (item: DockItem) => {
      setLogId(item.id);
      itemAction(
        item,
        () => api.runProject(item.id),
        isDesktop
          ? '已提交运行请求，请查看日志确认启动结果。'
          : '演示：仅模拟任务状态与日志，不会启动真实项目。',
      );
    },
    [itemAction, setLogId],
  );

  const openFolderItem = useCallback(
    (item: DockItem) =>
      itemAction(
        item,
        () => api.openFolder(item.id),
        isDesktop ? '已请求打开项目文件夹' : '演示：不会打开真实文件夹。',
      ),
    [itemAction],
  );

  const stopProjectItem = useCallback(
    (item: DockItem) =>
      itemAction(
        item,
        () => api.stopProject(item.id),
        isDesktop
          ? '已请求停止进程，请以任务状态和日志为准。'
          : '演示任务已停止，没有影响真实进程。',
      ),
    [itemAction],
  );

  return { itemBusy, launchItem, pinItem, saveItem, runProject, openFolderItem, stopProjectItem };
}
