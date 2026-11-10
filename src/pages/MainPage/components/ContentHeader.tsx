import { AlertCircle, ChevronRight, Layers, Settings2 } from 'lucide-react';
import { isDesktop } from '../../../api';
import type { Section, SectionInfo } from '../../../lib/app-types';

/** 主内容区顶部标题与状态横幅的属性。 */
interface ContentHeaderProps {
  // 当前分区的展示文案。
  info: SectionInfo;
  // 当前分区，决定 eyebrow 文案与右上角装饰图标。
  section: Section;
  // 读取状态失败的错误文案，为空表示无错误。
  loadError: string;
  // 状态读取是否处于加载态，为 true 时禁用「重试」按钮。
  loadBusy: boolean;
  // 可选：配置降级警告文案，存在时显示警告横幅。
  warning?: string;
  // 重新读取状态的回调，供错误横幅的「重试」按钮使用。
  onRetry: () => void;
}

/** 主内容区顶部：面包屑、演示标识、错误／警告横幅与页面标题装饰。 */
export default function ContentHeader({
  info,
  section,
  loadError,
  loadBusy,
  warning,
  onRetry,
}: ContentHeaderProps) {
  return (
    <>
      <div className="content-topline">
        <span className="breadcrumb">
          工作空间
          <ChevronRight size={12} />
          <strong>{info.label}</strong>
        </span>
        {!isDesktop && <span className="demo-badge">示例数据 · 仅供交互预览</span>}
      </div>
      {loadError && (
        <div className="error-banner" role="alert">
          <AlertCircle size={17} />
          <span>读取失败：{loadError}</span>
          <button className="text-button" disabled={loadBusy} onClick={onRetry}>
            重试
          </button>
        </div>
      )}
      {warning && (
        <div className="warning-banner">
          <AlertCircle size={15} />
          <span>{warning}</span>
        </div>
      )}
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {section === 'recent' ? '每一次开始，都从容一点' : info.label}
          </div>
          <h1>{info.title}</h1>
          <p>{info.description}</p>
        </div>
        <span className="heading-art" aria-hidden="true">
          {section === 'settings' ? (
            <Settings2 size={29} strokeWidth={1.2} />
          ) : (
            <Layers size={31} strokeWidth={1.2} />
          )}
        </span>
      </div>
    </>
  );
}
