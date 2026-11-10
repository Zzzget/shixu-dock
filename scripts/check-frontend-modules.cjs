#!/usr/bin/env node
/**
 * 前端模块化规则检查器（项目约定，勿删除）。
 *
 * 权威规则见 CODE_STYLE.md 第二章 / AGENTS.md 强制二：
 * 1. 每个页面独占 src/pages/<PascalCase>/ 且必须有 index.tsx；
 * 2. 根目录不得散落页面文件；
 * 3. 文件规模按职责设上限（UI 300 行、数据层 400 行、入口 120 行）；
 * 4. 一个 .tsx 文件只放一个主组件，复杂模块必须拆文件；
 * 5. 页面私有组件不得被其他页面 import；
 * 6. hooks 目录文件必须以 use 开头命名。
 *
 * 用法：node scripts/check-frontend-modules.cjs
 * 回归测试：tests/frontend-modules.test.cjs
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

/** 各类文件的行数上限（含注释与空行）。 */
const LIMITS = Object.freeze({
  // 页面 / 组件 / hooks：超过就应继续拆成独立组件或 Hook。
  ui: 300,
  // 类型声明、数据适配与工具函数：允许稍长，但仍不得变成上帝文件。
  data: 400,
  // 应用入口只做环境判定与页面组合。
  entry: 120,
});

/** src 根目录允许存在的 .tsx 文件；其他 .tsx 都应放进页面目录。 */
const ROOT_TSX_ALLOWED = new Set(['App.tsx', 'main.tsx']);

/**
 * 存量文件豁免清单：键为相对路径，值为迁移原因。
 * 目前为空；只有历史文件暂时无法拆分时才登记，新文件禁止加入。
 */
const LEGACY_ALLOWLIST = new Map();

/** 判断文件属于哪一类，返回允许的最大行数。 */
function limitFor(relativePath) {
  if (relativePath === 'src/App.tsx' || relativePath === 'src/main.tsx') return LIMITS.entry;
  if (/^src\/(pages|components|hooks)\//.test(relativePath)) return LIMITS.ui;
  return LIMITS.data;
}

/** 从源码中找出组件声明（函数组件、箭头组件、类组件），返回去重后的名称。 */
function componentNames(content) {
  const names = new Set();
  const patterns = [
    /(?:^|\n)\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Z][A-Za-z0-9_]*)\s*\(/g,
    /(?:^|\n)\s*(?:export\s+)?const\s+([A-Z][A-Za-z0-9_]*)\s*(?::[^=\n]+)?=\s*(?:async\s+)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g,
    /(?:^|\n)\s*(?:export\s+)?(?:default\s+)?class\s+([A-Z][A-Za-z0-9_]*)/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) names.add(match[1]);
  }
  return names;
}

/** 找出文件里 import / require 的相对路径。 */
function relativeImports(content) {
  const specs = [];
  const pattern = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"](\.[^'"]+)['"]/g;
  let match;
  while ((match = pattern.exec(content)) !== null) specs.push(match[1]);
  return specs;
}

/** 返回文件所属页面名；不在任何页面目录下时返回 null。 */
function pageOf(relativePath) {
  const match = /^src\/pages\/([^/]+)\//.exec(relativePath);
  return match ? match[1] : null;
}

/**
 * 分析一组前端文件是否符合模块化规则。
 * @param {Array<{path: string, content: string}>} files 相对项目根目录的 POSIX 路径与源码内容。
 * @param {{allowlist?: Map<string, string>}} options 可选：覆盖存量豁免清单，供测试使用。
 * @returns {string[]} 报错信息，格式为 `文件:行号 说明`。
 */
function analyze(files, options = {}) {
  const allowlist = options.allowlist || LEGACY_ALLOWLIST;
  const messages = [];
  const paths = new Set(files.map(file => file.path));
  const report = (file, line, message) => messages.push(`${file}:${line} ${message}`);

  const pageDirs = new Set();
  for (const file of files) {
    const dirMatch = /^src\/pages\/([^/]+)\//.exec(file.path);
    if (dirMatch) pageDirs.add(dirMatch[1]);
    if (/^src\/pages\/[^/]+\.tsx?$/.test(file.path)) {
      report(file.path, 1, '页面必须独占一个文件夹，请把该文件移入 src/pages/<页面名>/index.tsx');
    }
    if (/^src\/[^/]+\.tsx$/.test(file.path) && !ROOT_TSX_ALLOWED.has(path.posix.basename(file.path))) {
      report(file.path, 1, 'src 根目录不得散落页面文件，请放入 src/pages/<页面名>/');
    }
  }

  for (const dir of pageDirs) {
    if (!/^[A-Z][A-Za-z0-9]*$/.test(dir)) {
      report(`src/pages/${dir}`, 1, '页面目录必须使用 PascalCase 命名');
    }
    if (!paths.has(`src/pages/${dir}/index.tsx`)) {
      report(`src/pages/${dir}`, 1, '页面目录缺少 index.tsx 入口文件');
    }
  }

  for (const file of files) {
    const lines = file.content.split(/\r?\n/).length;
    const limit = limitFor(file.path);
    if (lines > limit && !allowlist.has(file.path)) {
      report(file.path, limit, `文件共 ${lines} 行，超过 ${limit} 行上限；请拆分成独立组件 / Hook`);
    }

    if (/\.tsx$/.test(file.path) && file.path !== 'src/main.tsx') {
      const names = componentNames(file.content);
      if (names.size > 1) {
        report(
          file.path,
          1,
          `单个 .tsx 文件包含 ${names.size} 个组件（${[...names].join('、')}），请拆成各自独立的组件文件`,
        );
      }
    }

    if (/\/hooks\/[^/]+\.(ts|tsx)$/.test(file.path)) {
      const base = path.posix.basename(file.path).replace(/\.(ts|tsx)$/, '');
      if (base !== 'index' && !/^use[A-Z]/.test(base)) {
        report(file.path, 1, 'hooks 目录下的文件必须以 use 开头命名');
      }
    }

    const owner = pageOf(file.path);
    for (const spec of relativeImports(file.content)) {
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(file.path), spec));
      const privateMatch = /^src\/pages\/([^/]+)\/(components|hooks)\//.exec(target);
      if (privateMatch && privateMatch[1] !== owner) {
        report(file.path, 1, `不得跨页面引用 ${privateMatch[1]} 的私有 ${privateMatch[2]}：${spec}`);
      }
    }
  }

  return messages;
}

/** 递归读取项目 src 下的 .ts / .tsx 文件，返回相对路径与内容。 */
function scan(root = ROOT) {
  const files = [];
  const sourceDir = path.join(root, 'src');
  const walk = dir => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        files.push({
          path: path.relative(root, absolute).split(path.sep).join('/'),
          content: fs.readFileSync(absolute, 'utf8'),
        });
      }
    }
  };
  walk(sourceDir);
  return files;
}

if (require.main === module) {
  const files = scan();
  const messages = analyze(files);
  if (messages.length) {
    console.error(`前端模块化检查发现 ${messages.length} 个问题：`);
    for (const message of messages) console.error(`  ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`前端模块化检查通过：${files.length} 个文件，页面 ${new Set(files.map(f => pageOf(f.path)).filter(Boolean)).size} 个`);
  }
}

module.exports = { analyze, scan, componentNames, limitFor, LIMITS, LEGACY_ALLOWLIST, ROOT_TSX_ALLOWED };
