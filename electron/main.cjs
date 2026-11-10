'use strict';
const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  dialog,
  Tray,
  Menu,
  nativeImage,
  screen,
  globalShortcut,
  powerMonitor,
} = require('electron');
const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { spawn } = require('node:child_process');
const {
  ConfigStore,
  validateDraft,
  validateSettings,
  recordLaunch,
  dockBounds,
} = require('./core.cjs');
const { ProjectRunner, verifyProject } = require('./runner.cjs');

const root = path.resolve(__dirname, '..');
const smoke = process.argv.includes('--shixu-smoke');
// 调试会话使用独立配置目录：避免与常驻的正式实例抢占单实例锁或改动真实配置。
const isolated = !smoke && !app.isPackaged && process.env.SHIXU_DEBUG_PROFILE === '1';
if (smoke || isolated)
  app.setPath(
    'userData',
    path.join(root, 'test-results', smoke ? 'desktop-profile' : 'debug-profile'),
  );
app.setName('拾序');
let store,
  runner,
  mainWindow,
  dockWindow,
  tray,
  quitting = false,
  expanded = false;
const iconCache = new Map(),
  pendingRuns = new Set();
const entry = pathToFileURL(path.join(root, 'dist', 'index.html')).href;
const devURL =
  !app.isPackaged && process.env.SHIXU_DEV_URL === 'http://127.0.0.1:5178'
    ? process.env.SHIXU_DEV_URL
    : null;
