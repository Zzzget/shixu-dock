import { ArrowRight, ArrowUpRight, Clock3, LayoutGrid, Loader2 } from 'lucide-react';
import { isDesktop } from '../../../api';
import type { DockItem, DockState } from '../../../types';
import ItemIcon from '../../../components/ItemIcon';

/** 最近应用面板的属性。 */
interface RecentAppsPanelProps {
  // 最近使用的应用列表，最多 10 个、两行五列展示。
  apps: DockItem[];
  // 完整程序坞状态，用于区分「从第一个应用开始」与「正在读取应用…」空态。
  state?: DockState;
  // 全局加载态标识集合，用于禁用正在启动的应用按钮。
  busy: Set<string>;
  // 打开主界面的回调，供「打开拾序」与空态按钮使用。
  onOpenMain: () => void;
  /**
   * 启动某个最近应用的回调。
   * @param item 待启动的应用入口。
   */
  onLaunch: (item: DockItem) => void;
}

/** 悬浮入口展开后的最近应用面板：两行五列应用网格、演示提示、空态与快捷键说明。 */
export default function RecentAppsPanel({
  apps,
  state,
  busy,
  onOpenMain,
  onLaunch,
}: RecentAppsPanelProps) {
  return (
    <div className="dock-panel">
      <div className="dock-panel-heading">
        <span>
          <Clock3 size={14} />
          最近使用 <b>{apps.length}</b>
        </span>
        <button
          onClick={() => {
            void onOpenMain();
          }}>
          打开拾序
          <ArrowUpRight size={14} />
        </button>
      </div>
      {!isDesktop && <div className="dock-demo-note">浏览器交互预览 · 不会启动真实程序</div>}
      {apps.length ? (
        <div className="dock-app-grid">
          {apps.map(item => (
            <button
              className="dock-app"
              key={item.id}
              title={item.name}
              disabled={busy.has(`launch-${item.id}`)}
              onClick={() => {
                void onLaunch(item);
              }}>
              <ItemIcon item={item} small />
              <span>{item.name}</span>
              {busy.has(`launch-${item.id}`) && (
                <Loader2 size={12} className="spin dock-launching" />
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="dock-empty">
          <LayoutGrid size={25} />
          <strong>{state ? '从第一个应用开始' : '正在读取应用…'}</strong>
          <p>先在主界面添加并打开应用，它就会出现在这里。</p>
          <button
            className="text-button"
            onClick={() => {
              void onOpenMain();
            }}>
            打开主界面
            <ArrowRight size={13} />
          </button>
        </div>
      )}
      <div className="dock-panel-footer">
        <span>你的常用，随时就位</span>
        <kbd>Ctrl + Alt + Space</kbd>
      </div>
    </div>
  );
}
