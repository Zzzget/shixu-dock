'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DEFAULT_SETTINGS = Object.freeze({
  launchAtLogin: false,
  hoverDelay: 180,
  hideDelay: 320,
  defaultEditorPath: '',
});
const KINDS = new Set(['app', 'file', 'folder', 'project']);
function text(value, max = 1024) {
  if (typeof value !== 'string' || value.length > max || /[\x00-\x1f]/.test(value))
    throw new Error('字段格式不正确，请检查输入。');
  return value.trim();
}
function absolutePath(value, allowEmpty = false) {
  const result = text(value, 4096);
  if (allowEmpty && !result) return '';
  if (!path.isAbsolute(result)) throw new Error('请选择或输入完整的本地绝对路径。');
  return path.normalize(result);
}
function validateDraft(value) {
  if (!value || !KINDS.has(value.kind)) throw new Error('不支持的入口类型。');
  const name = text(value.name, 100);
  if (!name) throw new Error('请填写名称。');
  const target = absolutePath(value.path);
  const editorPath = absolutePath(value.editorPath || '', true);
  if (editorPath && path.extname(editorPath).toLowerCase() !== '.exe')
    throw new Error('自定义打开程序请选择 .exe 文件。');
  const script = text(value.script || 'dev', 80);
  if (!/^[A-Za-z0-9][A-Za-z0-9:_-]{0,79}$/.test(script))
    throw new Error('请输入 npm 脚本名称，例如 dev 或 start，不是完整命令。');
  if (value.kind === 'app' && !['.exe', '.lnk'].includes(path.extname(target).toLowerCase()))
    throw new Error('应用入口目前支持 .exe 和 .lnk。其他文件请选择文件类型。');
  return {
    kind: value.kind,
    name,
    path: target,
    group: text(value.group || '默认分组', 40) || '默认分组',
    editorPath,
    script,
    pinned: Boolean(value.pinned),
  };
}
function validateSettings(value) {
  if (!value || typeof value.launchAtLogin !== 'boolean') throw new Error('偏好设置格式不正确。');
  const hoverDelay = Number(value.hoverDelay),
    hideDelay = Number(value.hideDelay);
  if (!Number.isInteger(hoverDelay) || hoverDelay < 0 || hoverDelay > 2000)
    throw new Error('悬停延迟范围为 0–2000 毫秒。');
  if (!Number.isInteger(hideDelay) || hideDelay < 100 || hideDelay > 3000)
    throw new Error('收起延迟范围为 100–3000 毫秒。');
  const defaultEditorPath = absolutePath(value.defaultEditorPath || '', true);
  if (defaultEditorPath && path.extname(defaultEditorPath).toLowerCase() !== '.exe')
    throw new Error('默认编辑器请选择 .exe 程序。');
  return { launchAtLogin: value.launchAtLogin, hoverDelay, hideDelay, defaultEditorPath };
}
function initialState() {
  return { version: 1, items: [], recentIds: [], settings: { ...DEFAULT_SETTINGS } };
}
function parseState(raw) {
  if (!raw || raw.version !== 1 || !Array.isArray(raw.items) || raw.items.length > 2000)
    throw new Error('配置格式或版本不受支持。');
  const ids = new Set();
  const items = raw.items.map(item => {
    if (typeof item.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(item.id) || ids.has(item.id))
      throw new Error('配置入口 ID 无效。');
    ids.add(item.id);
    return {
      ...validateDraft(item),
      id: item.id,
      createdAt: Number(item.createdAt) || 0,
      lastOpenedAt: Number(item.lastOpenedAt) || 0,
    };
  });
  return {
    version: 1,
    items,
    recentIds: recentAppIds(items, Array.isArray(raw.recentIds) ? raw.recentIds : []),
    settings: validateSettings({ ...DEFAULT_SETTINGS, ...raw.settings }),
  };
}
function recentAppIds(items, ids) {
  const allowed = new Set(items.filter(item => item.kind === 'app').map(item => item.id));
  return [...new Set(ids)].filter(id => allowed.has(id)).slice(0, 10);
}
function recordLaunch(state, id, now = Date.now()) {
  const item = state.items.find(item => item.id === id);
  if (!item) throw new Error('找不到该入口，请刷新后再试。');
  item.lastOpenedAt = now;
  if (item.kind === 'app') state.recentIds = recentAppIds(state.items, [id, ...state.recentIds]);
  return state;
}
class ConfigStore {
  constructor(directory) {
    fs.mkdirSync(directory, { recursive: true });
    this.file = path.join(directory, 'config.json');
    this.backup = path.join(directory, 'config.backup.json');
    this.warning = '';
    if (!fs.existsSync(this.file)) {
      if (fs.existsSync(this.backup))
        throw new Error('主配置缺失但备份仍存在，请先恢复 config.backup.json，避免覆盖已有配置。');
      this.state = initialState();
      this.save(this.state);
      return;
    }
    try {
      this.state = parseState(JSON.parse(fs.readFileSync(this.file, 'utf8')));
    } catch {
      const preserved = path.join(directory, `config.corrupt-${Date.now()}.json`);
      fs.copyFileSync(this.file, preserved);
      if (!fs.existsSync(this.backup))
        throw new Error(`配置损坏，原文件已保留为 ${preserved}，未覆盖任何入口。`);
      try {
        this.state = parseState(JSON.parse(fs.readFileSync(this.backup, 'utf8')));
      } catch {
        throw new Error(`配置及备份无法读取，请恢复配置。损坏原件已保留为 ${preserved}`);
      }
      this.warning = '配置异常，已从上一次备份恢复。损坏原件已保留在配置目录。';
      this.replace(this.state);
    }
  }
  replace(state) {
    const temp = this.file + '.' + crypto.randomUUID() + '.tmp';
    const fd = fs.openSync(temp, 'wx', 0o600);
    try {
      fs.writeFileSync(fd, JSON.stringify(state, null, 2), 'utf8');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(temp, this.file);
  }
  save(next) {
    const checked = parseState(next);
    if (fs.existsSync(this.file)) fs.copyFileSync(this.file, this.backup);
    this.replace(checked);
    this.state = checked;
    return this.state;
  }
  update(mutator) {
    const next = structuredClone(this.state);
    mutator(next);
    return this.save(next);
  }
}
function dockBounds(workArea, expanded) {
  const width = Math.min(expanded ? 620 : 144, workArea.width);
  const height = Math.min(expanded ? 340 : 52, workArea.height);
  return { x: Math.round(workArea.x + (workArea.width - width) / 2), y: workArea.y, width, height };
}
module.exports = {
  DEFAULT_SETTINGS,
  initialState,
  validateDraft,
  validateSettings,
  parseState,
  recentAppIds,
  recordLaunch,
  ConfigStore,
  dockBounds,
};
