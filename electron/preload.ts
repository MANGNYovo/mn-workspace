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
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),

  loadPrograms: () => ipcRenderer.invoke('programs:load'),
  savePrograms: (programs: unknown) => ipcRenderer.invoke('programs:save', programs),
  launchProgram: (program: { path: string; type: string }) =>
    ipcRenderer.invoke('program:launch', program),

  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (settings: unknown) => ipcRenderer.invoke('settings:save', settings),
  loadDiaries: () => ipcRenderer.invoke('diaries:load'),
  saveDiaries: (diaries: unknown) => ipcRenderer.invoke('diaries:save', diaries),
  loadLikedTracks: () => ipcRenderer.invoke('liked-tracks:load'),
  saveLikedTracks: (trackIds: string[]) => ipcRenderer.invoke('liked-tracks:save', trackIds),

  // YouTube
  isYoutubeMusicAuthenticated: () => ipcRenderer.invoke('youtube-music:is-authenticated'),
  loginYoutubeMusic: () => ipcRenderer.invoke('youtube-music:login'),
  logoutYoutubeMusic: () => ipcRenderer.invoke('youtube-music:logout'),
  getYoutubeMusicAccount: () => ipcRenderer.invoke('youtube-music:get-account'),
  getYoutubeMusicPlaylists: () => ipcRenderer.invoke('youtube-music:get-playlists'),
  getYoutubeMusicLikedSongs: () => ipcRenderer.invoke('youtube-music:get-liked-songs'),
  getYoutubeMusicPlaylistTracks: (playlistId: string) =>
    ipcRenderer.invoke('youtube-music:get-playlist-tracks', playlistId),
  loadYoutubeMusicTrackCache: () =>
    ipcRenderer.invoke('youtube-music:load-track-cache'),
  saveYoutubeMusicTrackCache: (cache: unknown) =>
    ipcRenderer.invoke('youtube-music:save-track-cache', cache),
  loadYoutubeMusicPlaylistCovers: () =>
    ipcRenderer.invoke('youtube-music:load-playlist-covers'),
  changeYoutubeMusicPlaylistCover: (playlistId: string) =>
    ipcRenderer.invoke('youtube-music:change-playlist-cover', playlistId),

  setStartWithWindows: (enabled: boolean) =>
    ipcRenderer.invoke('settings:set-start-with-windows', enabled),

  getAudioDevice: () => ipcRenderer.invoke('device:get-audio'),
  setAudioDevice: (device: 'speaker' | 'headphone') =>
    ipcRenderer.invoke('device:set-audio', device),
  getMonitorOrientation: () => ipcRenderer.invoke('device:get-monitor'),
  setMonitorOrientation: (orientation: 'horizontal' | 'vertical') =>
    ipcRenderer.invoke('device:set-monitor', orientation),

  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),

  checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download-update'),
  installUpdate: () => ipcRenderer.invoke('updater:install-update'),

  onUpdateAvailable: (callback: (info: { version: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, info: { version: string }) => {
      callback(info)
    }

    ipcRenderer.on('updater:update-available', listener)

    return () => {
      ipcRenderer.removeListener('updater:update-available', listener)
    }
  },

  onUpdateProgress: (callback: (progress: { percent: number }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: { percent: number }) => {
      callback(progress)
    }

    ipcRenderer.on('updater:download-progress', listener)

    return () => {
      ipcRenderer.removeListener('updater:download-progress', listener)
    }
  },

  onUpdateDownloaded: (callback: (info: { version: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, info: { version: string }) => {
      callback(info)
    }

    ipcRenderer.on('updater:update-downloaded', listener)

    return () => {
      ipcRenderer.removeListener('updater:update-downloaded', listener)
    }
  },
})
