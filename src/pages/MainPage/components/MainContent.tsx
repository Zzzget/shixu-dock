import { AlertCircle, Loader2 } from 'lucide-react';
import type { DockItem, DockState, ItemKind, Settings, TaskInfo } from '../../../types';
import type { ItemModalState, Section, SectionInfo } from '../../../lib/app-types';
import SettingsPanel from '../../../components/SettingsPanel';
import ContentHeader from './ContentHeader';
import CollectionToolbar from './CollectionToolbar';
import CollectionGrid from './CollectionGrid';
import ContentNotes from './ContentNotes';
import EmptyState from './EmptyState';

/** 主内容区的属性：集中顶部标题、工具栏、集合与设置面板所需的全部数据与回调。 */
interface MainContentProps {
  // 完整程序坞状态；首次读取完成前为空，此时显示加载态。
  state?: DockState;
  // 任务快照表，按入口 id 索引，传给项目卡片。
  tasks: Record<string, TaskInfo>;
  // 当前选中的分区，决定渲染设置面板还是入口集合。
  section: Section;
  // 当前分区的展示文案。
  info: SectionInfo;
  // 读取状态失败的错误文案，为空表示无错误。
  loadError: string;
  // 状态读取是否处于加载态，用于禁用「重试」按钮。
  loadBusy: boolean;
  // 可选：配置降级警告文案。
  warning?: string;
  // 搜索框当前值。
  search: string;
  // 当前分区的基础入口列表，用于「全部」分组计数。
  baseItems: DockItem[];
  // 当前分区可选的分组名称列表。
  groups: string[];
  // 已归一化的搜索关键词，用于判断筛选状态。
  query: string;
  // 实际生效的分组筛选值。
  effectiveGroup: string;
  // 经筛选与排序后最终展示的入口列表。
  shownItems: DockItem[];
  // 应用库入口数量，用于空态的「去应用库打开」按钮。
  libraryCount: number;
  // 全局加载态标识集合，传给设置面板控制禁用态。
  busy: Set<string>;
  // 重新读取状态的回调。
  onRetry: () => void;
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
  /**
   * 打开新增／编辑入口弹窗的回调。
   * @param modal 弹窗状态，含被编辑入口与默认类型。
   */
  openItemModal: (modal: ItemModalState) => void;
  // 清除搜索与分组筛选的回调。
  onClearFilter: () => void;
  // 切换到应用库分区的回调。
  onGoLibrary: () => void;
  /**
   * 启动入口的回调。
   * @param item 待启动的入口。
   */
  onLaunch: (item: DockItem) => void;
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
  /**
   * 判断某个入口是否处于加载态。
   * @param item 待判断的入口。
   */
  itemBusy: (item: DockItem) => boolean;
  /**
   * 保存用户偏好设置的回调。
   * @param settings 经过界面校验的完整偏好设置对象。
   */
  saveSettings: (settings: Settings) => Promise<boolean>;
  /**
   * 打开系统路径选择对话框。
   * @param kind 选择目标类别：app、file、folder 或 editor。
   * @param browserHint 浏览器预览中未取得路径时展示的提示文案。
   */
  pickPath: (kind: 'app' | 'file' | 'folder' | 'editor', browserHint: string) => Promise<string | null>;
  // 退出整个桌面程序的回调。
  onQuit: () => void;
}

/** 主内容区：组合标题横幅、加载态、偏好设置面板或入口集合（工具栏、空态/网格、底部说明）。 */
export default function MainContent({
  state,
  tasks,
  section,
  info,
  loadError,
  loadBusy,
  warning,
  search,
  baseItems,
  groups,
  query,
  effectiveGroup,
  shownItems,
  libraryCount,
  busy,
  onRetry,
  onChangeSearch,
  onChangeGroup,
  openItemModal,
  onClearFilter,
  onGoLibrary,
  onLaunch,
  onRemove,
  onPin,
  onFolder,
  onRun,
  onStop,
  onLogs,
  itemBusy,
  saveSettings,
  pickPath,
  onQuit,
}: MainContentProps) {
  const addKind: ItemKind =
    section === 'projects' || section === 'commands' ? 'project' : 'app';
  const openAdd = () => openItemModal({ kind: addKind });
  const openAddApp = () => openItemModal({ kind: 'app' });
  const hasFilter = Boolean(query || effectiveGroup !== '全部');
  return (
    <main className="main-content">
      <ContentHeader
        info={info}
        section={section}
        loadError={loadError}
        loadBusy={loadBusy}
        warning={warning}
        onRetry={onRetry}
      />
      {!state ? (
        <div className="loading-state">
          {loadError ? <AlertCircle size={28} /> : <Loader2 size={28} className="spin" />}
          <p>{loadError ? '暂时无法读取工作空间，请重试。' : '正在打开你的工作空间…'}</p>
        </div>
      ) : section === 'settings' ? (
        <SettingsPanel
          settings={state.settings}
          configPath={state.configPath}
          onSave={saveSettings}
          busy={busy}
          pickPath={pickPath}
          onQuit={onQuit}
        />
      ) : (
        <>
          <CollectionToolbar
            info={info}
            section={section}
            search={search}
            baseItems={baseItems}
            groups={groups}
            effectiveGroup={effectiveGroup}
            shownCount={shownItems.length}
            onChangeSearch={onChangeSearch}
            onChangeGroup={onChangeGroup}
            onAdd={openAdd}
          />
          {!shownItems.length ? (
            <EmptyState
              section={section}
              hasFilter={hasFilter}
              libraryCount={libraryCount}
              onClearFilter={onClearFilter}
              onAddFirst={openAdd}
              onGoLibrary={onGoLibrary}
            />
          ) : (
            <CollectionGrid
              items={shownItems}
              section={section}
              query={query}
              effectiveGroup={effectiveGroup}
              tasks={tasks}
              itemBusy={itemBusy}
              onLaunch={onLaunch}
              onEdit={item => openItemModal({ item, kind: item.kind })}
              onRemove={onRemove}
              onPin={onPin}
              onFolder={onFolder}
              onRun={onRun}
              onStop={onStop}
              onLogs={onLogs}
              onAdd={openAddApp}
            />
          )}
          <ContentNotes showNpmNotice={section === 'projects' || section === 'commands'} />
        </>
      )}
    </main>
  );
}
