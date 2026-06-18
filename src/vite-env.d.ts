/// <reference types="vite/client" />

interface Window {
  mnAPI: {
    selectProgram: () => Promise<string | null>
    selectFolder: () => Promise<string | null>
    getFileIcon: (filePath: string) => Promise<string | null>
    getAppVersion: () => Promise<string>

    loadPrograms: () => Promise<unknown | null>
    savePrograms: (programs: unknown) => Promise<boolean>
    launchProgram: (program: {
      path: string
      type: string
    }) => Promise<{
      success: boolean
      error?: string
    }>

    loadSettings: () => Promise<unknown | null>
    saveSettings: (settings: unknown) => Promise<boolean>
    loadDiaries: () => Promise<unknown | null>
    saveDiaries: (diaries: unknown) => Promise<boolean>
    setStartWithWindows: (enabled: boolean) => Promise<boolean>

    getAudioDevice: () => Promise<'speaker' | 'headphone' | null>
    setAudioDevice: (device: 'speaker' | 'headphone') => Promise<{
      success: boolean
      stdout: string
      stderr: string
      error?: string
    }>
    getMonitorOrientation: () => Promise<'horizontal' | 'vertical' | null>
    setMonitorOrientation: (orientation: 'horizontal' | 'vertical') => Promise<{
      success: boolean
      stdout: string
      stderr: string
      error?: string
    }>

    minimizeWindow: () => Promise<void>
    closeWindow: () => Promise<void>

    checkForUpdates: () => Promise<boolean>
    downloadUpdate: () => Promise<boolean>
    installUpdate: () => Promise<boolean>

    onUpdateAvailable: (
      callback: (info: { version: string }) => void,
    ) => () => void

    onUpdateProgress: (
      callback: (progress: { percent: number }) => void,
    ) => () => void

    onUpdateDownloaded: (
      callback: (info: { version: string }) => void,
    ) => () => void
  }
}