import { Trash2 } from 'lucide-react';
import type { DockItem } from '../../../types';
import ItemIcon from '../../../components/ItemIcon';
import Modal from '../../../components/Modal';

/** 移除入口二次确认弹窗的属性。 */
interface RemoveEntryDialogProps {
  // 待移除的入口，展示图标、名称与路径。
  item: DockItem;
  // 移除操作是否处于加载态，为 true 时禁用按钮并禁止关闭弹窗。
  busy: boolean;
  // 该入口是否仍有活动任务，为 true 时禁用移除并提示先停止进程。
  taskActive: boolean;
  // 关闭弹窗、保留入口的回调。
  onClose: () => void;
  /**
   * 确认仅移除入口的回调。
   * @param item 待移除的入口。
   */
  onRemove: (item: DockItem) => void;
}

/** 移除入口二次确认弹窗：强调只删除配置记录，不影响磁盘上的程序与原始文件。 */
export default function RemoveEntryDialog({
  item,
  busy,
  taskActive,
  onClose,
  onRemove,
}: RemoveEntryDialogProps) {
  return (
    <Modal title="只移除这个入口？" busy={busy} onClose={onClose}>
      <div className="remove-preview">
        <ItemIcon item={item} small />
        <div>
          <strong>{item.name}</strong>
          <p>{item.path}</p>
        </div>
      </div>
      <p className="remove-description">
        这个操作只会将它从拾序中移除，<strong>不会卸载程序，也不会删除原始文件。</strong>
      </p>
      {taskActive && <p className="danger-text">项目正在运行，请先停止进程。</p>}
      <div className="modal-footer">
        <button className="button secondary" disabled={busy} onClick={onClose}>
          保留入口
        </button>
        <button
          className="button danger"
          disabled={busy || taskActive}
          onClick={() => onRemove(item)}>
          <Trash2 size={15} />
          仅移除入口
        </button>
      </div>
    </Modal>
  );
}
