import type { DragEvent } from 'react';
import type { DockItem, DockState, ItemDraft, ItemKind, Settings, TaskInfo } from '../types';

/** 主界面左侧导航分区，决定主内容区展示哪一类入口列表。 */
export type Section =
  // 最近从程序坞启动的应用，最多展示 10 个。
  | 'recent'
  // 应用库：全部应用、文件与文件夹入口，支持分组筛选。
  | 'library'
  // 项目空间：可打开编辑器并运行 npm 脚本的项目入口。
  | 'projects'
  // 快捷命令：复用项目入口，集中展示可一键启动的 npm 脚本。
  | 'commands'
  // 偏好设置：悬停延迟、默认编辑器、开机启动等配置。
  | 'settings';

/** 提示条的语义色调，只影响图标与配色，不改变业务逻辑。 */
export type Tone =
  // 操作成功完成。
  | 'success'
  // 操作失败或校验不通过，需要用户处理。
  | 'error'
  // 中性提示，用于演示说明或状态告知。
  | 'info';

/**
 * 统一提示函数，把异步操作结果以 toast 形式展示给用户。
 * @param message 提示文案，必填。
 * @param tone 可选的提示色调，缺省按 info 处理。
 */
export type Notify = (message: string, tone?: Tone) => void;

/**
 * 包装一次异步操作的通用执行器：负责加载态、错误提示与成功提示。
 * @param key 操作标识，用于区分并发操作的加载状态。
 * @param operation 实际执行的异步操作，其返回值不影响提示结果。
 * @param success 可选：操作成功后显示的提示文案。
 * @returns 操作是否成功，失败时返回 false 并已展示错误提示。
 */
export type Action = (
  key: string,
  operation: () => Promise<unknown>,
  success?: string,
) => Promise<boolean>;

/** 一条待显示的 toast 提示，界面按 id 维护并按序移除。 */
export interface Toast {
  // 递增的唯一标识，用于定位与移除这条提示。
  id: number;
  // 展示给用户的中文提示文案。
  message: string;
  // 提示色调，决定图标与配色。
  tone: Tone;
}

/** 新增／编辑入口弹窗的状态，记录被编辑入口与新建时的默认类型。 */
export interface ItemModalState {
  // 可选：被编辑的入口；缺省表示新建入口。
  item?: DockItem;
  // 弹窗默认选中的入口类型，新建入口时使用。
  kind: ItemKind;
}

/** 分区的展示文案，包含导航标签、页面主标题与副标题描述。 */
export interface SectionInfo {
  // 左侧导航与面包屑使用的短标签。
  label: string;
  // 页面顶部的大标题。
  title: string;
  // 页面标题下方的描述文案。
  description: string;
}

