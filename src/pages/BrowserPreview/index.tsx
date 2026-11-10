import { ChevronRight, Monitor, MousePointer2 } from 'lucide-react';
import type { DockController } from '../../lib/app-types';
import DockPage from '../DockPage';

/** 浏览器预览桌面壳的属性。 */
interface BrowserPreviewProps {
  // 程序坞控制器，提供预览展开状态、悬浮入口所需的状态与回调。
  controller: DockController;
}

/** 浏览器交互预览的桌面壳：顶部预览标识、悬浮入口演示浮层与延迟说明，不启动真实程序。 */
export default function BrowserPreview({ controller }: BrowserPreviewProps) {
  const { state, previewOpen, togglePreview } = controller;
  return (
    <>
      <div className="preview-header">
        <div className="preview-label">
          <span className="preview-status-dot" />
          <Monitor size={15} />
          <strong>浏览器交互预览</strong>
          <span>不会启动真实程序</span>
        </div>
        <button
          className={`preview-toggle ${previewOpen ? 'active' : ''}`}
          onClick={togglePreview}>
          <MousePointer2 size={14} />
          {previewOpen ? '收起悬浮预览' : '预览悬浮入口'}
          <ChevronRight size={14} />
        </button>
      </div>
      {previewOpen && (
        <section className="preview-desktop" aria-label="演示桌面与悬浮入口">
          <span className="preview-desktop-tag">
            <Monitor size={13} />
            悬浮入口交互区域
          </span>
          <DockPage controller={controller} preview />
          <div className="preview-desktop-help">
            <span>移入展开</span>
            <span>移出收起</span>
            <span>双击回到主界面</span>
            <span>
              当前延迟 {state?.settings.hoverDelay ?? 180} / {state?.settings.hideDelay ?? 450} ms
            </span>
          </div>
        </section>
      )}
    </>
  );
}
