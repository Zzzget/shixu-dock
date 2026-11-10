import type { RefObject } from 'react';
import { Layers } from 'lucide-react';
import { isDesktop } from '../../../api';

/** 悬浮入口顶部胶囊按钮的属性。 */
interface DockCapsuleProps {
  // 面板当前是否展开，用于 aria-expanded 属性。
  expanded: boolean;
  // 是否为浏览器预览内嵌表面，决定标签文案与胶囊圆点显示。
  preview: boolean;
  // 胶囊按钮的 ref，供 Esc 收起面板后重新聚焦。
  capsuleRef: RefObject<HTMLButtonElement | null>;
  // 打开主界面的回调，由双击或 Enter 键触发。
  onOpenMain: () => void;
}

/** 悬浮入口顶部胶囊按钮：显示品牌标识，双击或按 Enter 打开主界面，单击不启动任何程序。 */
export default function DockCapsule({ expanded, preview, capsuleRef, onOpenMain }: DockCapsuleProps) {
  return (
    <button
      ref={capsuleRef}
      className="dock-capsule"
      aria-label="拾序悬浮入口，悬停展开最近应用，双击或按 Enter 打开主界面"
      aria-expanded={expanded}
      title={
        isDesktop
          ? '悬停展开 · 双击打开拾序'
          : '浏览器交互预览 · 不会启动真实程序；悬停展开，双击打开主界面'
      }
      onDoubleClick={() => {
        void onOpenMain();
      }}
      onKeyDown={event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          void onOpenMain();
        }
      }}>
      <span className="capsule-logo">
        <Layers size={17} strokeWidth={1.8} />
      </span>
      <span>{isDesktop || preview ? '拾序' : '拾序 · 演示'}</span>
      {(isDesktop || preview) && <span className="capsule-dot" />}
    </button>
  );
}
