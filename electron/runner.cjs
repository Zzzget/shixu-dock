'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFile } = require('node:child_process');
const { StringDecoder } = require('node:string_decoder');
function findNodeRuntime(env = process.env) {
  const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path');
  const dirs = (env[pathKey] || '')
    .split(path.delimiter)
    .map(dir => dir.replace(/^"|"$/g, ''))
    .filter(Boolean);
  if (env.ProgramFiles) dirs.push(path.join(env.ProgramFiles, 'nodejs'));
  for (const dir of [...new Set(dirs)]) {
    const node = path.join(dir, process.platform === 'win32' ? 'node.exe' : 'node');
    const npm = path.join(dir, 'node_modules', 'npm', 'bin', 'npm-cli.js');
    if (fs.existsSync(node) && fs.existsSync(npm)) return { node, npm };
  }
  throw new Error(
    '未找到可用的 Node.js / npm。请安装 Node.js LTS，重启拾序后再试。目前仅支持 Node.js 标准安装中的 npm。',
  );
}
function verifyProject(item) {
  if (item.kind !== 'project') throw new Error('该入口不是项目。');
  const stat = fs.statSync(item.path);
  if (!stat.isDirectory()) throw new Error('项目目录不存在。');
  const filename = path.join(item.path, 'package.json');
  if (fs.statSync(filename).size > 1024 * 1024) throw new Error('项目 package.json 过大。');
  const manifest = JSON.parse(fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, ''));
  if (typeof manifest.scripts?.[item.script] !== 'string' || !manifest.scripts[item.script].trim())
    throw new Error(`项目未定义 npm 脚本 ${item.script}。请检查 package.json。`);
  return manifest.scripts[item.script];
}
class ProjectRunner {
  constructor(emit) {
    this.tasks = new Map();
    this.emit = emit;
  }
  snapshot(task) {
    return {
      id: task.id,
      status: task.status,
      logs: [...task.logs],
      pid: task.pid,
      exitCode: task.exitCode,
    };
  }
  list() {
    return [...this.tasks.values()].map(task => this.snapshot(task));
  }
  hasActive(id) {
    return ['starting', 'running', 'stopping'].includes(this.tasks.get(id)?.status);
  }
  notify(task) {
    this.emit(this.snapshot(task));
  }
  log(task, value) {
    const safe = String(value)
      .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
      .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '');
    task.logs.push(
      ...safe
        .split(/\r?\n/)
        .filter(Boolean)
        .map(line => line.slice(0, 4000)),
    );
    if (task.logs.length > 400) task.logs.splice(0, task.logs.length - 400);
    if (!task.timer)
      task.timer = setTimeout(() => {
        task.timer = null;
        this.notify(task);
      }, 100);
  }
  start(item) {
    if (this.hasActive(item.id)) throw new Error('该项目已在运行，不能重复启动。');
    verifyProject(item);
    const { node, npm } = findNodeRuntime();
    const task = {
      id: item.id,
      status: 'starting',
      logs: [
        `> npm run ${item.script}`,
        `工作目录：${item.path}`,
        '进程已启动不代表服务就绪，请以项目日志为准。',
      ],
      child: null,
      pid: undefined,
      exitCode: null,
      timer: null,
    };
    this.tasks.set(item.id, task);
    const env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' };
    delete env.ELECTRON_RUN_AS_NODE;
    const child = spawn(node, [npm, 'run', item.script], {
      cwd: item.path,
      env,
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    task.child = child;
    task.pid = child.pid;
    this.notify(task);
    const out = new StringDecoder('utf8'),
      err = new StringDecoder('utf8');
    child.stdout.on('data', data => this.log(task, out.write(data)));
    child.stderr.on('data', data => this.log(task, err.write(data)));
    child.on('spawn', () => {
      task.status = 'running';
      this.notify(task);
    });
    child.on('error', error => {
      task.status = 'error';
      this.log(task, error.message);
      this.notify(task);
    });
    child.on('close', code => {
      this.log(task, out.end() + err.end());
      task.exitCode = code;
      if (task.status === 'stopping') task.status = 'stopped';
      else if (task.status !== 'error') task.status = code === 0 ? 'exited' : 'error';
      this.log(task, `进程结束，退出码 ${code ?? '未知'}。`);
      this.notify(task);
    });
  }
  async stop(id) {
    const task = this.tasks.get(id);
    if (!task || !this.hasActive(id)) return;
    if (!task.child?.pid || task.child.exitCode !== null) return;
    task.status = 'stopping';
    this.notify(task);
    if (process.platform === 'win32') {
      const tool = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe');
      await new Promise((resolve, reject) =>
        execFile(
          tool,
          ['/PID', String(task.child.pid), '/T', '/F'],
          { windowsHide: true },
          error => {
            if (error && task.child.exitCode === null) {
              task.status = 'running';
              this.notify(task);
              reject(new Error('未能停止项目进程树，请检查日志或在任务管理器中确认。'));
            } else resolve();
          },
        ),
      );
    } else task.child.kill('SIGTERM');
  }
  async stopAll() {
    await Promise.all([...this.tasks.keys()].map(id => this.stop(id)));
  }
}
module.exports = { findNodeRuntime, verifyProject, ProjectRunner };
