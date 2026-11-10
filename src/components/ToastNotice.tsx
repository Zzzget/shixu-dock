import { useEffect } from 'react';
import { AlertCircle, Check, Monitor, X } from 'lucide-react';
import type { Toast } from '../lib/app-types';

/** 单条 toast 提示的属性。 */
interface ToastNoticeProps {
  // 待展示的提示数据，包含文案与色调。
  toast: Toast;
  /**
   * 按 id 移除提示的回调。
   * @param id 待移除提示的唯一标识。
   */
  dismiss: (id: number) => void;
}

/** 单条 toast 提示：按色调显示图标，错误提示停留更久，支持手动关闭与自动消失。 */
export default function ToastNotice({ toast, dismiss }: ToastNoticeProps) {
  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), toast.tone === 'error' ? 12000 : 6500);
    return () => clearTimeout(timer);
  }, [toast.id, toast.tone, dismiss]);
  return (
    <div className={`toast toast-${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'}>
      {toast.tone === 'error' ? (
        <AlertCircle size={17} />
      ) : toast.tone === 'success' ? (
        <Check size={17} />
      ) : (
        <Monitor size={17} />
      )}
      <span>{toast.message}</span>
      <button className="icon-button" aria-label="关闭提示" onClick={() => dismiss(toast.id)}>
        <X size={14} />
      </button>
    </div>
  );
}
