import { ArrowDownToLine, Loader2 } from 'lucide-react';

/** 拖拽导入遮罩与进度提示的属性。 */
interface DropOverlayProps {
  // 是否有文件正拖拽经过主窗口，为 true 时显示「松开，收进拾序」遮罩。
  dragOver: boolean;
  // 是否正在导入入口，为 true 时显示进度提示。
  importing: boolean;
}

/** 拖拽导入遮罩与进度提示：仅在拖拽经过或导入进行中渲染对应浮层。 */
export default function DropOverlay({ dragOver, importing }: DropOverlayProps) {
  return (
    <>
      {dragOver && (
        <div className="drop-overlay">
          <div>
            <ArrowDownToLine size={37} />
            <h2>松开，收进拾序</h2>
            <p>只添加入口，不移动或删除原始文件</p>
          </div>
        </div>
      )}
      {importing && (
        <div className="import-progress" role="status">
          <Loader2 className="spin" size={17} />
          正在导入入口…
        </div>
      )}
    </>
  );
}
