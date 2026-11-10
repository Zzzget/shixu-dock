import { Keyboard, Terminal } from 'lucide-react';
import { isDesktop } from '../../../api';

/** 主界面底部状态栏的属性。 */
interface StatusBarProps {
  // 当前入口总数。
  itemCount: number;
  // 仍在活动的任务数量，决定状态按钮文案。
  runningCount: number;
  // 打开项目运行记录弹窗的回调。
  onOpenTasks: () => void;
}

/** 主界面底部状态栏：入口数量、运行记录入口与全局快捷键提示。 */
export default function StatusBar({ itemCount, runningCount, onOpenTasks }: StatusBarProps) {
  return (
    <footer className="statusbar">
      <span className="status-left">
        <span className="status-dot" />
        {isDesktop ? '一切井然有序' : '演示空间 · 与本机数据隔离'}
        <span className="footer-separator">/</span>
        {itemCount} 个入口
      </span>
      <button className="status-task-button" onClick={onOpenTasks}>
        <Terminal size={12} />
        {runningCount
          ? `${runningCount} 个${isDesktop ? '' : '演示'}进程活动中`
          : '运行记录'}
      </button>
      <span className="status-shortcut">
        <Keyboard size={13} />
        <kbd>Ctrl + Alt + Space</kbd>
        <span>呼出拾序</span>
      </span>
    </footer>
  );
}