/** 程序坞控制器：集中暴露全部状态、派生数据与事件回调，供页面组合渲染。 */
export interface DockController {
  // 完整程序坞状态；首次读取完成前为空。
  state?: DockState;
  // 任务快照表，按入口 id 索引，来自订阅与初次加载。
  tasks: Record<string, TaskInfo>;
  // 当前选中的主界面分区。
  section: Section;
  // 搜索框当前输入的关键词。
  search: string;
  // 当前选择的分组筛选值。
  group: string;
  // 待显示的 toast 提示列表。
  toasts: Toast[];
  // 处于加载中的操作标识集合，用于禁用按钮与显示进度。
  busy: Set<string>;
  // 读取状态失败时的错误文案，为空表示无错误。
  loadError: string;
  // 新增／编辑入口弹窗状态；为空表示不显示。
  itemModal?: ItemModalState;
  // 待二次确认移除的入口；为空表示不显示移除弹窗。
  removeTarget?: DockItem;
  // 当前查看日志的项目入口 id；为空表示不显示日志弹窗。
  logId?: string;
  // 浏览器预览中是否展开悬浮入口演示区域。
  previewOpen: boolean;
  // 浏览器预览中是否收起主界面、只显示桌面壳。
  previewMainHidden: boolean;
  // 是否显示项目运行记录弹窗。
  allTasksOpen: boolean;
  // 是否有文件正拖拽经过主窗口，用于显示导入遮罩。
  dragOver: boolean;
  // 当前分区的展示文案。
  info: SectionInfo;
  // 最近使用的应用列表，最多 10 个。
  apps: DockItem[];
  // 应用、文件与文件夹入口列表（不含项目）。
  library: DockItem[];
  // 当前分区参与筛选的基础入口列表。
  baseItems: DockItem[];
  // 当前基础入口列表中的分组名称，按中文排序。
  groups: string[];
  // 全部入口中的分组名称，供编辑表单的 datalist 使用。
  allGroups: string[];
  // 已归一化的搜索关键词（去空白、转小写），用于判断筛选状态。
  query: string;
  // 实际生效的分组筛选值，失效分组会回退为「全部」。
  effectiveGroup: string;
  // 经过搜索、分组与排序后最终展示的入口列表。
  shownItems: DockItem[];
  // 仍在活动（启动中／运行中／停止中）的任务列表。
  runningTasks: TaskInfo[];
  // 统一提示函数，展示成功、错误或中性 toast。
  notify: Notify;
  /**
   * 按 id 移除一条 toast 提示。
   * @param id 待移除提示的唯一标识。
   */
  dismiss: (id: number) => void;
  // 包装异步操作的通用执行器，负责加载态与错误提示。
  action: Action;
  // 重新读取程序坞状态与任务列表的回调，供错误重试使用。
  load: () => Promise<void>;
  /**
   * 切换主界面分区，同时清空搜索与分组筛选。
   * @param next 目标分区。
   */
  changeSection: (next: Section) => void;
  /**
   * 修改搜索关键词。
   * @param value 新的搜索关键词。
   */
  changeSearch: (value: string) => void;
  /**
   * 修改分组筛选。
   * @param value 目标分组名称或「全部」。
   */
  changeGroup: (value: string) => void;
  /**
   * 打开新增／编辑入口弹窗。
   * @param modal 弹窗状态，含被编辑入口与默认类型。
   */
  openItemModal: (modal: ItemModalState) => void;
  // 关闭新增／编辑入口弹窗。
  closeItemModal: () => void;
  /**
   * 打开移除入口的二次确认弹窗。
   * @param item 待移除的入口。
   */
  openRemoveDialog: (item: DockItem) => void;
  // 关闭移除确认弹窗、保留入口。
  closeRemoveDialog: () => void;
  /**
   * 打开某项目的运行日志弹窗。
   * @param id 项目入口 id。
   */
  openLog: (id: string) => void;
  // 关闭运行日志弹窗。
  closeLog: () => void;
  // 打开项目运行记录弹窗。
  openTasks: () => void;
  // 关闭项目运行记录弹窗。
  closeTasks: () => void;
  // 切换浏览器预览中悬浮入口演示区域的展开／收起。
  togglePreview: () => void;
  // 从悬浮入口或收起态回到主界面的回调。
  openPreviewMain: () => void;
  /**
   * 最小化或收起主界面窗口。
   * @param kind minimize 表示最小化，hide 表示收起到悬浮入口。
   */
  mainWindowAction: (kind: 'minimize' | 'hide') => void;
  /**
   * 启动或打开一个入口。
   * @param item 待启动的入口。
   */
  launchItem: (item: DockItem) => void;
  /**
   * 切换入口的置顶状态。
   * @param item 待切换的入口。
   */
  pinItem: (item: DockItem) => void;
  /**
   * 运行项目入口配置好的 npm 脚本。
   * @param item 对应的项目入口。
   */
  runProject: (item: DockItem) => void;
  /**
   * 在文件资源管理器中打开项目文件夹。
   * @param item 对应的项目入口。
   */
  openFolderItem: (item: DockItem) => void;
  /**
   * 停止项目任务及其子进程。
   * @param item 对应的项目入口。
   */
  stopProjectItem: (item: DockItem) => void;
  /**
   * 判断某个入口是否处于加载态。
   * @param item 待判断的入口。
   */
  itemBusy: (item: DockItem) => boolean;
  /**
   * 保存新增或编辑后的入口草稿。
   * @param draft 待保存的入口草稿。
   */
  saveItem: (draft: ItemDraft) => Promise<boolean>;
  /**
   * 保存用户偏好设置。
   * @param settings 经过界面校验的完整偏好设置对象。
   */
  saveSettings: (settings: Settings) => Promise<boolean>;
  /**
   * 打开系统路径选择对话框，浏览器预览下给出提示且不访问本机文件。
   * @param kind 选择目标类别：app、file、folder 或 editor。
   * @param browserHint 浏览器预览中未取得路径时展示的提示文案。
   */
  pickPath: (kind: 'app' | 'file' | 'folder' | 'editor', browserHint: string) => Promise<string | null>;
  // 退出整个桌面程序的回调，仅真实 Electron 环境有效。
  onQuit: () => void;
  /**
   * 确认仅移除入口（不删除原文件）。
   * @param item 待移除的入口。
   */
  confirmRemove: (item: DockItem) => void;
  /**
   * 处理拖放到主窗口的文件导入。
   * @param event React 拖放事件，携带拖入的文件列表。
   */
  drop: (event: DragEvent) => void;
  /**
   * 文件拖拽进入主窗口时累加计数并显示遮罩。
   * @param event React 拖拽进入事件。
   */
  onDragEnter: (event: DragEvent) => void;
  // 文件拖拽离开主窗口时递减计数并按需隐藏遮罩。
  onDragLeave: () => void;
  /**
   * 文件拖拽悬停时阻止默认行为并设置放置效果。
   * @param event React 拖拽悬停事件。
   */
  onDragOver: (event: DragEvent) => void;
}
