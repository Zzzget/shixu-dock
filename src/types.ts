/**
 * 入口类型：决定程序坞如何启动这一项、编辑表单显示哪些字段，以及是否计入「最近使用」。
 * 仅允许以下四种取值，配置校验会拒绝其他字符串。
 */
export type ItemKind =
  // 应用程序或 .lnk 快捷方式：可启动，启动成功后写入最近使用记录。
  | 'app'
  // 单个文件：按系统默认关联打开，也可由用户指定的编辑器打开。
  | 'file'
  // 文件夹：用文件资源管理器或指定程序打开该目录。
  | 'folder'
  // 项目目录：可用编辑器打开，并在该目录运行 npm 脚本，不支持任意 Shell 命令。
  | 'project';

/**
 * 项目运行任务的生命周期状态。
 * 「running」只表示系统进程仍在运行，不代表开发服务已完成启动或可以访问。
 */
export type TaskStatus =
  // 已发起启动，正在准备进程与工作目录，尚未拿到 pid。
  | 'starting'
  // 进程正在运行，日志持续输出；服务是否就绪需由用户或日志判断。
  | 'running'
  // 已发出停止信号，正在结束进程及其子进程。
  | 'stopping'
  // 用户主动停止，任务已结束。
  | 'stopped'
  // 进程自行退出，需查看 exitCode 与日志确认原因。
  | 'exited'
  // 启动或执行过程中出错，日志中包含错误信息。
  | 'error';

/**
 * 程序坞中的一个入口，是本地配置里持久化保存的最小单位。
 * 只记录路径与启动信息，不持有原始文件，也不会移动或删除桌面上的快捷方式。
 */
export interface DockItem {
  // 稳定唯一标识，由程序坞生成；编辑时保持不变，用于最近使用、任务与移除操作。
  id: string;
  // 入口类型，见 ItemKind；决定启动方式与表单校验规则。
  kind: ItemKind;
  // 界面上显示的名称，可由用户自定义，不要求与目标文件名一致。
  name: string;
  // 目标绝对路径：应用可执行文件、文件、文件夹或项目根目录。
  path: string;
  // 分组名称，用于应用库筛选；为空时保存为「未分组」。
  group: string;
  // 可选：项目专用编辑器可执行文件路径；留空时使用偏好设置中的默认编辑器。
  editorPath?: string;
  // 可选：项目专用 npm 脚本名（如 dev）；只接受脚本名，不接受命令与参数。
  script?: string;
  // 是否固定在最近使用列表靠前位置；仅影响排序，不影响启动行为。
  pinned: boolean;
  // 可选：应用图标的 data URL；没有图标时界面使用统一占位图标。
  icon?: string;
  // 入口创建时间（Unix 毫秒），由程序坞写入，不由用户填写。
  createdAt: number;
  // 可选：最近一次从程序坞启动的时间（Unix 毫秒），仅 kind 为 app 时更新。
  lastOpenedAt?: number;
}

/**
 * 新增或编辑入口时由界面提交的草稿数据。
 * 复用 DockItem 的用户可编辑字段；存在 id 表示编辑，缺省表示新建。
 */
export type ItemDraft = Omit<DockItem, 'id' | 'createdAt' | 'lastOpenedAt' | 'icon'> & {
  // 可选：被编辑入口的 id；新建入口时不传。
  id?: string;
};

/** 用户偏好设置，保存在本地配置中，修改后立即影响悬浮窗口与主界面。 */
export interface Settings {
  // 是否随 Windows 登录启动，由 Electron 的登录项设置实现。
  launchAtLogin: boolean;
  // 鼠标悬停到展开最近应用面板的延迟（毫秒），允许 0–2000。
  hoverDelay: number;
  // 鼠标移出后收起面板的延迟（毫秒），允许 100–3000，用于避免移动途中误收起。
  hideDelay: number;
  // 项目默认编辑器的可执行文件路径；留空时按系统关联或 VS Code CLI 处理。
  defaultEditorPath: string;
}

/** 程序坞的完整持久化状态，主进程读取后广播给所有渲染窗口。 */
export interface DockState {
  // 全部入口（应用、文件、文件夹、项目），按创建顺序保存。
  items: DockItem[];
  // 最近启动的应用 id，越靠前越新；会去除重复与失效 id 并限制长度。
  recentIds: string[];
  // 当前用户偏好设置。
  settings: Settings;
  // 本地配置文件在本机上的绝对路径，用于在偏好设置中展示与排查。
  configPath: string;
  // 可选：配置读取失败时的降级提示（例如从备份恢复），界面需显示为警告。
  warning?: string;
}

