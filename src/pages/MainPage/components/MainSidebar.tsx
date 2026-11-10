import { Layers, Settings2, Sparkles } from 'lucide-react';
import { navItems, sectionInfo } from '../../../constants';
import type { Section } from '../../../lib/app-types';

/** 主界面左侧导航栏的属性。 */
interface MainSidebarProps {
  // 当前选中的分区，用于高亮对应导航项。
  section: Section;
  // 最近使用应用数量，显示在「最近使用」导航项右侧的两位数字。
  recentCount: number;
  /**
   * 切换分区的回调。
   * @param next 目标分区。
   */
  onChangeSection: (next: Section) => void;
}

/** 主界面左侧导航栏：四个内容分区、提示卡片、偏好设置入口与版本信息。 */
export default function MainSidebar({ section, recentCount, onChangeSection }: MainSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="workspace-label">我的工作空间</div>
      <nav aria-label="主导航">
        {navItems.map(({ id, icon: Icon }) => (
          <button
            key={id}
            className={`nav-item ${section === id ? 'active' : ''}`}
            aria-current={section === id ? 'page' : undefined}
            onClick={() => onChangeSection(id)}>
            <Icon size={18} strokeWidth={1.7} />
            <span>{sectionInfo[id].label}</span>
            {id === 'recent' && (
              <span className="nav-count">{recentCount.toString().padStart(2, '0')}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="sidebar-tip">
        <span className="tip-icon">
          <Sparkles size={17} />
        </span>
        <strong>轻一点，专注一点。</strong>
        <p>
          把常用入口收在一起，
          <br />
          让灵感不再被寻找打断。
        </p>
        <span className="tip-decoration" aria-hidden="true">
          <Sparkles size={37} strokeWidth={1} />
        </span>
      </div>
      <div className="sidebar-bottom">
        <button
          className={`nav-item ${section === 'settings' ? 'active' : ''}`}
          aria-current={section === 'settings' ? 'page' : undefined}
          onClick={() => onChangeSection('settings')}>
          <Settings2 size={18} strokeWidth={1.7} />
          <span>偏好设置</span>
        </button>
        <div className="sidebar-version">
          <span className="mini-brand">
            <Layers size={13} />
            拾序
          </span>
          <span>本地 · 轻盈 · 有序</span>
        </div>
      </div>
    </aside>
  );
}
