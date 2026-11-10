#!/usr/bin/env node
'use strict';

/**
 * 类型注释规则检查器（项目约定，勿删除）。
 *
 * 权威规则见项目根目录 CODE_STYLE.md 与 AGENTS.md；本文件只负责自动执行检查。
 * 1. 每个 type / interface / enum 声明必须有紧邻的中文注释，说明用途。
 * 2. 声明内每一项（字段、方法、枚举值、联合类型的字面量分支）都必须有单独注释。
 * 3. 带参数的签名（函数类型别名、接口方法）必须在注释中用 @param 逐项说明参数。
 * 4. 新增或修改类型时同步维护注释；`npm run build` 与 `npm test` 都会执行本检查。
 *
 * 用法：node scripts/check-type-comments.cjs [额外文件或目录...]
 * 默认递归检查项目内的 .ts / .tsx，跳过 node_modules、dist、release、test-results。
 */

const fs = require('node:fs');
const path = require('node:path');

const DECL_RE = /^\s*(?:export\s+)?(?:declare\s+)?(type|interface|enum)\s+([A-Za-z_$][\w$]*)\b/;
const MEMBER_RE = /^\s*(?:readonly\s+)?(?:[A-Za-z_$][\w$]*|'[^']+'|"[^"]+"|\[[^\]]+\])\s*\??\s*(?::|\(|=)/;
const UNION_BRANCH_RE = /^\s*\|?\s*(?:'[^']+'|"[^"]+"|[A-Za-z_$][\w$]*)\s*(?:\||;|,|$)/;
const SKIP_DIRS = new Set(['node_modules', 'dist', 'release', 'test-results', '.git', '.vite']);

/** 去掉每行注释，只保留代码，用于括号配对；同时保留跨行块注释状态。 */
function codeLinesOf(lines) {
  let inBlock = false;
  return lines.map(line => {
    let out = '';
    let index = 0;
    while (index < line.length) {
      if (inBlock) {
        const end = line.indexOf('*/', index);
        if (end === -1) return out;
        inBlock = false;
        index = end + 2;
        continue;
      }
      const lineComment = line.indexOf('//', index);
      const blockComment = line.indexOf('/*', index);
      if (lineComment !== -1 && (blockComment === -1 || lineComment < blockComment)) {
        out += line.slice(index, lineComment);
        return out;
      }
      if (blockComment !== -1) {
        out += line.slice(index, blockComment);
        const end = line.indexOf('*/', blockComment + 2);
        if (end === -1) {
          inBlock = true;
          return out;
        }
        index = end + 2;
        continue;
      }
      out += line.slice(index);
      return out;
    }
    return out;
  });
}

