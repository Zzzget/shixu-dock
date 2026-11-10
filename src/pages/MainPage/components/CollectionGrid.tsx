import { Plus } from 'lucide-react';
import type { DockItem, TaskInfo } from '../../../types';
import type { Section } from '../../../lib/app-types';
import AppCard from '../../../components/AppCard';
import ProjectCard from '../../../components/ProjectCard';

/** 入口集合网格的属性。 */
interface CollectionGridProps {
  // 当前展示的入口列表。
  items: DockItem[];
  // 当前分区，决定渲染项目卡片还是应用卡片。
  section: Section;
  // 已归一化的搜索关键词，用于判断是否显示「添加新入口」卡片。
  query: string;
  // 实际生效的分组筛选值，用于判断是否显示「添加新入口」卡片。
  effectiveGroup: string;
  // 任务快照表，按入口 id 索引，传给项目卡片。
  tasks: Record<string, TaskInfo>;
  /**
   * 判断某个入口是否处于加载态。
   * @param item 待判断的入口。
   */
  itemBusy: (item: DockItem) => boolean;
  /**
   * 启动入口的回调。
   * @param item 待启动的入口。
   */
  onLaunch: (item: DockItem) => void;
  /**
   * 编辑入口的回调。
   * @param item 待编辑的入口。
   */
  onEdit: (item: DockItem) => void;
  /**
   * 请求移除入口的回调。
   * @param item 待移除的入口。
   */
  onRemove: (item: DockItem) => void;
  /**
   * 切换置顶状态的回调。
   * @param item 待切换的入口。
   */
  onPin: (item: DockItem) => void;
  /**
   * 打开项目文件夹的回调。
   * @param item 对应的项目入口。
   */
  onFolder: (item: DockItem) => void;
  /**
   * 运行项目 npm 脚本的回调。
   * @param item 对应的项目入口。
   */
  onRun: (item: DockItem) => void;
  /**
   * 停止项目任务的回调。
   * @param item 对应的项目入口。
   */
  onStop: (item: DockItem) => void;
  /**
   * 查看运行日志的回调。
   * @param item 对应的项目入口。
   */
  onLogs: (item: DockItem) => void;
  // 打开新增入口弹窗的回调，由「添加新入口」卡片触发。
  onAdd: () => void;
}

/** 入口集合网格：项目分区渲染项目卡片，其余分区渲染应用卡片，应用库额外显示添加卡片。 */
export default function CollectionGrid({
  items,
  section,
  query,
  effectiveGroup,
  tasks,
  itemBusy,
  onLaunch,
  onEdit,
  onRemove,
  onPin,
  onFolder,
  onRun,
  onStop,
  onLogs,
  onAdd,
}: CollectionGridProps) {
  if (section === 'projects' || section === 'commands') {
    return (
      <div className="project-grid">
        {items.map(item => (
          <ProjectCard
            key={item.id}
            item={item}
            task={tasks[item.id]}
            busy={itemBusy(item)}
            commands={section === 'commands'}
            onLaunch={() => onLaunch(item)}
            onFolder={() => onFolder(item)}
            onRun={() => onRun(item)}
            onStop={() => onStop(item)}
            onLogs={() => onLogs(item)}
            onEdit={() => onEdit(item)}
            onRemove={() => onRemove(item)}
            onPin={() => onPin(item)}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="app-grid">
      {items.map(item => (
        <AppCard
          key={item.id}
          item={item}
          busy={itemBusy(item)}
          onLaunch={() => onLaunch(item)}
          onEdit={() => onEdit(item)}
          onRemove={() => onRemove(item)}
          onPin={() => onPin(item)}
        />
      ))}
      {section === 'library' && !query && effectiveGroup === '全部' && (
        <button className="add-card" onClick={onAdd}>
          <span>
            <Plus size={23} />
          </span>
          <strong>添加新入口</strong>
          <small>让常用更近一点</small>
        </button>
      )}
    </div>
  );
}
