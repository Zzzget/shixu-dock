'use strict';
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const argv = process.argv.slice(2);
const debug = argv.includes('--debug');
// 读取 --name=value 形式的调试参数；未传时返回默认值。
const option = (name, fallback) => {
  const prefix = `--${name}=`;
  const found = argv.find(item => item.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
};
// 端口只允许 1–65535 的整数，避免把非法参数传给 Electron 命令行。
const port = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : fallback;
};
const inspectPort = port(option('inspect', '9229'), 9229);
const rendererPort = port(option('renderer-port', '9223'), 9223);
const devtools = option('devtools', debug ? 'main' : '');
// Electron 的开关必须放在应用目录之前，否则会被当作应用参数。
const electronArgs = debug
  ? [`--inspect=${inspectPort}`, `--remote-debugging-port=${rendererPort}`, root]
  : [root];
const sharedProfile = argv.includes('--shared-profile');
const electronEnv = { ...env, SHIXU_DEV_URL: 'http://127.0.0.1:5178' };
if (devtools && devtools !== 'none') electronEnv.SHIXU_DEVTOOLS = devtools;
if (debug && !sharedProfile) electronEnv.SHIXU_DEBUG_PROFILE = '1';
if (debug)
  console.log(
    `[拾序调试] 主进程 Inspector 127.0.0.1:${inspectPort} · 渲染进程 127.0.0.1:${rendererPort} · DevTools: ${devtools || '关闭'} · Vite http://127.0.0.1:5178 · 配置: ${sharedProfile ? '正式（需先退出常驻实例）' : 'test-results/debug-profile'}`,
  );
let electronProcess,
  stopping = false;
const vite = spawn(
  process.execPath,
  [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1'],
  { cwd: root, env, stdio: ['inherit', 'pipe', 'inherit'] },
);
let output = '';
vite.stdout.on('data', chunk => {
  process.stdout.write(chunk);
  output += chunk.toString().replace(/\x1b\[[0-9;]*m/g, '');
  if (!electronProcess && output.includes('http://127.0.0.1:5178')) {
    electronProcess = spawn(require('electron'), electronArgs, {
      cwd: root,
      env: electronEnv,
      stdio: 'inherit',
    });
    electronProcess.on('error', error => {
      console.error(error);
      stop(1);
    });
    electronProcess.on('exit', code => stop(code || 0));
  }
});
vite.on('error', error => {
  console.error(error);
  stop(1);
});
vite.on('exit', code => {
  if (!stopping) stop(code || 0);
});
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  if (electronProcess && electronProcess.exitCode === null) electronProcess.kill();
  if (vite.exitCode === null) vite.kill();
  process.exitCode = code;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