/** 计算每一行是否已有「紧邻前置注释」或「行尾注释」。 */
function documentationOf(lines, codeLines) {
  const pureComment = codeLines.map((code, i) => code.trim() === '' && lines[i].trim() !== '');
  const leading = [];
  const trailing = [];
  lines.forEach((line, i) => {
    let cursor = i - 1;
    let hasText = false;
    while (cursor >= 0 && pureComment[cursor]) {
      const text = lines[cursor].replace(/[\s/*]/g, '');
      if (text) hasText = true;
      cursor -= 1;
    }
    leading[i] = hasText;
    const marker = line.indexOf('//');
    trailing[i] =
      !pureComment[i] && marker !== -1 && line.slice(marker + 2).trim().length > 0;
  });
  return { documented: lines.map((_, i) => leading[i] || trailing[i]), leading };
}

/** 收集某行紧邻的前置注释文本，用于统计 @param。 */
function leadingCommentText(lines, codeLines, lineIndex) {
  const collected = [];
  let cursor = lineIndex - 1;
  while (cursor >= 0 && codeLines[cursor].trim() === '' && lines[cursor].trim() !== '') {
    collected.unshift(lines[cursor]);
    cursor -= 1;
  }
  return collected.join('\n');
}

/** 统计签名顶层参数个数（忽略嵌套括号、泛型中的逗号）。 */
function parameterCount(signature) {
  const open = signature.indexOf('(');
  if (open === -1) return 0;
  let depth = 0;
  let commas = 0;
  let hasContent = false;
  let lastComma = -1;
  let closeIndex = -1;
  for (let i = open; i < signature.length; i += 1) {
    const char = signature[i];
    if (char === '(') depth += 1;
    else if (char === ')') {
      depth -= 1;
      if (depth === 0) {
        closeIndex = i;
        break;
      }
    } else if (char === ',' && depth === 1) {
      commas += 1;
      lastComma = i;
    } else if (depth === 1 && !/[\s,()]/.test(char)) hasContent = true;
  }
  // 多行签名的尾随逗号（success?: string,）不代表额外参数。
  if (lastComma !== -1 && closeIndex !== -1 && signature.slice(lastComma + 1, closeIndex).trim() === '') {
    commas -= 1;
  }
  return hasContent ? commas + 1 : 0;
}

/**
 * 检查单份源码，返回 { issues, declarations }。
 * @param {string} source 源码文本
 * @param {string} filename 用于报错定位的文件名
 */
function checkSource(source, filename = 'inline.ts') {
  const lines = source.split(/\r?\n/);
  const codeLines = codeLinesOf(lines);
  const { documented } = documentationOf(lines, codeLines);
  const issues = [];
  let declarations = 0;

  const report = (lineIndex, message) => {
    issues.push({ file: filename, line: lineIndex + 1, message });
  };

  lines.forEach((line, index) => {
    const match = DECL_RE.exec(line);
    if (!match) return;
    const kind = match[1];
    const name = match[2];
    declarations += 1;

    if (!documented[index]) report(index, `类型 ${name} 缺少声明注释（说明用途）`);

    // 定位声明对应的花括号块；没有花括号时定位分号结束行。
    let depth = 0;
    let blockStart = -1;
    let blockEnd = -1;
    let statementEnd = index;
    for (let cursor = index; cursor < lines.length; cursor += 1) {
      const code = codeLines[cursor];
      for (const char of code) {
        if (char === '{') {
          depth += 1;
          if (depth === 1 && blockStart === -1) blockStart = cursor;
        } else if (char === '}') {
          depth -= 1;
          if (depth === 0 && blockStart !== -1) {
            blockEnd = cursor;
            break;
          }
        }
      }
      if (blockEnd !== -1) break;
      if (blockStart === -1 && code.includes(';')) {
        statementEnd = cursor;
        break;
      }
      statementEnd = cursor;
    }

    const commentText = leadingCommentText(lines, codeLines, index);
    const paramTags = (commentText.match(/@param\b/g) || []).length;

    if (blockStart !== -1 && blockEnd !== -1) {
      // 对象／枚举块：逐项检查顶层成员。
      let nested = 1;
      for (let cursor = blockStart + 1; cursor < blockEnd; cursor += 1) {
        const code = codeLines[cursor];
        if (nested === 1 && code.trim() && MEMBER_RE.test(code) && !documented[cursor]) {
          const field = code.trim().split(/\s*[:(=]/, 1)[0].trim();
          report(cursor, `类型 ${name} 的 ${kind === 'enum' ? '枚举值' : '成员'} ${field} 缺少注释`);
        }
        if (nested === 1 && code.trim() && MEMBER_RE.test(code) && code.includes('(')) {
          const params = parameterCount(code);
          if (params > 0) {
            const ownComment = leadingCommentText(lines, codeLines, cursor);
            const ownTags = (ownComment.match(/@param\b/g) || []).length;
            if (ownTags < params) {
              report(cursor, `类型 ${name} 的方法 ${fieldOf(code)} 需用 @param 注释全部 ${params} 个参数`);
            }
          }
        }
        for (const char of code) {
          if (char === '{') nested += 1;
          else if (char === '}') nested -= 1;
        }
      }
      return;
    }

    const signature = codeLines.slice(index, statementEnd + 1).join(' ');
    if (signature.includes('=>')) {
      // 函数类型别名：参数逐项用 @param 说明。
      const params = parameterCount(signature);
      if (params > 0 && paramTags < params) {
        report(index, `类型 ${name} 需用 @param 注释全部 ${params} 个参数`);
      }
      return;
    }

    // 联合类型别名：每个字面量分支单独注释。
    for (let cursor = index; cursor <= statementEnd; cursor += 1) {
      const code = codeLines[cursor];
      if (cursor === index) {
        // 联合分支必须逐行展开：写在同一行时无法为每个分支单独写注释。
        const afterEqual = code.slice(code.indexOf('=') + 1).trim();
        if (/['"]/.test(afterEqual) || /(^|\s)\|(\s|$)/.test(afterEqual)) {
          report(cursor, `类型 ${name} 的联合分支写在声明行，请拆行并为每个分支单独注释`);
        }
        continue;
      }
      if (UNION_BRANCH_RE.test(code) && code.trim() && !documented[cursor]) {
        report(cursor, `类型 ${name} 的联合类型分支 ${code.trim()} 缺少注释`);
      }
    }
  });

  return { issues, declarations };
}

function fieldOf(code) {
  const match = /^\s*([A-Za-z_$][\w$]*)/.exec(code);
  return match ? match[1] : '<匿名>';
}

/** 递归收集待检查的 TS / TSX 文件。 */
function collectFiles(target, projectRoot, output) {
  const absolute = path.resolve(projectRoot, target);
  if (!fs.existsSync(absolute)) return;
  const stat = fs.statSync(absolute);
  if (stat.isFile()) {
    if (/\.tsx?$/.test(absolute)) output.push(absolute);
    return;
  }
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      collectFiles(path.join(absolute, entry.name), projectRoot, output);
    } else if (/\.tsx?$/.test(entry.name)) {
      output.push(path.join(absolute, entry.name));
    }
  }
}

function runCli() {
  const projectRoot = path.resolve(__dirname, '..');
  const targets = process.argv.slice(2);
  const files = [];
  if (targets.length) targets.forEach(target => collectFiles(target, process.cwd(), files));
  else collectFiles(projectRoot, projectRoot, files);

  const issues = [];
  let declarations = 0;
  files.forEach(file => {
    const result = checkSource(fs.readFileSync(file, 'utf8'), path.relative(projectRoot, file));
    declarations += result.declarations;
    issues.push(...result.issues);
  });

  if (issues.length) {
    issues.forEach(issue => console.error(`${issue.file}:${issue.line} ${issue.message}`));
    console.error(`\n类型注释检查失败：${issues.length} 处缺少注释（${files.length} 个文件，${declarations} 个类型声明）。`);
    process.exitCode = 1;
    return;
  }
  console.log(`类型注释检查通过：${files.length} 个文件，${declarations} 个类型声明，每一项均有注释。`);
}

module.exports = { checkSource, collectFiles, parameterCount };

if (require.main === module) runCli();
