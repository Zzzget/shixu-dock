import { useEffect, useRef } from 'react';
import type { Toast } from '../lib/app-types';
import ToastNotice from './ToastNotice';

/** toast 提示容器的属性。 */
interface ToastTrayProps {
  // 当前待展示的全部提示。
  toasts: Toast[];
  // 是否处于 ?view=dock 悬浮窗口视图，决定附加的 dock-toasts 样式类。
  dockView: boolean;
  /**
   * 按 id 移除提示的回调。
   * @param id 待移除提示的唯一标识。
   */
  dismiss: (id: number) => void;
}

/** toast 提示容器：使用浏览器顶层浮层 popover，确保弹窗内的保存错误也始终可见。 */
export default function ToastTray({ toasts, dockView, dismiss }: ToastTrayProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    // 使用浏览器顶层浮层，让弹窗里的保存错误也始终可见。
    if (toasts.length) {
      if (element.matches(':popover-open')) element.hidePopover();
      element.showPopover();
    } else if (element.matches(':popover-open')) element.hidePopover();
  }, [toasts]);
  return (
    <div
      ref={ref}
      popover="manual"
      className={`toast-tray ${dockView ? 'dock-toasts' : ''}`}
      aria-label="操作提示">
      {toasts.map(toast => (
        <ToastNotice key={toast.id} toast={toast} dismiss={dismiss} />
      ))}
    </div>
  );
}
