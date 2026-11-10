import {
  ChevronRight,
  Code2,
  FolderOpen,
  Loader2,
  Pencil,
  Pin,
  Play,
  Square,
  Terminal,
  Trash2,
} from 'lucide-react';
import { isDesktop } from '../api';
import type { DockItem, TaskInfo } from '../types';
import { taskLabels } from '../constants';
import { activeTask } from '../lib/dock-utils';
import ItemIcon from './ItemIcon';

/** 项目／快捷命令卡片的属性。 */
interface ProjectCardProps {
  // 卡片对应的项目入口。
  item: DockItem;
  // 可选：该项目的任务快照，用于状态条与运行／停止按钮。
  task?: TaskInfo;
  // 该入口是否处于加载态，为 true 时禁用所有操作按钮。
  busy: boolean;
  // 用编辑器打开项目的回调。
  onLaunch: () => void;
  // 打开项目文件夹的回调。
  onFolder: () => void;
  // 运行项目 npm 脚本的回调。
  onRun: () => void;
  // 停止项目任务的回调。
  onStop: () => void;
  // 查看运行日志的回调。
  onLogs: () => void;
  // 编辑入口的回调。
  onEdit: () => void;
  // 请求移除入口的回调。
  onRemove: () => void;
  // 切换置顶状态的回调。
  onPin: () => void;
  // 是否为快捷命令分区，为 true 时隐藏编辑器信息并附加 command-card 样式类。
  commands: boolean;
}

/** 项目空间与快捷命令的卡片：展示路径、npm 脚本与任务状态，提供运行／停止及管理操作。 */
export default function ProjectCard({
  item,
  task,
  busy,
  onLaunch,
  onFolder,
  onRun,
  onStop,
  onLogs,
  onEdit,
  onRemove,
  onPin,
  commands,
}: ProjectCardProps) {
  const active = activeTask(task);
  return (
    <article className={`project-card ${commands ? 'command-card' : ''}`}>
      <div className="project-heading">
        <ItemIcon item={item} small />
        <div>
          <h3>{item.name}</h3>
          <span>{item.group || '未分组'}</span>
        </div>
        <button
          className={`icon-button ${item.pinned ? 'is-pinned' : ''}`}
          title={item.pinned ? '取消置顶' : '置顶入口'}
          aria-label={`${item.pinned ? '取消置顶' : '置顶'} ${item.name}`}
          disabled={busy}
          onClick={onPin}>
          <Pin size={15} />
        </button>
      </div>
      <p className="project-path" title={item.path}>
        <FolderOpen size={13} />
        <span>{item.path}</span>
      </p>
      <div className="project-script">
        <Terminal size={14} />
        <code>npm run {item.script || 'dev'}</code>
        <span>npm 脚本</span>
      </div>
      {!commands && (
        <p className="project-editor">
          <Code2 size={13} />
          <span title={item.editorPath}>
            {item.editorPath ? item.editorPath.split(/[\\/]/).pop() : '默认编辑器'}
          </span>
        </p>
      )}
      <div className={`task-summary status-${task?.status || 'idle'}`}>
        <span className="status-dot" />
        {task ? `${!isDesktop ? '演示 · ' : ''}${taskLabels[task.status]}` : '尚未启动'}
        {task && (
          <button className="text-button" onClick={onLogs}>
            查看日志
            <ChevronRight size={12} />
          </button>
        )}
      </div>
      {task && active && <p className="readiness-note">服务是否就绪尚未检测，请查看日志确认。</p>}
      <div className="project-actions">
        {active ? (
          <button
            className="button stop-button"
            disabled={busy || task?.status === 'stopping'}
            onClick={onStop}>
            <Square size={13} />
            停止
          </button>
        ) : (
          <button className="button primary soft" disabled={busy} onClick={onRun}>
            {busy ? <Loader2 size={14} className="spin" /> : <Play size={14} />}运行项目
          </button>
        )}
        <button className="button secondary" disabled={busy} onClick={onLaunch}>
          <Code2 size={14} />
          编辑器
        </button>
        <button
          className="icon-button"
          title="打开项目文件夹"
          aria-label={`打开 ${item.name} 文件夹`}
          disabled={busy}
          onClick={onFolder}>
          <FolderOpen size={17} />
        </button>
        <button
          className="icon-button"
          title="编辑入口"
          aria-label={`编辑 ${item.name}`}
          disabled={busy}
          onClick={onEdit}>
          <Pencil size={15} />
        </button>
        <button
          className="icon-button danger-hover"
          title="仅移除入口"
          aria-label={`移除 ${item.name} 入口`}
          disabled={busy || active}
          onClick={onRemove}>
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  );
}
