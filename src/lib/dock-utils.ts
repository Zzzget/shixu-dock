import type { DockItem, DockState, TaskInfo } from '../types';

/**
 * 把任意异常转换为可展示的中文错误文案。
 * @param error 捕获到的异常，通常是 Error 实例或字符串。
 */
export const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * 判断任务是否仍处于活动状态（启动中、运行中或停止中）。
 * @param task 可选的任务快照；为空时返回 false。
 */
export const activeTask = (task?: TaskInfo) =>
  Boolean(task && ['starting', 'running', 'stopping'].includes(task.status));

/**
 * 从状态中解析最近使用的应用，去重且仅保留应用类型，最多返回 10 个。
 * @param state 完整程序坞状态；为空时返回空数组。
 */
export function recentApps(state?: DockState): DockItem[] {
  if (!state) return [];
  const items = new Map(state.items.map(item => [item.id, item]));
  return [...new Set(state.recentIds)]
    .map(id => items.get(id))
    .filter((item): item is DockItem => item?.kind === 'app')
    .slice(0, 10);
}
