import { useDockController } from './hooks/useDockController';
import ToastTray from './components/ToastTray';
import DockPage from './pages/DockPage';
import MainPage from './pages/MainPage';

/** 应用视图类型：由 URL 的 view 参数判定，决定渲染悬浮入口页面还是主界面页面。 */
type AppView =
  // ?view=dock：透明悬浮窗口，只显示顶部胶囊与最近应用面板。
  | 'dock'
  // 默认视图：完整工作空间，浏览器环境下额外显示交互预览桌面壳。
  | 'main';

/** 拾序应用根组件：判定视图环境、调用控制器并组合悬浮入口页面或主界面页面。 */
export default function App() {
  const view: AppView =
    new URLSearchParams(window.location.search).get('view') === 'dock' ? 'dock' : 'main';
  const dockView = view === 'dock';
  const controller = useDockController(dockView);
  if (dockView)
    return (
      <>
        <DockPage controller={controller} />
        <ToastTray toasts={controller.toasts} dockView dismiss={controller.dismiss} />
      </>
    );
  return <MainPage controller={controller} />;
}
