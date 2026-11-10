import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

/** 通用模态弹窗的属性。 */
interface ModalProps {
  // 弹窗标题，显示在 eyebrow 下方的 h2 中。
  title: string;
  // 弹窗主体内容，由调用方组合表单或说明文字。
  children: ReactNode;
  // 请求关闭弹窗的回调，由 Esc、点击遮罩或右上角关闭按钮触发。
  onClose: () => void;
  // 是否处于忙碌态，为 true 时禁止通过 Esc 或遮罩关闭弹窗。
  busy?: boolean;
}

/** 通用模态弹窗：基于原生 dialog 的 showModal，统一标题栏与关闭交互。 */
export default function Modal({ title, children, onClose, busy = false }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onCancel={event => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={event => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}>
      <div className="modal-content">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">整理你的工作空间</span>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button className="icon-button" aria-label="关闭弹窗" disabled={busy} onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
