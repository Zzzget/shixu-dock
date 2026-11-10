import { Plus, Search, X } from 'lucide-react';
import type { DockItem } from '../../../types';
import type { Section, SectionInfo } from '../../../lib/app-types';

/** 内容工具栏的属性：搜索框、添加按钮、分组筛选与集合标题。 */
interface CollectionToolbarProps {
  // 当前分区的展示文案，用于搜索框 aria-label。
  info: SectionInfo;
  // 当前分区，决定搜索占位文案与「添加」按钮文案。
  section: Section;
  // 搜索框当前值。
  search: string;
  // 当前分区的基础入口列表，用于「全部」分组计数。
  baseItems: DockItem[];
  // 当前分区可选的分组名称列表。
  groups: string[];
  // 实际生效的分组筛选值，用于高亮分组按钮。
  effectiveGroup: string;
  // 当前展示的入口数量，显示在集合标题右侧的两位数字。
  shownCount: number;
  /**
   * 修改搜索关键词的回调。
   * @param value 新的搜索关键词。
   */
  onChangeSearch: (value: string) => void;
  /**
   * 修改分组筛选的回调。
   * @param value 目标分组名称或「全部」。
   */
  onChangeGroup: (value: string) => void;
  // 打开新增入口弹窗的回调。
  onAdd: () => void;
}

/** 内容工具栏：搜索框、添加按钮、分组筛选按钮组、排序说明与集合标题。 */
export default function CollectionToolbar({
  info,
  section,
  search,
  baseItems,
  groups,
  effectiveGroup,
  shownCount,
  onChangeSearch,
  onChangeGroup,
  onAdd,
}: CollectionToolbarProps) {
  return (
    <>
      <div className="content-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            type="search"
            aria-label={`搜索${info.label}名称、路径或分组`}
            placeholder={
              section === 'projects' || section === 'commands'
                ? '搜索项目、路径或 npm 脚本…'
                : '搜索应用、文件或分组…'
            }
            value={search}
            onChange={event => onChangeSearch(event.target.value)}
          />
          {search && (
            <button
              className="icon-button"
              aria-label="清空搜索"
              onClick={() => onChangeSearch('')}>
              <X size={13} />
            </button>
          )}
        </label>
        <button className="button primary add-button" onClick={onAdd}>
          <Plus size={17} />
          {section === 'projects' || section === 'commands' ? '添加项目' : '添加入口'}
        </button>
      </div>
      <div className="group-toolbar">
        <div className="group-filters" aria-label="分组筛选">
          <button
            className={effectiveGroup === '全部' ? 'active' : ''}
            aria-pressed={effectiveGroup === '全部'}
            onClick={() => onChangeGroup('全部')}>
            全部<span>{baseItems.length}</span>
          </button>
          {groups.map(name => (
            <button
              key={name}
              className={effectiveGroup === name ? 'active' : ''}
              aria-pressed={effectiveGroup === name}
              onClick={() => onChangeGroup(name)}>
              {name}
            </button>
          ))}
        </div>
        <span className="sort-label">{section === 'recent' ? '按最近打开' : '置顶优先'}</span>
      </div>
      <div className="collection-heading">
        <h2>
          {section === 'recent'
            ? '最近打开'
            : section === 'library'
              ? '所有入口'
              : section === 'commands'
                ? '项目脚本'
                : '我的项目'}
          <span>{shownCount.toString().padStart(2, '0')}</span>
        </h2>
        <span>
          {section === 'recent'
            ? '最近 10 个应用，随用随更新'
            : section === 'library'
              ? '只整理入口，不移动原文件'
              : '为下一次心流，做好准备'}
        </span>
      </div>
    </>
  );
}
