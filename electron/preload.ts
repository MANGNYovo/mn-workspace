import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },

  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },

  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },

  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})

contextBridge.exposeInMainWorld('mnAPI', {
  selectProgram: () => ipcRenderer.invoke('dialog:select-program'),
  selectFolder: () => ipcRenderer.invoke('dialog:select-folder'),
  getFileIcon: (filePath: string) => ipcRenderer.invoke('file:get-icon', filePath),

  loadPrograms: () => ipcRenderer.invoke('programs:load'),
  savePrograms: (programs: unknown) => ipcRenderer.invoke('programs:save', programs),
  launchProgram: (program: { path: string; type: string }) =>
    ipcRenderer.invoke('program:launch', program),

  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (settings: unknown) => ipcRenderer.invoke('settings:save', settings),
  setStartWithWindows: (enabled: boolean) =>
    ipcRenderer.invoke('settings:set-start-with-windows', enabled),

  setAudioDevice: (device: 'speaker' | 'headphone') =>
    ipcRenderer.invoke('device:set-audio', device),
  setMonitorOrientation: (orientation: 'horizontal' | 'vertical') =>
    ipcRenderer.invoke('device:set-monitor', orientation),

  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
})