/** 单个项目运行任务的状态快照，用于日志面板与启动／停止按钮。 */
export interface TaskInfo {
  // 任务对应的项目入口 id；同一项目同时只允许存在一个任务。
  id: string;
  // 任务生命周期状态，取值见 TaskStatus。
  status: TaskStatus;
  // 标准输出与错误输出合并后的日志行，界面按序显示。
  logs: string[];
  // 可选：启动成功的系统进程 pid；未成功启动时为空。
  pid?: number;
  // 可选：进程退出码；尚未退出时为 null。
  exitCode?: number | null;
}

/**
 * 渲染进程可用的桌面能力接口，由 preload 通过 contextBridge 暴露。
 * 真实环境由 Electron 主进程实现，浏览器预览由 api.ts 的演示实现替代，两者方法签名一致。
 */
export interface DockAPI {
  // 是否为真实 Electron 环境；为 false 时界面显示浏览器交互预览提示。
  isDesktop: boolean;
  /** 读取完整状态，返回配置中的全部入口与偏好设置。 */
  getState(): Promise<DockState>;
  /**
   * 新增或更新一个入口，返回更新后的完整状态。
   * @param item 入口草稿；含 id 时更新已有入口，否则新建。
   */
  saveItem(item: ItemDraft): Promise<DockState>;
  /**
   * 从程序坞移除一个入口，仅删除配置记录，不影响磁盘上的原文件。
   * @param id 待移除入口的唯一标识。
   */
  removeItem(id: string): Promise<DockState>;
  /**
   * 打开系统路径选择对话框；浏览器预览中始终返回 null。
   * @param kind 选择目标类别：app 可执行文件、file 文件、folder 目录、editor 编辑器。
   */
  pickPath(kind: 'app' | 'file' | 'folder' | 'editor'): Promise<string | null>;
  /**
   * 批量导入路径并去重，返回更新后的完整状态。
   * @param paths 待导入的本地绝对路径数组。
   */
  importPaths(paths: string[]): Promise<DockState>;
  /**
   * 从拖放事件的文件对象中提取本地路径，供导入流程使用。
   * @param files 拖放到界面的 File 列表；浏览器预览会返回演示路径。
   */
  droppedPaths(files: File[]): string[];
  /**
   * 启动应用入口；成功后记录最近使用，项目入口请改用 runProject。
   * @param id 待启动入口的唯一标识。
   */
  launch(id: string): Promise<void>;
  /**
   * 在文件资源管理器中打开入口所在目录或目标文件夹。
   * @param id 入口的唯一标识。
   */
  openFolder(id: string): Promise<void>;
  /**
   * 在项目目录运行配置好的 npm 脚本，需先通过原生确认弹窗。
   * @param id 项目入口的唯一标识。
   */
  runProject(id: string): Promise<void>;
  /**
   * 停止项目任务及其子进程，不按进程名结束其他程序。
   * @param id 项目入口的唯一标识。
   */
  stopProject(id: string): Promise<void>;
  /** 读取当前全部任务快照，用于界面恢复运行状态。 */
  getTasks(): Promise<TaskInfo[]>;
  /**
   * 保存用户偏好设置，返回更新后的完整状态。
   * @param settings 经过界面校验的完整偏好设置对象。
   */
  saveSettings(settings: Settings): Promise<DockState>;
  /**
   * 切换悬浮窗口的展开／收起尺寸与鼠标穿透区域。
   * @param expanded true 展开最近应用面板，false 收起为胶囊按钮。
   */
  setDockExpanded(expanded: boolean): Promise<void>;
  /** 显示并聚焦完整主界面窗口。 */
  showMain(): Promise<void>;
  /** 隐藏主界面窗口，保留悬浮入口与托盘。 */
  hideMain(): Promise<void>;
  /** 最小化主界面窗口。 */
  minimizeMain(): Promise<void>;
  /** 退出整个桌面程序，结束所有由本程序启动的任务。 */
  quit(): Promise<void>;
  /**
   * 订阅状态变更，返回取消订阅函数。
   * @param callback 收到最新完整状态时调用。
   */
  onState(callback: (state: DockState) => void): () => void;
  /**
   * 订阅任务状态与日志变更，返回取消订阅函数。
   * @param callback 收到某个任务的最新快照时调用。
   */
  onTask(callback: (task: TaskInfo) => void): () => void;
  /**
   * 订阅悬浮窗口重置事件（例如窗口重新定位），返回取消订阅函数。
   * @param callback 需要收起面板并清除悬停计时器时调用。
   */
  onDockReset(callback: () => void): () => void;
}

declare global {
  /** 浏览器全局对象扩展，用于挂载 preload 暴露的桌面能力。 */
  interface Window {
    // 可选：真实 Electron 环境下由 preload 注入；浏览器预览中不存在，改用 api.ts 的演示实现。
    dock?: DockAPI;
  }
}
