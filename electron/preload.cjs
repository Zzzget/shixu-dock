'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');
const invoke = (name, ...args) => ipcRenderer.invoke('dock:' + name, ...args);
const subscribe = (channel, callback) => {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};
contextBridge.exposeInMainWorld('dock', {
  isDesktop: true,
  getState: () => invoke('getState'),
  saveItem: item => invoke('saveItem', item),
  removeItem: id => invoke('removeItem', id),
  pickPath: kind => invoke('pickPath', kind),
  importPaths: paths => invoke('importPaths', paths),
  droppedPaths: files =>
    Array.from(files)
      .map(file => webUtils.getPathForFile(file))
      .filter(Boolean),
  launch: id => invoke('launch', id),
  openFolder: id => invoke('openFolder', id),
  runProject: id => invoke('runProject', id),
  stopProject: id => invoke('stopProject', id),
  getTasks: () => invoke('getTasks'),
  saveSettings: settings => invoke('saveSettings', settings),
  setDockExpanded: expanded => invoke('setDockExpanded', expanded),
  showMain: () => invoke('showMain'),
  hideMain: () => invoke('hideMain'),
  minimizeMain: () => invoke('minimizeMain'),
  quit: () => invoke('quit'),
  onState: callback => subscribe('dock:state', callback),
  onTask: callback => subscribe('dock:task', callback),
  onDockReset: callback => subscribe('dock:reset', callback),
});
