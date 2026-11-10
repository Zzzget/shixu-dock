import type {
  DockAPI,
  DockItem,
  DockState,
  ItemDraft,
  ItemKind,
  Settings,
  TaskInfo,
} from './types';

export const DEMO_STORAGE_KEY = 'shixu.browser-interactive-preview.v1';
export const isDesktop = Boolean(window.dock);

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const createId = () =>
  `demo-${Array.from(crypto.getRandomValues(new Uint8Array(16)), value => value.toString(16).padStart(2, '0')).join('')}`;
const stateListeners = new Set<(state: DockState) => void>();
const taskListeners = new Set<(task: TaskInfo) => void>();
const demoTasks = new Map<string, TaskInfo>();
const demoTimers = new Map<string, ReturnType<typeof setTimeout>>();
let demoState: DockState | undefined;

function seedState(): DockState {
  const now = Date.now();
  const examples: [string, string, string][] = [
    ['Visual Studio Code', '开发工具', 'C:/示例应用/Code.exe'],
    ['Figma', '设计创作', 'C:/示例应用/Figma.exe'],
    ['Notion', '效率工具', 'C:/示例应用/Notion.exe'],
    ['Google Chrome', '日常应用', 'C:/示例应用/chrome.exe'],
    ['微信', '日常应用', 'C:/示例应用/WeChat.exe'],
    ['Windows Terminal', '开发工具', 'C:/示例应用/WindowsTerminal.exe'],
    ['Obsidian', '效率工具', 'C:/示例应用/Obsidian.exe'],
    ['Spotify', '日常应用', 'C:/示例应用/Spotify.exe'],
    ['文件资源管理器', '效率工具', 'C:/示例应用/explorer.exe'],
    ['计算器', '效率工具', 'C:/示例应用/calc.exe'],
  ];
  const apps: DockItem[] = examples.map(([name, group, path], index) => ({
    id: `demo-app-${index + 1}`,
    name,
    group,
    path,
    kind: 'app',
    pinned: index < 3,
    createdAt: now - index * 60000,
    lastOpenedAt: now - index * 120000,
  }));
  return {
    items: [
      ...apps,
      {
        id: 'demo-project-1',
        kind: 'project',
        name: '拾序 · 个人主页',
        path: 'D:/示例项目/personal-space',
        group: '个人项目',
        script: 'dev',
        pinned: true,
        createdAt: now,
      },
      {
        id: 'demo-project-2',
        kind: 'project',
        name: '灵感收集站',
        path: 'D:/示例项目/inspiration-board',
        group: '设计实验',
        script: 'dev',
        pinned: false,
        createdAt: now,
      },
    ],
    recentIds: apps.map(item => item.id),
    settings: { defaultEditorPath: '', hoverDelay: 180, hideDelay: 450, launchAtLogin: false },
    configPath: `浏览器演示专用 localStorage：${DEMO_STORAGE_KEY}`,
  };
}

function isStoredState(value: unknown): value is DockState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DockState>;
  return (
    Array.isArray(candidate.items) &&
    candidate.items.every(
      item =>
        item &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.path === 'string' &&
        typeof item.group === 'string' &&
        ['app', 'file', 'folder', 'project'].includes(item.kind) &&
        typeof item.pinned === 'boolean' &&
        typeof item.createdAt === 'number' &&
        (item.editorPath === undefined || typeof item.editorPath === 'string') &&
        (item.script === undefined || typeof item.script === 'string'),
    ) &&
    Array.isArray(candidate.recentIds) &&
    candidate.recentIds.every(id => typeof id === 'string') &&
    Boolean(
      candidate.settings &&
      typeof candidate.settings.defaultEditorPath === 'string' &&
      typeof candidate.settings.launchAtLogin === 'boolean' &&
      Number.isFinite(candidate.settings.hoverDelay) &&
      Number.isFinite(candidate.settings.hideDelay),
    )
  );
}

function readDemo(): DockState {
  if (demoState) return demoState;
  const raw = localStorage.getItem(DEMO_STORAGE_KEY);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isStoredState(parsed)) throw new Error('演示缓存格式无效');
      demoState = { ...parsed, configPath: `浏览器演示专用 localStorage：${DEMO_STORAGE_KEY}` };
    } catch (error) {
      demoState = seedState();
      demoState.warning = `浏览器演示缓存无法读取，已改用示例数据（未覆盖原缓存）：${error instanceof Error ? error.message : String(error)}`;
    }
  } else {
    demoState = seedState();
  }
  return demoState;
}

function persist(next: DockState): DockState {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next));
  demoState = next;
  stateListeners.forEach(listener => listener(clone(next)));
  return clone(next);
}

function requireItem(id: string): DockItem {
  const item = readDemo().items.find(entry => entry.id === id);
  if (!item) throw new Error('找不到这个入口，请刷新后重试');
  return item;
}

function touchItem(id: string): void {
  const current = readDemo();
  const item = requireItem(id);
  persist({
    ...current,
    items: current.items.map(entry =>
      entry.id === id ? { ...entry, lastOpenedAt: Date.now() } : entry,
    ),
    recentIds:
      item.kind === 'app'
        ? [id, ...current.recentIds.filter(entry => entry !== id)].slice(0, 50)
        : current.recentIds,
  });
}

