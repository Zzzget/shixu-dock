import { AlertCircle, ArrowDownToLine } from 'lucide-react';
import { isDesktop } from '../../../api';

/** 内容区底部说明的属性。 */
interface ContentNotesProps {
  // 是否显示 npm 脚本运行提示，项目空间与快捷命令分区为 true。
  showNpmNotice: boolean;
}

/** 内容区底部说明：npm 脚本限制提示与拖拽导入整理提示。 */
export default function ContentNotes({ showNpmNotice }: ContentNotesProps) {
  return (
    <>
      {showNpmNotice && (
        <div className="npm-notice">
          <AlertCircle size={15} />
          <span>
            仅运行 <code>npm run &lt;脚本名&gt;</code>。每次运行需系统确认，请先安装
            Node.js / npm 及项目依赖。
          </span>
        </div>
      )}
      <div className="organize-note">
        <span className="note-icon">
          <ArrowDownToLine size={18} />
        </span>
        <div>
          <strong>拖进来，就整理好了。</strong>
          <p>
            {isDesktop
              ? '拖入应用、快捷方式、文件或文件夹，快速添加入口。'
              : '可以体验拖拽导入；演示仅记录文件名，不读取或启动文件。'}
          </p>
        </div>
        <span className="note-badge">本地保存</span>
      </div>
    </>
  );
}
