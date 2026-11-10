import { ArrowUpRight, Layers } from 'lucide-react';
import { isDesktop } from '../../api';
import { activeTask } from '../../lib/dock-utils';
import type { DockController } from '../../lib/app-types';
import ItemModal from '../../components/ItemModal';
import LogPanel from '../../components/LogPanel';
import ToastTray from '../../components/ToastTray';
import BrowserPreview from '../BrowserPreview';
import MainSidebar from './components/MainSidebar';
import MainHeader from './components/MainHeader';
import MainContent from './components/MainContent';
import StatusBar from './components/StatusBar';
import DropOverlay from './components/DropOverlay';
import RemoveEntryDialog from './components/RemoveEntryDialog';
import TaskListDialog from './components/TaskListDialog';

/** 主界面页面的属性。 */
interface MainPageProps {
  // 程序坞控制器，提供全部状态、派生数据与事件回调。
  controller: DockController;
}

/** 主界面页面：组合浏览器预览桌面壳、主窗口、状态栏、拖拽遮罩与各类弹窗。 */
export default function MainPage({ controller }: MainPageProps) {
  const {
    state,
    tasks,
    section,
    info,
    search,
    toasts,
    busy,
    loadError,
    itemModal,
    removeTarget,
    logId,
    previewMainHidden,
    allTasksOpen,
    dragOver,
    apps,
    library,
    baseItems,
    groups,
    allGroups,
    query,
    effectiveGroup,
    shownItems,
    runningTasks,
    notify,
    dismiss,
    load,
    changeSection,
    changeSearch,
    changeGroup,
    openItemModal,
    closeItemModal,
    openRemoveDialog,
    closeRemoveDialog,
    openLog,
    closeLog,
    openTasks,
    closeTasks,
    openPreviewMain,
    mainWindowAction,
    launchItem,
    pinItem,
    runProject,
    openFolderItem,
    stopProjectItem,
    itemBusy,
    saveItem,
    saveSettings,
    pickPath,
    onQuit,
    confirmRemove,
    drop,
    onDragEnter,
    onDragLeave,
    onDragOver,
  } = controller;
  const clearFilter = () => {
    changeSearch('');
    changeGroup('全部');
  };
  const goProjects = () => {
    closeTasks();
    changeSection('projects');
  };
  return (
    <div className={isDesktop ? 'desktop-layout' : 'browser-layout'}>
      {!isDesktop && <BrowserPreview controller={controller} />}
      {!isDesktop && previewMainHidden ? (
        <section className="preview-hidden">
          <span className="large-empty-icon">
            <Layers size={30} />
          </span>
          <h2>收起界面，留住专注。</h2>
          <p>双击上方悬浮入口，或点击下方按钮回到主界面。</p>
          <button className="button primary" onClick={openPreviewMain}>
            打开拾序
            <ArrowUpRight size={16} />
          </button>
        </section>
      ) : (
        <div
          className="main-window"
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={drop}>
          <MainHeader
            windowBusy={busy.has('window')}
            onMinimize={() => mainWindowAction('minimize')}
            onHide={() => mainWindowAction('hide')}
          />
          <div className="workspace">
            <MainSidebar
              section={section}
              recentCount={apps.length}
              onChangeSection={changeSection}
            />
            <MainContent
              state={state}
              tasks={tasks}
              section={section}
              info={info}
              loadError={loadError}
              loadBusy={busy.has('load')}
              warning={state?.warning}
              search={search}
              baseItems={baseItems}
              groups={groups}
              query={query}
              effectiveGroup={effectiveGroup}
              shownItems={shownItems}
              libraryCount={library.length}
              busy={busy}
              onRetry={() => {
                void load();
              }}
              onChangeSearch={changeSearch}
              onChangeGroup={changeGroup}
              openItemModal={openItemModal}
              onClearFilter={clearFilter}
              onGoLibrary={() => changeSection('library')}
              onLaunch={launchItem}
              onRemove={openRemoveDialog}
              onPin={pinItem}
              onFolder={openFolderItem}
              onRun={runProject}
              onStop={stopProjectItem}
              onLogs={item => openLog(item.id)}
              itemBusy={itemBusy}
              saveSettings={saveSettings}
              pickPath={pickPath}
              onQuit={onQuit}
            />
          </div>
          <StatusBar
            itemCount={state?.items.length ?? 0}
            runningCount={runningTasks.length}
            onOpenTasks={openTasks}
          />
          <DropOverlay dragOver={dragOver} importing={busy.has('import')} />
        </div>
      )}
      {!isDesktop && (
        <div className="browser-footnote">
          <Layers size={13} />
          <span>拾序 · 给你的桌面，留一点呼吸感。</span>
          <span>真实桌面能力在 Electron 中启用</span>
        </div>
      )}
      <ToastTray toasts={toasts} dockView={false} dismiss={dismiss} />
      {itemModal && (
        <ItemModal
          item={itemModal.item}
          initialKind={itemModal.kind}
          groups={allGroups}
          onSave={saveItem}
          onClose={closeItemModal}
          notify={notify}
          defaultEditor={state?.settings.defaultEditorPath ?? ''}
          pickPath={pickPath}
        />
      )}
      {removeTarget && (
        <RemoveEntryDialog
          item={removeTarget}
          busy={busy.has(`item-${removeTarget.id}`)}
          taskActive={activeTask(tasks[removeTarget.id])}
          onClose={closeRemoveDialog}
          onRemove={confirmRemove}
        />
      )}
      {logId && (
        <LogPanel
          task={tasks[logId]}
          item={state?.items.find(item => item.id === logId)}
          onClose={closeLog}
        />
      )}
      {allTasksOpen && (
        <TaskListDialog
          tasks={Object.values(tasks)}
          items={state?.items ?? []}
          onClose={closeTasks}
          onOpenLog={openLog}
          onGoProjects={goProjects}
        />
      )}
    </div>
  );
}
