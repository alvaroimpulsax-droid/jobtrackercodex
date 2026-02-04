const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('agentAPI', {
  getStatus: () => ipcRenderer.invoke('get-status'),
  setApiUrl: (url) => ipcRenderer.invoke('set-api-url', url),
  setAutoStart: (value) => ipcRenderer.invoke('set-auto-start', value),
  checkUpdates: () => ipcRenderer.invoke('check-updates'),
  login: (payload) => ipcRenderer.invoke('login', payload),
  logout: () => ipcRenderer.invoke('logout'),
  startTracking: () => ipcRenderer.invoke('start-tracking'),
  stopTracking: () => ipcRenderer.invoke('stop-tracking'),
  onUpdateStatus: (handler) => ipcRenderer.on('update-status', (_event, message) => handler(message)),
});
