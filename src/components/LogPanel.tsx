import { isDesktop } from '../api';
import type { DockItem, TaskInfo } from '../types';
import { taskLabels } from '../constants';
import Modal from './Modal';

/** 项目运行日志弹窗的属性。 */
interface LogPanelProps {
  // 可选：任务快照，提供状态、pid、退出码与日志行。
  task?: TaskInfo;
  // 可选：对应的项目入口，用于弹窗标题显示名称。
  item?: DockItem;
  // 关闭日志弹窗的回调。
  onClose: () => void;
}

/** 项目运行日志弹窗：展示任务状态、进程信息与按序合并的日志输出。 */
export default function LogPanel({ task, item, onClose }: LogPanelProps) {
  return (
    <Modal title={`${item?.name || '项目'} · 运行日志`} onClose={onClose}>
      <div className="log-meta">
        <span className={`task-summary status-${task?.status || 'idle'}`}>
          <span className="status-dot" />
          {task ? taskLabels[task.status] : '暂无任务'}
        </span>
        {task?.pid && <code>PID {task.pid}</code>}
        {task?.exitCode != null && <code>退出码 {task.exitCode}</code>}
      </div>
      <p className="log-disclaimer">
        {isDesktop
          ? '进程运行不等于服务就绪；请根据下方日志确认地址与启动结果。'
          : '以下是演示状态与模拟日志，没有运行任何真实进程或服务。'}
      </p>
      <pre className="log-output" tabIndex={0} aria-label="项目运行日志">
        {task?.logs.length ? task.logs.join('\n') : '暂无日志。运行项目后，日志会显示在这里。'}
      </pre>
      <div className="modal-footer">
        <button className="button secondary" onClick={onClose}>
          关闭日志
        </button>
      </div>
    </Modal>
  );
}
