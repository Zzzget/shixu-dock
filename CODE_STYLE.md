# 拾序 · 代码规范

本文件是项目的**权威规则**，随仓库一起提交。凡在本项目中手写或由 AI 生成、修改的代码，都适用以下约定。AI 编码助手请先阅读根目录的 `AGENTS.md`，再按本文件执行。

## 一、类型注释规则（强制）

> 用户明确要求：**每次生成的代码中，`type` 里定义的类型，每一项都必须有注释说明。**

### 适用范围

- `src/`、`electron/`、`scripts/`、`tests/` 以及后续新增目录中的全部代码。
- TypeScript 的 `type`、`interface`、`enum`、类型别名；CommonJS / JavaScript 中的 JSDoc `@typedef`。
- 新建文件与修改现有文件同等适用；新增成员必须同时新增注释。

### 具体要求

1. **声明本身**必须有一条紧邻的中文注释，说明这个类型的用途、使用场景或约束。
2. **声明内部每一项**都必须单独注释：
   - 对象字段（含可选字段）
   - 方法签名
   - 函数参数（在声明注释里用 `@param` 逐项说明）
   - 枚举值
   - 联合类型的每一个字面量分支
3. 联合类型建议**拆行书写**，每个分支独占一行并单独注释，不要写成 `type X = 'a' | 'b';`。
4. 注释使用中文，要写清**语义、取值范围、单位、约束、副作用**，不要只复述字段名（反例：`// 编号` 对应 `id: number` 且未说明来源与用途）。
5. 注释位置：紧邻上一行的 `//` 或 JSDoc 块，或同一行的行尾 `//` 注释。
6. 修改类型时同步维护注释，禁止留下无注释的新字段、新分支、新参数。

### 正例

```ts
/**
 * 入口类型：决定程序坞如何启动这一项，以及是否计入「最近使用」。
 * 仅允许以下四种取值，配置校验会拒绝其他字符串。
 */
export type ItemKind =
  // 应用程序或 .lnk 快捷方式：可启动，启动成功后写入最近使用记录。
  | 'app'
  // 项目目录：可运行 npm 脚本，不支持任意 Shell 命令。
  | 'project';

/** 程序坞中的一个入口，是本地配置里持久化保存的最小单位。 */
export interface DockItem {
  // 稳定唯一标识，由程序坞生成；编辑时保持不变。
  id: string;
  // 目标绝对路径：可执行文件、文件或项目根目录。
  path: string;
  // 可选：最近一次启动时间（Unix 毫秒），仅应用入口更新。
  lastOpenedAt?: number;
}

/**
 * 保存用户偏好设置。
 * @param settings 经过界面校验的完整偏好设置对象。
 */
saveSettings(settings: Settings): Promise<DockState>;
```

### 反例（会被自动检查拦截）

```ts
// ❌ 声明无注释、字段无注释、联合分支挤在一行
type Status = 'on' | 'off';
interface Config {
  id: string;
  delay: number;
}

// ❌ 带参数的方法没有 @param
interface API {
  /** 启动项目 */
  run(id: string): void;
}
```

## 二、前端模块化规则（强制）

> 用户明确要求：**写前端代码应该分模块，每个页面就是一个文件夹；功能比较复杂的模块必须分出一个文件，封装成 React 组件。**

### 目录结构

```
src/
├── App.tsx                 仅做环境判定 + 调用 hook + 组合页面
├── main.tsx / api.ts / types.ts / styles.css / constants.ts
├── pages/                  页面层：一个页面一个文件夹
│   ├── DockPage/
│   │   ├── index.tsx       页面入口（必须存在）
│   │   └── components/     仅本页使用的私有组件
│   ├── MainPage/
│   │   ├── index.tsx
│   │   └── components/
│   └── BrowserPreview/
├── components/             跨页面复用的展示 / 交互组件
├── hooks/                  可复用的状态与副作用（useXxx.ts）
└── lib/                    纯函数、类型定义、工具
```

### 具体要求

1. **页面**：每个页面独占 `src/pages/<PascalCase>/`，必须有 `index.tsx` 作为唯一入口；禁止把页面写成 `src/FooPage.tsx`。页面专属组件放同目录 `components/`，页面专属 hook 放同目录 `hooks/`；**页面私有组件不得被其他页面 import**。
2. **复杂模块必须拆分并封装成 React 组件**，满足以下任一条即触发：
   - 组件或函数超过 150 行；
   - 拥有独立 UI 区域，且带自身状态、副作用或多个事件处理；
   - 同一 UI 结构重复出现 2 次及以上；
   - 单个文件超过 300 行。