// 调试开关：由 scripts/dev.cjs 注入，仅开发版生效；取值 main / dock / all。
const devtools = app.isPackaged ? '' : process.env.SHIXU_DEVTOOLS || '';
// 用独立窗口打开 DevTools，避免嵌入模式改变无边框透明窗口的布局。
function attachDevTools(win, view) {
  if (!['main', 'dock', 'all'].includes(devtools)) return;
  if (devtools !== 'all' && devtools !== view) return;
  win.webContents.once('dom-ready', () => {
    if (!win.isDestroyed()) win.webContents.openDevTools({ mode: 'detach' });
  });
}
function broadcast(channel, value) {
  for (const win of [mainWindow, dockWindow])
    if (win && !win.isDestroyed()) win.webContents.send(channel, value);
}
function stateView() {
  return {
    ...store.state,
    items: store.state.items.map(item => ({ ...item, icon: iconCache.get(item.id) })),
    configPath: store.file,
    warning: store.warning || undefined,
  };
}
function publishState() {
  const state = stateView();
  broadcast('dock:state', state);
  return state;
}
function createIcon() {
  const size = 32,
    buffer = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const inside =
        ((x >= 4 && x <= 13) || (x >= 18 && x <= 27)) &&
        ((y >= 4 && y <= 13) || (y >= 18 && y <= 27));
      if (inside) {
        const i = (y * size + x) * 4;
        buffer[i] = 174;
        buffer[i + 1] = 103;
        buffer[i + 2] = 127;
        buffer[i + 3] = 255;
      }
    }
  return nativeImage.createFromBitmap(buffer, { width: size, height: size });
}
async function loadIcon(item) {
  try {
    const icon = await app.getFileIcon(item.path, { size: 'normal' });
    if (!icon.isEmpty()) iconCache.set(item.id, icon.toDataURL());
  } catch {
    iconCache.delete(item.id);
  }
}
function safeWindow(options) {
  const win = new BrowserWindow({
    ...options,
    icon: createIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      devTools: !app.isPackaged,
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.webContents.on('will-attach-webview', event => event.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) =>
    callback(false),
  );
  return win;
}
function loadView(win, view) {
  const promise = devURL
    ? win.loadURL(`${devURL}/?view=${view}`)
    : win.loadFile(path.join(root, 'dist', 'index.html'), { query: { view } });
  promise.catch(error => dialog.showErrorBox('界面加载失败', error.message));
}
function positionDock(value) {
  expanded = Boolean(value);
  if (!dockWindow || dockWindow.isDestroyed()) return;
  dockWindow.setBounds(dockBounds(screen.getPrimaryDisplay().workArea, expanded));
}
function resetDock() {
  positionDock(false);
  if (dockWindow && !dockWindow.isDestroyed()) dockWindow.webContents.send('dock:reset');
}
function showMain() {
  resetDock();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}
function createWindows() {
  // 主窗口使用透明无边框窗口，由渲染层的半透明玻璃背景透出桌面壁纸。
  mainWindow = safeWindow({
    width: 1040,
    height: 760,
    minWidth: 780,
    minHeight: 600,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    title: '拾序',
    show: false,
  });
  mainWindow.on('close', event => {
    if (!quitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.once('ready-to-show', () => {
    if (!smoke && !process.argv.includes('--hidden')) mainWindow.show();
  });
  dockWindow = safeWindow({
    ...dockBounds(screen.getPrimaryDisplay().workArea, false),
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    show: false,
  });
  dockWindow.once('ready-to-show', () => {
    if (!smoke) dockWindow.showInactive();
  });
  loadView(mainWindow, 'main');
  loadView(dockWindow, 'dock');
  attachDevTools(mainWindow, 'main');
  attachDevTools(dockWindow, 'dock');
  for (const event of ['display-added', 'display-removed', 'display-metrics-changed'])
    screen.on(event, resetDock);
  powerMonitor.on('resume', resetDock);
  powerMonitor.on('unlock-screen', resetDock);
  tray = new Tray(createIcon());
  tray.setToolTip('拾序 · 双击顶部按钮打开');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '打开拾序', click: showMain },
      {
        label: '显示悬浮入口',
        click: () => {
          resetDock();
          dockWindow.showInactive();
        },
      },
      { type: 'separator' },
      {
        label: '退出拾序',
        click: () => {
          requestQuit().catch(error => dialog.showErrorBox('无法退出', error.message));
        },
      },
    ]),
  );
  tray.on('double-click', showMain);
  if (!smoke && !isolated && !globalShortcut.register('CommandOrControl+Alt+Space', showMain))
    store.warning = [store.warning, 'Ctrl+Alt+Space 已被其他程序占用，可使用顶部按钮或托盘打开。']
      .filter(Boolean)
      .join(' ');
}
function authorized(event, mainOnly = false) {
  const windows = mainOnly ? [mainWindow] : [mainWindow, dockWindow];
  if (
    !windows.some(win => win && !win.isDestroyed() && win.webContents === event.sender) ||
    !event.senderFrame ||
    event.senderFrame !== event.sender.mainFrame
  )
    throw new Error('拒绝非可信界面的调用。');
  const url = new URL(event.senderFrame.url);
  if (devURL ? url.origin !== devURL : `${url.protocol}//${url.host}${url.pathname}` !== entry)
    throw new Error('拒绝不可信页面来源。');
}
function handle(name, fn, mainOnly = false) {
  ipcMain.handle('dock:' + name, async (event, ...args) => {
    authorized(event, mainOnly);
    return fn(...args);
  });
}
function itemFor(id) {
  if (typeof id !== 'string') throw new Error('入口编号格式不正确。');
  const item = store.state.items.find(item => item.id === id);
  if (!item) throw new Error('入口不存在。');
  return item;
}
async function targetExists(item) {
  let stat;
  try {
    stat = await fsp.stat(item.path);
  } catch {
    throw new Error('路径不存在或无法访问，请编辑该入口重新选择路径。');
  }
  if (['folder', 'project'].includes(item.kind) && !stat.isDirectory())
    throw new Error('请选择有效文件夹。');
  if (['app', 'file'].includes(item.kind) && !stat.isFile()) throw new Error('请选择有效文件。');
}
async function importLink(target, id) {
  const directory = path.join(app.getPath('userData'), 'shortcuts');
  await fsp.mkdir(directory, { recursive: true });
  const ownPath = path.join(directory, `${id}.lnk`);
  if (path.resolve(target) === path.resolve(ownPath)) return ownPath;
  shell.readShortcutLink(target);
  await fsp.copyFile(target, ownPath);
  return ownPath;
}
async function saveItem(draft) {
  const item = validateDraft(draft);
  await targetExists(item);
  const previous = draft.id ? itemFor(draft.id) : null;
  if (previous && (runner.hasActive(previous.id) || pendingRuns.has(previous.id)))
    throw new Error('请先停止项目，再编辑入口。');
  const id = previous?.id || crypto.randomUUID();
  if (store.state.items.length >= 2000 && !previous) throw new Error('入口数量已达上限。');
  if (item.kind === 'app' && path.extname(item.path).toLowerCase() === '.lnk')
    item.path = await importLink(item.path, id);
  const saved = {
    ...item,
    id,
    createdAt: previous?.createdAt || Date.now(),
    lastOpenedAt: previous?.lastOpenedAt || 0,
  };
  store.update(state => {
    const index = state.items.findIndex(entry => entry.id === id);
    if (index >= 0) state.items[index] = saved;
    else state.items.push(saved);
  });
  await loadIcon(saved);
  return publishState();
}
async function confirmOperation(title, message, detail) {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title,
    message,
    detail,
    buttons: ['取消', '我信任此操作，继续'],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  });
  if (result.response !== 1) throw new Error('操作已取消。');
}
async function launchExecutable(exe, args) {
  if (path.extname(exe).toLowerCase() !== '.exe') throw new Error('指定打开程序必须是 .exe。');
  await fsp.access(exe);
  await new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    const child = spawn(exe, args, {
      shell: false,
      stdio: 'ignore',
      windowsHide: false,
      detached: false,
      env,
    });
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
    child.once('error', error => reject(new Error('程序启动失败：' + error.message)));
  });
}
function editorFor(item) {
  const explicit = item.editorPath || store.state.settings.defaultEditorPath;
  if (explicit) return explicit;
  const candidates = [
    process.env.LOCALAPPDATA &&
      path.join(process.env.LOCALAPPDATA, 'Programs', 'Microsoft VS Code', 'Code.exe'),
    process.env.ProgramFiles &&
      path.join(process.env.ProgramFiles, 'Microsoft VS Code', 'Code.exe'),
  ].filter(Boolean);
  const installed = candidates.find(file => fs.existsSync(file));
  if (!installed) throw new Error('未找到 VS Code，请在项目或偏好设置中选择编辑器的 .exe 路径。');
  return installed;
}
async function launch(id) {
  const item = itemFor(id);
  await targetExists(item);
  if (item.kind === 'project') await launchExecutable(editorFor(item), [item.path]);
  else if (item.editorPath) await launchExecutable(item.editorPath, [item.path]);
  else {
    if (item.kind === 'file' && /\.(ps1|cmd|bat|vbs|js|msi|reg|exe|lnk|url)$/i.test(item.path))
      await confirmOperation(
        '打开可执行文件',
        '该文件可能执行系统操作。',
        `仅在信任来源时继续：\n${item.path}`,
      );
    const error = await shell.openPath(item.path);
    if (error) throw new Error('无法打开：' + error);
  }
  store.update(state => recordLaunch(state, id));
  publishState();
}
async function requestQuit() {
  if (quitting) return;
  const active = runner.list().filter(task => runner.hasActive(task.id));
  if (active.length)
    await confirmOperation(
      '退出拾序',
      `退出将停止 ${active.length} 个由拾序启动的项目。`,
      '停止开发服务会中断正在执行的任务。不会关闭你单独启动的程序。',
    );
  await runner.stopAll();
  quitting = true;
  app.quit();
}
function registerIPC() {
  handle('getState', stateView);
  handle('saveItem', saveItem, true);
  handle(
    'removeItem',
    async id => {
      const item = itemFor(id);
      if (runner.hasActive(id) || pendingRuns.has(id))
        throw new Error('请先停止项目后再移除入口。');
      store.update(state => {
        state.items = state.items.filter(entry => entry.id !== item.id);
        state.recentIds = state.recentIds.filter(recent => recent !== item.id);
      });
      iconCache.delete(id);
      return publishState();
    },
    true,
  );
  handle(
    'pickPath',
    async kind => {
      if (!['app', 'file', 'folder', 'editor'].includes(kind)) throw new Error('选择器类型无效。');
      const result = await dialog.showOpenDialog(mainWindow, {
        title: '选择本地路径',
        properties: [kind === 'folder' ? 'openDirectory' : 'openFile'],
        filters:
          kind === 'app'
            ? [{ name: '应用与快捷方式', extensions: ['exe', 'lnk'] }]
            : kind === 'editor'
              ? [{ name: '应用程序', extensions: ['exe'] }]
              : [],
      });
      return result.canceled ? null : result.filePaths[0] || null;
    },
    true,
  );
  handle(
    'importPaths',
    async paths => {
      if (!Array.isArray(paths) || paths.length < 1 || paths.length > 10)
        throw new Error('每次请导入 1–10 个文件或目录。');
      const drafts = [];
      for (const target of paths) {
        if (typeof target !== 'string' || !path.isAbsolute(target))
          throw new Error('导入路径格式无效。');
        const stat = await fsp.stat(target),
          ext = path.extname(target).toLowerCase();
        const kind = stat.isDirectory()
          ? 'folder'
          : ['.lnk', '.exe'].includes(ext)
            ? 'app'
            : 'file';
        const name = path.basename(target, kind === 'app' ? ext : undefined);
        const draft = validateDraft({ kind, path: target, name, pinned: false, group: '默认分组' });
        if (kind === 'app' && ext === '.lnk') shell.readShortcutLink(target);
        drafts.push(draft);
      }
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        title: '导入入口',
        message: `添加 ${drafts.length} 个入口？`,
        detail:
          '只添加引用；快捷方式将复制到配置目录，不移动或删除原文件。\n\n' +
          drafts.map(item => item.path).join('\n'),
        buttons: ['取消', '添加'],
        defaultId: 1,
        cancelId: 0,
      });
      if (result.response !== 1) return stateView();
      const added = [];
      try {
        for (const draft of drafts) {
          await saveItem(draft);
          added.push(draft.name);
        }
      } catch (error) {
        throw new Error(`已添加 ${added.length} 个入口；其余导入中断：${error.message}`);
      }
      return stateView();
    },
    true,
  );
  handle('launch', launch);
  handle(
    'openFolder',
    async id => {
      const item = itemFor(id);
      await targetExists(item);
      const error = await shell.openPath(
        ['project', 'folder'].includes(item.kind) ? item.path : path.dirname(item.path),
      );
      if (error) throw new Error(error);
    },
    true,
  );
  handle('getTasks', () => runner.list());
  handle(
    'runProject',
    async id => {
      if (pendingRuns.has(id) || runner.hasActive(id))
        throw new Error('项目正在启动或运行，请勿重复启动。');
      const item = itemFor(id);
      pendingRuns.add(id);
      try {
        const command = verifyProject(item);
        await confirmOperation(
          '运行项目脚本',
          `运行 npm run ${item.script}？`,
          `${item.name}\n${item.path}\n\n脚本内容：${command}\n\nnpm 可能同时执行 pre/post 生命周期脚本。脚本具有当前用户权限，请只运行可信项目。`,
        );
        await launchExecutable(editorFor(item), [item.path]);
        runner.start(item);
        store.update(state => recordLaunch(state, id));
        publishState();
      } finally {
        pendingRuns.delete(id);
      }
    },
    true,
  );
  handle(
    'stopProject',
    id => {
      itemFor(id);
      return runner.stop(id);
    },
    true,
  );
  handle(
    'saveSettings',
    async value => {
      const settings = validateSettings(value);
      if (settings.defaultEditorPath) await fsp.access(settings.defaultEditorPath);
      if (settings.launchAtLogin && !app.isPackaged)
        throw new Error('开机启动需使用打包后的版本；开发版暂不写入系统启动项。');
      if (settings.launchAtLogin !== store.state.settings.launchAtLogin)
        app.setLoginItemSettings({
          openAtLogin: settings.launchAtLogin,
          path: process.execPath,
          args: ['--hidden'],
        });
      store.update(state => {
        state.settings = settings;
      });
      return publishState();
    },
    true,
  );
  handle('setDockExpanded', value => {
    if (typeof value !== 'boolean') throw new Error('窗口参数无效。');
    positionDock(value);
  });
  handle('showMain', showMain);
  handle('hideMain', () => mainWindow.hide(), true);
  handle('minimizeMain', () => mainWindow.minimize(), true);
  handle('quit', requestQuit, true);
}
if (!smoke && !isolated && !app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (mainWindow) showMain();
  });
  app
    .whenReady()
    .then(async () => {
      app.setAppUserModelId('local.shixu.dock');
      store = new ConfigStore(app.getPath('userData'));
      runner = new ProjectRunner(task => broadcast('dock:task', task));
      createWindows();
      registerIPC();
      for (const item of store.state.items) await loadIcon(item);
      publishState();
    })
    .catch(error => {
      dialog.showErrorBox('拾序无法启动', error.message);
      quitting = true;
      app.quit();
    });
}
app.on('before-quit', event => {
  if (!quitting && runner) {
    event.preventDefault();
    requestQuit().catch(error => {
      if (error.message !== '操作已取消。') dialog.showErrorBox('退出失败', error.message);
    });
  }
});
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (tray) tray.destroy();
});
app.on('window-all-closed', () => {});
