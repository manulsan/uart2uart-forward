/**
 * This file is used specifically for security reasons.
 * Here you can access Nodejs stuff and inject functionality into
 * the renderer thread (accessible there through the "window" object)
 *
 * WARNING!
 * If you import anything from node_modules, then make sure that the package is specified
 * in package.json > dependencies and NOT in devDependencies
 *
 * Example (injects window.myAPI.doAThing() into renderer thread):
 *
 *   import { contextBridge } from 'electron'
 *
 *   contextBridge.exposeInMainWorld('myAPI', {
 *     doAThing: () => {}
 *   })
 *
 * WARNING!
 * If accessing Node functionality (like importing @electron/remote) then in your
 * electron-main.ts you will need to set the following when you instantiate BrowserWindow:
 *
 * mainWindow = new BrowserWindow({
 *   // ...
 *   webPreferences: {
 *     // ...
 *     sandbox: false // <-- to be able to import @electron/remote in preload script
 *   }
 * }
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('serialAPI', {
  listPorts: () => ipcRenderer.invoke('serial:list'),
  open: (portId: number, portPath: string, baudRate?: number) =>
    ipcRenderer.invoke('serial:open', portId, portPath, baudRate),
  write: (portId: number, data: string) => ipcRenderer.invoke('serial:write', portId, data),
  close: (portId: number) => ipcRenderer.invoke('serial:close', portId),
  onData: (portId: number, callback: (data: string) => void) => {
    ipcRenderer.on(`serial:data:${portId}`, (_event, data) => callback(data));
  },
  removeDataListener: (portId: number) => {
    ipcRenderer.removeAllListeners(`serial:data:${portId}`);
  },
});

contextBridge.exposeInMainWorld('electronAPI', {
  quit: () => ipcRenderer.send('app:quit'),
  onMenuRefreshPorts: (callback: () => void) => {
    ipcRenderer.removeAllListeners('menu:refresh-ports');
    ipcRenderer.on('menu:refresh-ports', () => callback());
  },
  onMenuLoadConfig: (callback: () => void) => {
    ipcRenderer.removeAllListeners('menu:load-config');
    ipcRenderer.on('menu:load-config', () => callback());
  },
  onMenuSaveConfig: (callback: () => void) => {
    ipcRenderer.removeAllListeners('menu:save-config');
    ipcRenderer.on('menu:save-config', () => callback());
  },
  onMenuUartMode: (callback: (mode: string) => void) => {
    ipcRenderer.removeAllListeners('menu:uart-mode');
    ipcRenderer.on('menu:uart-mode', (_event, mode) => callback(mode));
  },
  saveConfig: (config: { dataPrefix: string; dataSuffix: string }) =>
    ipcRenderer.invoke('config:save', config),
  loadConfig: () => ipcRenderer.invoke('config:load'),
  saveMacros: (macros: unknown) => ipcRenderer.invoke('macros:save', macros),
  loadMacros: () => ipcRenderer.invoke('macros:load'),
});