function publishTask(task: TaskInfo): void {
  demoTasks.set(task.id, task);
  taskListeners.forEach(listener => listener(clone(task)));
}

export const validScript = (script: string): boolean =>
  /^[A-Za-z0-9][A-Za-z0-9:_-]{0,79}$/.test(script);

function validateDraft(item: ItemDraft): void {
  if (!item.name.trim() || !item.path.trim()) throw new Error('请填写名称和路径');
  if (item.kind === 'project' && !validScript(item.script || 'dev')) {
    throw new Error('请输入 npm 脚本名，不支持空格或任意 Shell 命令');
  }
}

const browserAPI: DockAPI = {
  isDesktop: false,
  async getState() {
    return clone(readDemo());
  },
  async saveItem(draft) {
    validateDraft(draft);
    const current = readDemo();
    const previous = draft.id ? requireItem(draft.id) : undefined;
    const saved: DockItem = {
      ...previous,
      ...draft,
      id: previous?.id ?? createId(),
      createdAt: previous?.createdAt ?? Date.now(),
      name: draft.name.trim(),
      path: draft.path.trim(),
      group: draft.group.trim() || '未分组',
      script: draft.kind === 'project' ? draft.script?.trim() || 'dev' : undefined,
    };
    return persist({
      ...current,
      items: previous
        ? current.items.map(item => (item.id === saved.id ? saved : item))
        : [...current.items, saved],
    });
  },
  async removeItem(id) {
    requireItem(id);
    const task = demoTasks.get(id);
    if (task && ['starting', 'running', 'stopping'].includes(task.status))
      throw new Error('请先停止项目，再移除入口');
    const current = readDemo();
    return persist({
      ...current,
      items: current.items.filter(item => item.id !== id),
      recentIds: current.recentIds.filter(entry => entry !== id),
    });
  },
  async pickPath() {
    return null;
  },
  droppedPaths(files) {
    return files.map(file => `浏览器演示导入/${file.name}`);
  },
  async importPaths(paths) {
    if (!paths.length) throw new Error('未能获取文件路径，请用“添加入口”手动填写');
    const current = readDemo();
    const additions: DockItem[] = [...new Set(paths)]
      .filter(path => !current.items.some(item => item.path === path))
      .map(path => {
        const name = path.split(/[\\/]/).pop() || path;
        const kind: ItemKind = /\.(exe|lnk)$/i.test(name) ? 'app' : 'file';
        return {
          id: createId(),
          kind,
          name: name.replace(/\.(exe|lnk)$/i, ''),
          path,
          group: '演示导入',
          pinned: false,
          createdAt: Date.now(),
        };
      });
    return persist({ ...current, items: [...current.items, ...additions] });
  },
  async launch(id) {
    touchItem(id);
  },
  async openFolder(id) {
    requireItem(id);
  },
  async runProject(id) {
    const item = requireItem(id);
    if (item.kind !== 'project') throw new Error('只有项目入口可以运行 npm 脚本');
    if (!validScript(item.script || 'dev')) throw new Error('npm 脚本名称不合法');
    if (['starting', 'running', 'stopping'].includes(demoTasks.get(id)?.status || ''))
      throw new Error('演示项目已在运行');
    publishTask({
      id,
      status: 'starting',
      logs: [
        `【演示】准备展示 npm run ${item.script || 'dev'} 的运行流程。`,
        '【演示】未执行命令、未创建真实进程，也不会启动本地服务。',
      ],
    });
    demoTimers.set(
      id,
      setTimeout(() => {
        demoTimers.delete(id);
        const task = demoTasks.get(id);
        if (task?.status === 'starting')
          publishTask({
            ...task,
            status: 'running',
            logs: [...task.logs, '【演示】模拟进程状态：运行中。服务就绪状态未检测。'],
          });
      }, 650),
    );
  },
  async stopProject(id) {
    const timer = demoTimers.get(id);
    if (timer) clearTimeout(timer);
    demoTimers.delete(id);
    const task = demoTasks.get(id);
    if (!task) throw new Error('这个项目没有可停止的演示任务');
    publishTask({
      ...task,
      status: 'stopped',
      logs: [...task.logs, '【演示】模拟任务已停止，没有真实进程受到影响。'],
    });
  },
  async getTasks() {
    return clone([...demoTasks.values()]);
  },
  async saveSettings(settings: Settings) {
    if (
      !Number.isInteger(settings.hoverDelay) ||
      settings.hoverDelay < 0 ||
      settings.hoverDelay > 2000 ||
      !Number.isInteger(settings.hideDelay) ||
      settings.hideDelay < 100 ||
      settings.hideDelay > 3000
    )
      throw new Error('悬停延迟为 0–2000 毫秒，收起延迟为 100–3000 毫秒');
    return persist({ ...readDemo(), settings: clone(settings) });
  },
  async setDockExpanded() {},
  async showMain() {},
  async hideMain() {},
  async minimizeMain() {},
  async quit() {
    throw new Error('浏览器预览无法退出桌面程序；请关闭当前浏览器页面');
  },
  onState(callback) {
    stateListeners.add(callback);
    return () => {
      stateListeners.delete(callback);
    };
  },
  onTask(callback) {
    taskListeners.add(callback);
    return () => {
      taskListeners.delete(callback);
    };
  },
  onDockReset() {
    return () => undefined;
  },
};

export const api: DockAPI = window.dock ?? browserAPI;
