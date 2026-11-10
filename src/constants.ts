import { Clock3, LayoutGrid, Layers, Terminal } from 'lucide-react';
import type { ItemKind, TaskInfo } from './types';
import type { Section, SectionInfo } from './lib/app-types';

/** 入口类型到中文标签的映射，用于编辑表单的类型选择器与卡片角标。 */
export const kindLabels: Record<ItemKind, string> = {
  // 应用程序或 .lnk 快捷方式。
  app: '应用',
  // 单个文件。
  file: '文件',
  // 文件夹。
  folder: '文件夹',
  // 项目目录。
  project: '项目',
};

/** 分区到展示文案的映射，覆盖导航标签、页面主标题与描述。 */
export const sectionInfo: Record<Section, SectionInfo> = {
  // 最近使用分区的文案。
  recent: {
    label: '最近使用',
    title: '常用的，触手可及。',
    description: '少一点寻找，多一点专注。从这里继续你的日常。',
  },
  // 应用库分区的文案。
  library: {
    label: '应用库',
    title: '让每个工具，各就其位。',
    description: '应用、文件与文件夹，收进一个轻盈的工作空间。',
  },
  // 项目空间分区的文案。
  projects: {
    label: '项目空间',
    title: '下一段灵感，从这里开始。',
    description: '打开编辑器、运行开发脚本，把注意力留给创造。',
  },
  // 快捷命令分区的文案。
  commands: {
    label: '快捷命令',
    title: '熟悉的脚本，一键启程。',
    description: '这里只运行项目里的 npm 脚本，不执行任意 Shell 命令。',
  },
  // 偏好设置分区的文案。
  settings: {
    label: '偏好设置',
    title: '按照你的习惯，刚刚好。',
    description: '调整一点细节，让拾序更懂你的工作节奏。',
  },
};

/** 任务生命周期状态到中文标签的映射，用于日志面板与状态条展示。 */
export const taskLabels: Record<TaskInfo['status'], string> = {
  // 已发起启动，正在准备进程与工作目录。
  starting: '进程启动中',
  // 进程正在运行，日志持续输出。
  running: '进程运行中',
  // 已发出停止信号，正在结束进程及其子进程。
  stopping: '正在停止',
  // 用户主动停止，任务已结束。
  stopped: '已停止',
  // 进程自行退出。
  exited: '进程已退出',
  // 启动或执行过程中出错。
  error: '运行异常',
};

/** 左侧主导航项，绑定分区 id 与对应的图标组件。 */
export const navItems = [
  { id: 'recent', icon: Clock3 },
  { id: 'library', icon: LayoutGrid },
  { id: 'projects', icon: Layers },
  { id: 'commands', icon: Terminal },
] as const;
