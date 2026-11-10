import { useCallback, useEffect, useRef, useState } from 'react';
import { api, isDesktop } from '../../api';
import type { DockItem } from '../../types';
import { errorText, recentApps } from '../../lib/dock-utils';
import type { DockController } from '../../lib/app-types';
import DockCapsule from './components/DockCapsule';
import RecentAppsPanel from './components/RecentAppsPanel';

/** 悬浮入口页面的属性。 */
interface DockPageProps {
  // 程序坞控制器，提供状态、提示、加载态与打开主界面回调。
  controller: DockController;
  // 是否为浏览器预览内嵌的演示表面；为 true 时不调用真实窗口调整能力。
  preview?: boolean;
}

/** 悬浮入口页面：胶囊按钮经悬停延迟展开最近应用面板，移出后延迟收起，?view=dock 与浏览器预览共用。 */
export default function DockPage({ controller, preview = false }: DockPageProps) {
  const { state, notify, busy, action, openPreviewMain } = controller;
  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef(false);
  const enterTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const capsuleRef = useRef<HTMLButtonElement>(null);
  const alive = useRef(true);
  const transition = useRef(Promise.resolve());
  const apps = recentApps(state);
  const clearTimers = useCallback(() => {
    clearTimeout(enterTimer.current);
    clearTimeout(leaveTimer.current);
    enterTimer.current = undefined;
    leaveTimer.current = undefined;
  }, []);
  const changeExpanded = useCallback(
    (value: boolean) => {
      clearTimers();
      if (expandedRef.current === value) return;
      expandedRef.current = value;
      if (!value || !isDesktop || preview) setExpanded(value);
      if (isDesktop && !preview) {
        // 串行调整窗口，避免快速划过时“展开”晚于“收起”完成。
        transition.current = transition.current
          .then(async () => {
            if (!alive.current || expandedRef.current !== value) return;
            try {
              await api.setDockExpanded(value);
              if (alive.current && expandedRef.current === value) setExpanded(value);
            } catch (error) {
              if (alive.current) {
                if (expandedRef.current === value) {
                  expandedRef.current = false;
                  setExpanded(false);
                }
                notify(`悬浮窗口操作失败：${errorText(error)}`, 'error');
              }
            }
          })
          .catch(error => {
            if (alive.current) notify(errorText(error), 'error');
          });
      }
    },
    [clearTimers, notify, preview],
  );
  useEffect(() => {
    alive.current = true;
    const off = api.onDockReset(() => {
      clearTimers();
      expandedRef.current = false;
      setExpanded(false);
    });
    const blur = () => changeExpanded(false);
    if (!preview) window.addEventListener('blur', blur);
    return () => {
      alive.current = false;
      clearTimers();
      off();
      window.removeEventListener('blur', blur);
    };
  }, [changeExpanded, clearTimers, preview]);
  useEffect(() => {
    clearTimers();
  }, [state?.settings.hoverDelay, state?.settings.hideDelay, clearTimers]);
  const enter = () => {
    clearTimers();
    if (!expandedRef.current)
      enterTimer.current = setTimeout(
        () => changeExpanded(true),
        state?.settings.hoverDelay ?? 180,
      );
  };
  const leave = () => {
    clearTimers();
    if (expandedRef.current)
      leaveTimer.current = setTimeout(
        () => changeExpanded(false),
        state?.settings.hideDelay ?? 450,
      );
  };
  const openMain = async () => {
    changeExpanded(false);
    if (isDesktop && !preview) await action('show-main', () => api.showMain());
    else openPreviewMain();
  };
  const launch = async (item: DockItem) => {
    const done = await action(
      `launch-${item.id}`,
      () => api.launch(item.id),
      isDesktop ? `已请求打开 ${item.name}` : `演示：已选择 ${item.name}，不会启动真实程序。`,
    );
    if (done && isDesktop) changeExpanded(false);
  };
  const triggerOpenMain = () => {
    void openMain();
  };
  return (
    <div
      className={`dock-surface ${expanded ? 'is-expanded' : ''} ${preview ? 'in-preview' : ''}`}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) enter();
      }}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) leave();
      }}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          changeExpanded(false);
          capsuleRef.current?.focus();
        }
      }}>
      <DockCapsule
        expanded={expanded}
        preview={preview}
        capsuleRef={capsuleRef}
        onOpenMain={triggerOpenMain}
      />
      {expanded && (
        <RecentAppsPanel
          apps={apps}
          state={state}
          busy={busy}
          onOpenMain={triggerOpenMain}
          onLaunch={item => {
            void launch(item);
          }}
        />
      )}
    </div>
  );
}
