import { useState } from 'react';
import { AppWindow, Code2, FileText, Folder } from 'lucide-react';
import type { DockItem } from '../types';

/** 入口图标的属性。 */
interface ItemIconProps {
  // 需要展示图标的入口，按 kind 选择占位图标或自定义 data URL 图标。
  item: DockItem;
  // 是否使用小尺寸图标，用于胶囊、项目卡片与弹窗预览。
  small?: boolean;
}

/** 展示单个入口的图标：优先使用安全的 data URL 图标，加载失败时回退到按类型选择的占位图标。 */
export default function ItemIcon({ item, small = false }: ItemIconProps) {
  const [failedIcon, setFailedIcon] = useState<string>();
  const Icon =
    item.kind === 'project'
      ? Code2
      : item.kind === 'folder'
        ? Folder
        : item.kind === 'file'
          ? FileText
          : AppWindow;
  const color = [...item.id].reduce((value, character) => value + character.charCodeAt(0), 0) % 6;
  const safeIcon = item.icon && /^data:image\//i.test(item.icon) && failedIcon !== item.icon;
  return (
    <span className={`item-icon color-${color} ${small ? 'small' : ''}`} aria-hidden="true">
      {safeIcon ? (
        <img src={item.icon} alt="" onError={() => setFailedIcon(item.icon)} />
      ) : (
        <Icon size={small ? 22 : 29} strokeWidth={1.6} />
      )}
    </span>
  );
}
