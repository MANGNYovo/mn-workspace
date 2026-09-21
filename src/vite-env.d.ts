/// <reference types="vite/client" />

type YoutubeMusicPlaylist = {
  id: string
  name: string
  tracks: number
  thumbnail: string
}

type YoutubeMusicTrack = {
  id: string
  title: string
  artist: string
  duration: string
  thumbnail: string
}

type YoutubeMusicAccount = import('./types').YoutubeMusicAccount

type PlaylistCoverTheme = import('./types').PlaylistCoverTheme
type PlaylistCoverOverride = import('./types').PlaylistCoverOverride
type PlaylistCoverChangeResult = import('./types').PlaylistCoverChangeResult


type AICommand = import('./types').AICommand
type AIChatContext = import('./types').AIChatContext

interface Window {
  mnAPI: {
    selectProgram: () => Promise<string | null>
    selectFolder: () => Promise<string | null>
    selectWallpaper: () => Promise<{ image: string; name: string; savedAt: string } | null>
    selectShortcutIcon: () => Promise<string | null>
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
    loadCalendarSchedules: () => Promise<unknown | null>
    saveCalendarSchedules: (schedules: unknown) => Promise<boolean>
    loadTodoTasks: () => Promise<unknown | null>
    saveTodoTasks: (tasks: unknown) => Promise<boolean>
    listVocabularyDates: () => Promise<string[]>
    loadVocabularyDate: (dateKey: string) => Promise<unknown | null>
    saveVocabularyDate: (dateKey: string, words: unknown) => Promise<boolean>
    checkVocabularyMeaning: (payload: {
      word: string
      correctMeaning: string
      answer: string
    }) => Promise<{
      success: true
      isCorrect: boolean
    } | {
      success: false
      error: string
    }>
    showSystemNotification: (options: { title: string; body?: string }) => Promise<boolean>
    loadLikedTracks: () => Promise<string[] | null>
    saveLikedTracks: (trackIds: string[]) => Promise<boolean>

    isYoutubeMusicAuthenticated: () => Promise<boolean>
    loginYoutubeMusic: () => Promise<boolean>
    logoutYoutubeMusic: () => Promise<boolean>
    getYoutubeMusicAccount: () => Promise<YoutubeMusicAccount | null>
    getYoutubeMusicPlaylists: () => Promise<YoutubeMusicPlaylist[] | null>
    getYoutubeMusicLikedSongs: () => Promise<YoutubeMusicTrack[] | null>
    getYoutubeMusicPlaylistTracks: (playlistId: string) => Promise<YoutubeMusicTrack[] | null>
    loadYoutubeMusicTrackCache: () => Promise<Record<string, YoutubeMusicTrack[]> | null>
    saveYoutubeMusicTrackCache: (cache: unknown) => Promise<boolean>
    loadYoutubeMusicPlaylistCovers: () => Promise<Record<string, string | PlaylistCoverOverride> | null>
    changeYoutubeMusicPlaylistCover: (playlistId: string, theme: PlaylistCoverTheme) => Promise<PlaylistCoverChangeResult | null>

    loadAIChatHistory: () => Promise<{
      messages: Array<{
        id: string
        sender: 'user' | 'ai'
        text: string
        timestamp: number
      }>
    }>
    saveAIChatHistory: (history: {
      messages: Array<{
        id: string
        sender: 'user' | 'ai'
        text: string
        timestamp: number
      }>
    }) => Promise<boolean>
    clearAIChatHistory: () => Promise<boolean>
    sendAIChatMessage: (
      messages: Array<{ role: 'user' | 'assistant'; content: string }>,
      context?: AIChatContext,
    ) => Promise<{
      success: true
      message: string
      action?: 'ask' | 'execute' | 'answer' | 'error'
      commands?: AICommand[]
      missingFields?: string[]
    } | {
      success: false
      error: string
    }>

    setStartWithWindows: (enabled: boolean) => Promise<boolean>

    getAudioDevice: () => Promise<'speaker' | 'headphone' | null>
    setAudioDevice: (device: 'speaker' | 'headphone') => Promise<{
      success: boolean
      stdout: string
      stderr: string
      error?: string
    }>
    onAudioDeviceChanged: (
      callback: (device: 'speaker' | 'headphone') => void,
    ) => () => void
    onSettingsChanged: (
      callback: (settings: unknown) => void,
    ) => () => void
    getMonitorOrientation: () => Promise<'horizontal' | 'vertical' | null>
    setMonitorOrientation: (orientation: 'horizontal' | 'vertical') => Promise<{
      success: boolean
      stdout: string
      stderr: string
      error?: string
    }>

    minimizeWindow: () => Promise<void>
    closeWindow: () => Promise<void>
    setMinimalWindowMode: (enabled: boolean) => Promise<boolean>

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
