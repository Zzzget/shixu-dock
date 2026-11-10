import { ArrowRight, ChevronRight, Terminal } from 'lucide-react';
import { isDesktop } from '../../../api';
import type { DockItem, TaskInfo } from '../../../types';
import { taskLabels } from '../../../constants';
import Modal from '../../../components/Modal';

/** 项目运行记录弹窗的属性。 */
interface TaskListDialogProps {
  // 本次会话的全部任务快照列表。
  tasks: TaskInfo[];
  // 全部入口列表，用于按任务 id 查找项目名称。
  items: DockItem[];
  // 关闭弹窗的回调。
  onClose: () => void;
  /**
   * 打开某个任务日志的回调。
   * @param id 任务对应的项目入口 id。
   */
  onOpenLog: (id: string) => void;
  // 关闭弹窗并前往项目空间的回调。
  onGoProjects: () => void;
}

/** 项目运行记录弹窗：列出本次会话任务并可跳转到日志，无任务时显示引导说明。 */
export default function TaskListDialog({
  tasks,
  items,
  onClose,
  onOpenLog,
  onGoProjects,
}: TaskListDialogProps) {
  return (
    <Modal title="项目运行记录" onClose={onClose}>
      <p className="log-disclaimer">
        {isDesktop
          ? '这里只显示本次桌面会话的任务。进程运行不代表服务就绪。'
          : '这些是浏览器模拟任务，没有真实进程或服务。'}
      </p>
      {tasks.length ? (
        <div className="task-list">
          {tasks.map(task => (
            <button
              key={task.id}
              onClick={() => {
                onClose();
                onOpenLog(task.id);
              }}>
              <Terminal size={18} />
              <span>
                <strong>
                  {items.find(item => item.id === task.id)?.name || '已移除的项目'}
                </strong>
                <small>
                  {!isDesktop ? '演示 · ' : ''}
                  {taskLabels[task.status]}
                </small>
              </span>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      ) : (
        <div className="task-empty">
          <Terminal size={28} />
          <p>还没有运行记录</p>
          <span>在项目空间运行一个 npm 脚本后，可在这里查看日志。</span>
        </div>
      )}
      <div className="modal-footer">
        <button className="button secondary" onClick={onGoProjects}>
          前往项目空间
          <ArrowRight size={14} />
        </button>
      </div>
    </Modal>
  );
}
