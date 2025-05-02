const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readTemplateFile: () => ipcRenderer.invoke('read-template-file'),
  writeTemplateFile: (content) => ipcRenderer.invoke('write-template-file', content),
  showContextMenu: (templateId) => ipcRenderer.send('show-context-menu', templateId),
  onContextMenuAction: (callback) => ipcRenderer.on('context-menu-action', callback),
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
  saveFileDialog: (options) => ipcRenderer.invoke('save-file-dialog', options),
  readFileContent: (path) => ipcRenderer.invoke('read-file-content', path),
  writeFileContent: (path, content) => ipcRenderer.invoke('write-file-content', path, content),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path')
});