import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertCircle, Check, FolderOpen, Loader2 } from 'lucide-react';
import { isDesktop, validScript } from '../api';
import type { DockItem, ItemDraft, ItemKind } from '../types';
import { kindLabels } from '../constants';
import { errorText } from '../lib/dock-utils';
import type { Notify } from '../lib/app-types';
import Modal from './Modal';

/** 新增／编辑入口弹窗的属性。 */
interface ItemModalProps {
  // 可选：被编辑的入口；缺省表示新建入口。
  item?: DockItem;
  // 新建入口时默认选中的入口类型。
  initialKind: ItemKind;
  // 可选的分组名称列表，用于分组输入框的 datalist 联想。
  groups: string[];
  /**
   * 保存入口草稿的回调，返回是否保存成功。
   * @param draft 待保存的入口草稿。
   */
  onSave: (draft: ItemDraft) => Promise<boolean>;
  // 关闭弹窗的回调，取消或保存成功后调用。
  onClose: () => void;
  // 统一提示函数，用于校验错误与浏览器预览提示。
  notify: Notify;
  // 偏好设置中的默认编辑器路径，作为项目编辑器输入框的占位提示。
  defaultEditor: string;
  /**
   * 打开系统路径选择对话框，失败时已由控制器展示错误提示。
   * @param kind 选择目标类别：app、file、folder 或 editor。
   * @param browserHint 浏览器预览中未取得路径时展示的提示文案。
   */
  pickPath: (kind: 'app' | 'file' | 'folder' | 'editor', browserHint: string) => Promise<string | null>;
}

/** 新增／编辑入口表单弹窗：按类型显示不同字段，校验 npm 脚本名并支持浏览本机路径。 */
export default function ItemModal({
  item,
  initialKind,
  groups,
  onSave,
  onClose,
  notify,
  defaultEditor,
  pickPath,
}: ItemModalProps) {
  const [draft, setDraft] = useState<ItemDraft>({
    id: item?.id,
    kind: item?.kind ?? initialKind,
    name: item?.name ?? '',
    path: item?.path ?? '',
    group: item?.group ?? '',
    editorPath: item?.editorPath ?? '',
    script: item?.script ?? 'dev',
    pinned: item?.pinned ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState<'path' | 'editorPath'>();
  const formId = useId();
  const update = <K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) =>
    setDraft(previous => ({ ...previous, [key]: value }));
  const pick = async (field: 'path' | 'editorPath') => {
    setPicking(field);
    const kind =
      field === 'editorPath' ? 'editor' : draft.kind === 'project' ? 'folder' : draft.kind;
    const path = await pickPath(kind, '浏览器不能选择本机程序路径，请手动填写示例路径。');
    if (path) {
      setDraft(previous => ({
        ...previous,
        [field]: path,
        name:
          field === 'path' && !previous.name
            ? path
              .split(/[\\/]/)
              .filter(Boolean)
              .pop()
              ?.replace(/\.(exe|lnk)$/i, '') || ''
            : previous.name,
      }));
    }
    setPicking(undefined);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || picking) return;
    if (draft.kind === 'project' && !validScript(draft.script?.trim() || 'dev')) {
      notify('请只填写 npm 脚本名，例如 dev、start 或 build:watch；不要输入整条命令。', 'error');
      return;
    }
    setSaving(true);
    try {
      if (
        await onSave({
          ...draft,
          name: draft.name.trim(),
          path: draft.path.trim(),
          group: draft.group.trim() || '未分组',
          script: draft.kind === 'project' ? draft.script?.trim() || 'dev' : undefined,
        })
      )
        onClose();
    } catch (error) {
      notify(errorText(error), 'error');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      title={item ? '编辑入口' : '添加一个新入口'}
      onClose={onClose}
      busy={saving || Boolean(picking)}>
      <form onSubmit={submit} className="item-form">
        <fieldset disabled={saving || Boolean(picking)} className="form-fields">
          <div className="kind-picker" role="group" aria-label="入口类型">
            {(Object.keys(kindLabels) as ItemKind[]).map(kind => (
              <button
                key={kind}
                type="button"
                className={draft.kind === kind ? 'selected' : ''}
                aria-pressed={draft.kind === kind}
                onClick={() => update('kind', kind)}>
                {kindLabels[kind]}
              </button>
            ))}
          </div>
          <label>
            名称
            <input
              required
              maxLength={100}
              autoFocus
              value={draft.name}
              placeholder="给它一个好记的名字"
              onChange={event => update('name', event.target.value)}
            />
          </label>
          <label>
            {draft.kind === 'project' ? '项目目录' : '本机路径'}
            <span className="input-with-button">
              <input
                required
                value={draft.path}
                placeholder={
                  draft.kind === 'project' ? 'D:/Projects/my-project' : '填写完整路径，或从本机选择'
                }
                onChange={event => update('path', event.target.value)}
              />
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  void pick('path');
                }}>
                {picking === 'path' ? (
                  <Loader2 className="spin" size={15} />
                ) : (
                  <FolderOpen size={15} />
                )}
                浏览
              </button>
            </span>
          </label>
          <label>
            分组<span className="optional">可选</span>
            <input
              list={`${formId}-groups`}
              value={draft.group}
              maxLength={40}
              placeholder="例如：设计创作、开发工具"
              onChange={event => update('group', event.target.value)}
            />
          </label>
          <datalist id={`${formId}-groups`}>
            {groups.map(group => (
              <option key={group} value={group} />
            ))}
          </datalist>
          {draft.kind !== 'app' && (
            <label>
              {draft.kind === 'project' ? '编辑器路径' : '指定打开程序'}
              <span className="optional">可选</span>
              <span className="input-with-button">
                <input
                  value={draft.editorPath}
                  placeholder={
                    draft.kind === 'project'
                      ? defaultEditor || '留空自动查找 VS Code'
                      : '留空使用系统默认方式；或选择 .exe'
                  }
                  onChange={event => update('editorPath', event.target.value)}
                />
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => {
                    void pick('editorPath');
                  }}>
                  <FolderOpen size={15} />
                  浏览
                </button>
              </span>
            </label>
          )}
          {draft.kind === 'project' && (
            <>
              <label>
                npm 脚本
                <span className="script-input">
                  <code>npm run</code>
                  <input
                    aria-label="npm 脚本名称"
                    value={draft.script}
                    placeholder="dev"
                    maxLength={100}
                    onChange={event => update('script', event.target.value)}
                  />
                </span>
              </label>
              <p className="form-help">
                <AlertCircle size={14} />
                每次运行由系统确认。请先安装 Node.js / npm，并在项目中准备好依赖；不支持任意 Shell
                命令。
              </p>
            </>
          )}
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={draft.pinned}
              onChange={event => update('pinned', event.target.checked)}
            />
            <span>
              置顶这个入口<span className="field-note">在应用库或项目列表中优先显示</span>
            </span>
          </label>
        </fieldset>
        {!isDesktop && <p className="demo-form-note">演示数据仅保存到浏览器，不会访问这些路径。</p>}
        <div className="modal-footer">
          <button
            type="button"
            className="button secondary"
            disabled={saving || Boolean(picking)}
            onClick={onClose}>
            取消
          </button>
          <button type="submit" className="button primary" disabled={saving || Boolean(picking)}>
            {saving ? <Loader2 size={16} className="spin" /> : <Check size={16} />}保存入口
          </button>
        </div>
      </form>
    </Modal>
  );
}