3. 拆出的组件：**一个 `.tsx` 文件只放一个主组件**，文件名 PascalCase；props 用显式 `interface` / `type` 声明并遵守第一章的逐项注释规则；通过 props 回调与父级通信，不直接修改上层状态。
4. **文件规模上限**（`npm run lint:modules` 自动检查）：
   - `pages/`、`components/`、`hooks/` 内每个文件 ≤ 300 行（含注释）；
   - `lib/`、`api.ts`、`types.ts`、`constants.ts` ≤ 400 行；
   - `App.tsx`、`main.tsx` ≤ 120 行。
   - 存量文件若暂时无法拆分，必须在 `scripts/check-frontend-modules.cjs` 的 `LEGACY_ALLOWLIST` 中登记并写明迁移原因；**禁止把新文件加进豁免清单**。
5. **职责分离**：状态、订阅、异步操作集中在 `hooks/`；展示组件尽量无副作用；桌面 API 调用集中在 `api.ts` 与 hooks，展示组件通过 props 拿数据与回调。
6. **命名**：页面 / 组件目录与文件用 PascalCase，hooks 用 `useXxx.ts`，工具与常量用 camelCase；样式统一写在 `src/styles.css`，改动 UI 时保持既有 className 契约（玻璃质感样式依赖这些类名）。

## 三、代码格式与 ESLint（强制）

- `eslint.config.mjs` 是唯一的 ESLint 配置（flat config），覆盖 `src/**/*.{ts,tsx}`、`vite.config.ts`、`electron/**/*.cjs`、`scripts/**/*.cjs`、`tests/**/*.cjs`。
- 规则来源：`@eslint/js` recommended、`typescript-eslint` recommended、`react-hooks`（`rules-of-hooks` 为 error、放在 `src` 下）、`@stylistic/eslint-plugin` 格式规则；CommonJS 脚本单独配置 Node 全局与 `sourceType: 'commonjs'`。
- 统一格式：2 空格缩进、字符串单引号（JSX 属性用双引号）、语句分号、多行结构尾逗号、文件末尾换行、无行尾空格、花括号同行走法、运算符两侧空格。
- 不启用会与 TypeScript 冲突的 `no-undef`；`@typescript-eslint/no-unused-vars` 允许以 `_` 开头的占位变量。
- 命令：
  - `npm run lint` = 类型注释检查 + 模块化检查 + ESLint；
  - `npm run lint:fix` 仅自动修复**格式**问题，不会补类型注释；
  - `npm run build` 与 `npm test` 都会**先执行** `npm run lint`，任一 error 会直接失败。
- 生成或修改代码后必须运行 `npm run lint` 并做到零 error，不要跳过验证。

## 四、自动检查与命令

| 检查              | 命令                                       | 实现                                                                                     |
| ----------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 类型注释          | `npm run lint:types`                       | `scripts/check-type-comments.cjs`                                                        |
| 前端模块化        | `npm run lint:modules`                     | `scripts/check-frontend-modules.cjs`                                                     |
| ESLint 格式与质量 | `npm run lint:eslint` / `npm run lint:fix` | `eslint.config.mjs`                                                                      |
| 全部检查          | `npm run lint`                             | 依次执行上面三项                                                                         |
| 单元测试          | `npm test`                                 | `tests/core.test.cjs`、`tests/type-comments.test.cjs`、`tests/frontend-modules.test.cjs` |
| 构建              | `npm run build`                            | lint → `tsc --noEmit` → `vite build`                                                     |

- `check-type-comments.cjs` 扫描项目内全部 `.ts` / `.tsx`，跳过 `node_modules`、`dist`、`release`、`test-results`；检查声明注释、成员/枚举值/联合分支注释、`@param` 覆盖。
- `check-frontend-modules.cjs` 检查页面目录与 `index.tsx`、根目录散落页面、文件规模、单文件组件数量、页面私有组件越界引用、hooks 命名；规则与阈值见本文件第二章。
- 两个检查器的正反例回归测试分别是 `tests/type-comments.test.cjs` 与 `tests/frontend-modules.test.cjs`；修改检查器时必须同步更新测试。
- 报错格式统一为 `文件:行号 说明`；按提示补注释或拆分文件后重新运行即可。

## 五、其他项目约定

- 这是纯本地 Windows 桌面应用（Electron + React + TypeScript + Vite），**不接入云服务、不上传用户数据**。
- 不扫描、移动或删除用户桌面的原始文件；程序坞只保存路径与启动信息。
- 项目运行只执行用户配置的 **npm 脚本名**，不拼接任意 Shell 命令；启动前需原生确认。
- 渲染进程关闭 Node 权限并保持上下文隔离；命令执行集中在主进程并校验参数。
