import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Loader2, MoreHorizontal, Pencil, Pin, Trash2 } from 'lucide-react';
import type { DockItem } from '../types';
import { kindLabels } from '../constants';
import ItemIcon from './ItemIcon';

/** 应用／文件／文件夹入口卡片的属性。 */
interface AppCardProps {
  // 卡片对应的入口。
  item: DockItem;
  // 该入口是否处于加载态，为 true 时禁用启动与更多操作按钮。
  busy: boolean;
  // 启动入口的回调。
  onLaunch: () => void;
  // 编辑入口的回调。
  onEdit: () => void;
  // 请求移除入口的回调，交给二次确认弹窗处理。
  onRemove: () => void;
  // 切换置顶状态的回调。
  onPin: () => void;
}

/** 应用库中的入口卡片：点击主体启动，右上角菜单提供置顶、编辑与移除操作。 */
export default function AppCard({ item, busy, onLaunch, onEdit, onRemove, onPin }: AppCardProps) {
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const dismiss = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setMenu(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenu(false);
        ref.current?.querySelector<HTMLButtonElement>('.more-button')?.focus();
      }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [menu]);
  return (
    <article className={`app-card ${menu ? 'menu-open' : ''}`}>
      <div className="app-card-top">
        <span className="item-kind">{kindLabels[item.kind]}</span>
        <div className="card-quick-actions">
          {item.pinned && <Pin size={12} className="pinned-mark" aria-label="已置顶" />}
          <div
            className="menu-anchor"
            ref={ref}
            onBlur={event => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setMenu(false);
            }}>
            <button
              className="icon-button more-button"
              aria-label={`${item.name} 的更多操作`}
              aria-expanded={menu}
              disabled={busy}
              onClick={() => setMenu(!menu)}>
              <MoreHorizontal size={18} />
            </button>
            {menu && (
              <div className="card-menu" aria-label={`${item.name} 操作`}>
                <button
                  onClick={() => {
                    setMenu(false);
                    onPin();
                  }}>
                  <Pin size={14} />
                  {item.pinned ? '取消置顶' : '置顶入口'}
                </button>
                <button
                  onClick={() => {
                    setMenu(false);
                    onEdit();
                  }}>
                  <Pencil size={14} />
                  编辑入口
                </button>
                <button
                  className="danger-text"
                  onClick={() => {
                    setMenu(false);
                    onRemove();
                  }}>
                  <Trash2 size={14} />
                  移除入口
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <button
        className="app-launch"
        title={`打开 ${item.name}\n${item.path}`}
        disabled={busy}
        onClick={onLaunch}>
        <ItemIcon item={item} />
        <strong>{item.name}</strong>
        <span>{item.group || '未分组'}</span>
        <span className="launch-arrow">
          {busy ? <Loader2 size={14} className="spin" /> : <ArrowUpRight size={14} />}
        </span>
      </button>
    </article>
  );
}
