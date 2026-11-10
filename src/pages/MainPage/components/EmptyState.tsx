import { ArrowRight, Code2, LayoutGrid, Plus, Search } from 'lucide-react';
import type { Section } from '../../../lib/app-types';

/** 集合空态的属性。 */
interface EmptyStateProps {
  // 当前分区，决定空态图标与文案。
  section: Section;
  // 是否存在搜索或分组筛选，为 true 时展示「没有找到匹配的入口」。
  hasFilter: boolean;
  // 应用库入口数量，决定是否展示「去应用库打开」按钮。
  libraryCount: number;
  // 清除搜索与分组筛选的回调。
  onClearFilter: () => void;
  // 打开新增入口弹窗的回调，用于「添加第一个入口／项目」。
  onAddFirst: () => void;
  // 切换到应用库分区的回调。
  onGoLibrary: () => void;
}

/** 集合空态：区分筛选无结果与分区无入口，提供清除筛选、添加第一个入口与跳转应用库操作。 */
export default function EmptyState({
  section,
  hasFilter,
  libraryCount,
  onClearFilter,
  onAddFirst,
  onGoLibrary,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="large-empty-icon">
        {hasFilter ? (
          <Search size={31} />
        ) : section === 'projects' || section === 'commands' ? (
          <Code2 size={31} />
        ) : (
          <LayoutGrid size={31} />
        )}
      </span>
      <h2>
        {hasFilter
          ? '没有找到匹配的入口'
          : section === 'recent'
            ? '你的常用，从这里开始'
            : section === 'library'
              ? '为常用工具，留一个位置'
              : '把第一个项目，放进拾序'}
      </h2>
      <p>
        {hasFilter
          ? '换个关键词试试，或清除筛选条件。'
          : section === 'recent'
            ? '添加并打开一个应用，它就会自动出现在最近使用和悬浮入口中。'
            : section === 'library'
              ? '添加应用、文件或文件夹，也可以把它们直接拖进窗口。'
              : '选择项目目录，设置编辑器与 npm 脚本。下一次，直接开始。'}
      </p>
      {hasFilter ? (
        <button className="button secondary" onClick={onClearFilter}>
          清除筛选
        </button>
      ) : (
        <div className="empty-actions">
          <button className="button primary" onClick={onAddFirst}>
            <Plus size={16} />
            {section === 'projects' || section === 'commands'
              ? '添加第一个项目'
              : '添加第一个入口'}
          </button>
          {section === 'recent' && libraryCount > 0 && (
            <button className="button secondary" onClick={onGoLibrary}>
              去应用库打开
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
