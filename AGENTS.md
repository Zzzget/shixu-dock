# AGENTS.md

本仓库的 AI 编码助手入口文件。在 `shixu-dock` 中**生成或修改任何代码前**先读本文件；规则的完整说明、正反例与检查方式见 [CODE_STYLE.md](./CODE_STYLE.md)。

## 强制一：类型注释规则（用户明确要求）

每次生成的代码中，`type` 里定义的类型，**每一项都必须有注释说明**：

1. 每个 `type` / `interface` / `enum` / 类型别名 / JSDoc `@typedef` 声明，必须有紧邻的中文注释说明用途。
2. 声明内部每一项都必须单独注释：字段、方法、函数参数、枚举值、联合类型的每个字面量分支。
3. 联合类型拆行书写，每个分支独占一行并单独注释；不要写 `type X = 'a' | 'b';`。
4. 带参数的签名在声明注释里用 `@param` 逐项说明参数。
5. 注释用中文，写清语义、取值范围、单位、约束，不要只复述字段名。
6. 新增或修改类型时同步维护注释，禁止留下无注释的新成员。

检查器 `scripts/check-type-comments.cjs`，回归测试 `tests/type-comments.test.cjs`。

## 强制二：前端分模块（用户明确要求）

写前端代码要**分模块**：每个页面一个文件夹；功能比较复杂的模块必须拆出独立文件，封装成 React 组件。

1. 页面放 `src/pages/<PascalCase>/index.tsx`，页面私有组件放同目录 `components/`，禁止写成 `src/FooPage.tsx`，禁止被其他页面 import 私有组件。
2. 复杂模块必须拆：超过 150 行、有独立 UI 且带自身状态/副作用/多个事件处理、重复出现 2 次以上、或文件超过 300 行——满足任一条就拆成独立 `.tsx` 组件。
3. 一个 `.tsx` 文件只放一个主组件；props 用显式类型并逐项中文注释；通过 props 回调通信。
4. 文件上限：`pages/`、`components/`、`hooks/` ≤ 300 行；`lib/`、`api.ts`、`types.ts`、`constants.ts` ≤ 400 行；`App.tsx` / `main.tsx` ≤ 120 行。`App.tsx` 只做环境判定、调用 hook、组合页面。
5. 状态与副作用放 `hooks/`，桌面 API 调用集中在 `api.ts` / hooks；展示组件通过 props 拿数据。
6. 保持既有 className 契约（玻璃样式依赖），样式统一写在 `src/styles.css`。

检查器 `scripts/check-frontend-modules.cjs`，回归测试 `tests/frontend-modules.test.cjs`。存量豁免只允许登记在检查器的 `LEGACY_ALLOWLIST`，**新文件不得加入**。

## 强制三：ESLint 与验证

- `eslint.config.mjs` 是唯一 ESLint 配置：2 空格缩进、单引号（JSX 双引号）、分号、多行尾逗号、末尾换行、无行尾空格。
- **验证是硬性步骤**：生成或修改代码后必须运行 `npm run lint`（类型注释 + 模块化 + ESLint），零 error 才算完成。
- `npm run lint:fix` 只自动修复格式，不会补类型注释；`npm test` 与 `npm run build` 都会先执行 lint，漏注释、未拆分模块或格式违规会直接失败。

## 项目基本约束

- 纯本地 Windows 桌面应用（Electron + React + TypeScript + Vite），不接云服务、不上传数据。
- 不扫描、移动或删除用户桌面上的原始文件；只保存路径与启动信息。
- 项目运行仅限用户配置的 npm 脚本名，不执行任意 Shell 命令；运行前需原生确认。
- 渲染进程关闭 Node 权限并保持上下文隔离；命令执行集中在主进程并校验参数。
