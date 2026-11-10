import { useEffect, useId, useState } from 'react';
import { Check, Code2, FolderOpen, Loader2, Monitor, MousePointer2, Power } from 'lucide-react';
import { isDesktop } from '../api';
import type { Settings } from '../types';

/** 偏好设置表单的属性。 */
interface SettingsPanelProps {
  // 当前用户偏好设置，作为表单初始值并在外部变化时同步。
  settings: Settings;
  // 本地配置文件路径，展示在「配置保存位置」区域。
  configPath: string;
  /**
   * 保存偏好设置的回调，返回是否保存成功。
   * @param settings 经过界面校验的完整偏好设置对象。
   */
  onSave: (settings: Settings) => Promise<boolean>;
  // 全局加载态标识集合，用于禁用保存与退出按钮。
  busy: Set<string>;
  /**
   * 打开编辑器路径选择对话框，失败时已由控制器展示错误提示。
   * @param kind 固定传入 editor，表示选择编辑器可执行文件。
   * @param browserHint 浏览器预览中未取得路径时展示的提示文案。
   */
  pickPath: (kind: 'editor', browserHint: string) => Promise<string | null>;
  // 退出整个桌面程序的回调，仅真实 Electron 环境下展示该按钮。
  onQuit: () => void;
}

/** 偏好设置表单：默认编辑器、悬停延迟、开机启动与配置位置，含保存与退出操作。 */
export default function SettingsPanel({
  settings,
  configPath,
  onSave,
  busy,
  pickPath,
  onQuit,
}: SettingsPanelProps) {
  const [draft, setDraft] = useState(settings);
  const [picking, setPicking] = useState(false);
  const settingsId = useId();
  const { defaultEditorPath, hoverDelay, hideDelay, launchAtLogin } = settings;
  useEffect(() => {
    setDraft({ defaultEditorPath, hoverDelay, hideDelay, launchAtLogin });
  }, [defaultEditorPath, hoverDelay, hideDelay, launchAtLogin]);
  const pickEditor = async () => {
    setPicking(true);
    const path = await pickPath('editor', '浏览器无法浏览本机编辑器，请手动填写示例路径。');
    if (path) setDraft(previous => ({ ...previous, defaultEditorPath: path }));
    setPicking(false);
  };
  return (
    <form
      className="settings-form"
      onSubmit={event => {
        event.preventDefault();
        void onSave(draft);
      }}>
      <fieldset disabled={busy.has('settings') || picking} className="form-fields">
        <section className="settings-card">
          <div className="settings-section-title">
            <Code2 size={18} />
            <h3>工作环境</h3>
          </div>
          <label>
            默认编辑器
            <span className="field-note">项目可单独指定编辑器；此处选择编辑器的可执行文件。</span>
            <span className="input-with-button">
              <input
                value={draft.defaultEditorPath}
                placeholder="例如 C:/Program Files/Microsoft VS Code/Code.exe"
                onChange={event => setDraft({ ...draft, defaultEditorPath: event.target.value })}
              />
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  void pickEditor();
                }}>
                <FolderOpen size={15} />
                浏览
              </button>
            </span>
          </label>
        </section>
        <section className="settings-card">
          <div className="settings-section-title">
            <MousePointer2 size={18} />
            <h3>悬浮入口</h3>
          </div>
          <div className="delay-fields">
            <label>
              悬停展开延迟
              <span className="number-input">
                <input
                  type="number"
                  required
                  min={0}
                  max={2000}
                  step={1}
                  value={Number.isFinite(draft.hoverDelay) ? draft.hoverDelay : ''}
                  onChange={event => setDraft({ ...draft, hoverDelay: event.target.valueAsNumber })}
                />
                <span>毫秒</span>
              </span>
            </label>
            <label>
              移开收起延迟
              <span className="number-input">
                <input
                  type="number"
                  required
                  min={100}
                  max={3000}
                  step={1}
                  value={Number.isFinite(draft.hideDelay) ? draft.hideDelay : ''}
                  onChange={event => setDraft({ ...draft, hideDelay: event.target.valueAsNumber })}
                />
                <span>毫秒</span>
              </span>
            </label>
          </div>
          <p className="field-note">鼠标从胶囊移到面板不会立即收起。建议保留少许延迟，减少误触。</p>
          <div className="setting-row">
            <div>
              <strong>呼出主界面</strong>
              <p>固定全局快捷键，不占用你的日常操作。</p>
            </div>
            <kbd>Ctrl + Alt + Space</kbd>
          </div>
        </section>
        <section className="settings-card">
          <div className="settings-section-title">
            <Monitor size={18} />
            <h3>启动与存储</h3>
          </div>
          <div className="setting-row">
            <div id={`${settingsId}-login`}>
              <strong>登录 Windows 时启动</strong>
              <p>
                {isDesktop
                  ? '登录后让拾序安静地等候在桌面顶部。'
                  : '演示开关仅保存偏好，不会修改系统启动项。'}
              </p>
            </div>
            <button
              type="button"
              className={`switch ${draft.launchAtLogin ? 'on' : ''}`}
              role="switch"
              aria-checked={draft.launchAtLogin}
              aria-labelledby={`${settingsId}-login`}
              onClick={() => setDraft({ ...draft, launchAtLogin: !draft.launchAtLogin })}>
              <span />
            </button>
          </div>
          <div className="config-location">
            <span>配置保存位置</span>
            <code>{configPath}</code>
            <p>移除入口不会删除应用、项目或原始文件。</p>
          </div>
        </section>
      </fieldset>
      <div className="settings-footer">
        <button className="button primary" type="submit" disabled={busy.has('settings') || picking}>
          {busy.has('settings') ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
          保存偏好
        </button>
        {isDesktop ? (
          <button
            className="button ghost danger-text"
            type="button"
            disabled={busy.has('quit')}
            onClick={onQuit}>
            <Power size={15} />
            退出拾序
          </button>
        ) : (
          <span className="field-note">浏览器预览不控制真实桌面程序。</span>
        )}
      </div>
    </form>
  );
}
