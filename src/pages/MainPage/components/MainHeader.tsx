import { Layers, Minus, X } from 'lucide-react';

/** 主界面标题栏的属性。 */
interface MainHeaderProps {
  // 窗口操作是否处于加载态，为 true 时禁用最小化与关闭按钮。
  windowBusy: boolean;
  // 最小化主界面的回调。
  onMinimize: () => void;
  // 收起主界面、保留悬浮入口的回调。
  onHide: () => void;
}

/** 主界面标题栏：品牌标识、本地工作空间标识与窗口控制按钮。 */
export default function MainHeader({ windowBusy, onMinimize, onHide }: MainHeaderProps) {
  return (
    <header className="titlebar">
      <div className="title-brand">
        <span className="brand-symbol">
          <Layers size={19} strokeWidth={1.6} />
        </span>
        <strong>拾序</strong>
        <span className="brand-divider" />
        <span>把日常，安放有序</span>
      </div>
      <div className="window-controls">
        <span className="local-only">
          <span />
          本地工作空间
        </span>
        <button
          className="window-button"
          aria-label="最小化主界面"
          title="最小化"
          disabled={windowBusy}
          onClick={onMinimize}>
          <Minus size={16} />
        </button>
        <button
          className="window-button close-window"
          aria-label="关闭主界面并保留悬浮入口"
          title="收起到悬浮入口，不退出程序"
          disabled={windowBusy}
          onClick={onHide}>
          <X size={16} />
        </button>
      </div>
    </header>
  );
}
