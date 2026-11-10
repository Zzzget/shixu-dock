import { useCallback, useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { api, isDesktop } from '../api';
import type { DockState } from '../types';
import type { Action, Notify } from '../lib/app-types';

/**
 * 处理主窗口的拖拽导入：计数、遮罩、放置效果与批量导入，并阻止浏览器默认打开拖入文件。
 * @param action 包装异步操作的通用执行器，负责加载态与错误提示。
 * @param setState 更新完整程序坞状态的状态设置函数。
 * @param notify 统一提示函数，用于空拖放与浏览器预览提示。
 * @param busy 当前加载态标识集合，用于设置拖放效果。
 * @returns 拖拽状态与一组绑定到主窗口的拖拽事件回调。
 */
export function useDragImport(
  action: Action,
  setState: Dispatch<SetStateAction<DockState | undefined>>,
  notify: Notify,
  busy: Set<string>,
) {
  const [dragOver, setDragOver] = useState(false);
  const dragCount = useRef(0);

  useEffect(() => {
    const preventDrop = (event: globalThis.DragEvent) => event.preventDefault();
    window.addEventListener('dragover', preventDrop);
    window.addEventListener('drop', preventDrop);
    return () => {
      window.removeEventListener('dragover', preventDrop);
      window.removeEventListener('drop', preventDrop);
    };
  }, []);

  const onDragEnter = useCallback((event: DragEvent) => {
    if (event.dataTransfer.types.includes('Files')) {
      event.preventDefault();
      dragCount.current++;
      setDragOver(true);
    }
  }, []);

  const onDragLeave = useCallback(() => {
    dragCount.current = Math.max(0, dragCount.current - 1);
    if (!dragCount.current) setDragOver(false);
  }, []);

  const onDragOver = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = busy.has('import') ? 'none' : 'copy';
    },
    [busy],
  );

  const drop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      dragCount.current = 0;
      setDragOver(false);
      const files = Array.from(event.dataTransfer.files);
      if (!files.length) {
        notify('请拖入本机文件、应用快捷方式或文件夹；也可以手动添加入口。', 'error');
        return;
      }
      void action(
        'import',
        async () => {
          const paths = api.droppedPaths(files);
          if (!paths.length)
            throw new Error('无法读取拖入的本机路径，请使用“添加入口”中的浏览按钮。');
          setState(await api.importPaths(paths));
        },
        isDesktop
          ? '已导入入口，原始文件保持不变'
          : '演示导入已保存：浏览器不能获取完整本机路径，不会访问真实文件。',
      );
    },
    [action, notify, setState],
  );

  return { dragOver, onDragEnter, onDragLeave, onDragOver, drop };
}
