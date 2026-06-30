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

type YoutubeMusicAccount = {
  signedIn: boolean
  email?: string | null
  name?: string | null
  picture?: string | null
  channelTitle?: string | null
}

type PlaylistCoverTheme = 'light' | 'dark'
type PlaylistCoverOverride = Partial<Record<PlaylistCoverTheme, string>>
type PlaylistCoverChangeResult = {
  theme: PlaylistCoverTheme
  coverUrl: string
}


type AIChatCharacterId = 'cheong' | 'noah'
type AIEmotion = 'default' | 'smile' | 'joy' | 'sleepy' | 'surprised' | 'shy' | 'pout' | 'sad' | 'soft-sad' | 'gloomy' | 'angry-small' | 'done'
type TodoPriority = 'high' | 'medium' | 'low'
type AICommandTargetHint = 'latest' | 'matched' | 'selected' | 'today'
type AICommand =
  | {
      type: 'calendar.create'
      payload: {
        title: string
        date: string | null
        time?: string | null
        color?: 'red' | 'blue' | 'green' | 'orange' | 'purple' | 'gray' | null
      }
    }
  | {
      type: 'calendar.update'
      payload: {
        id?: string | null
        targetId?: string | null
        targetTitle?: string | null
        targetDate?: string | null
        targetHint?: AICommandTargetHint | null
        title?: string | null
        date?: string | null
        time?: string | null
        newTitle?: string | null
        newDate?: string | null
        newTime?: string | null
      }
    }
  | {
      type: 'calendar.delete'
      payload: {
        id?: string | null
        targetId?: string | null
        targetTitle?: string | null
        targetDate?: string | null
        targetHint?: AICommandTargetHint | null
        title?: string | null
        date?: string | null
      }
    }
  | {
      type: 'todo.create'
      payload: {
        title: string
        description?: string | null
        dueDate?: string | null
        priority?: TodoPriority | null
        reminderEnabled?: boolean | null
      }
    }
  | {
      type: 'todo.update'
      payload: {
        id?: string | null
        targetId?: string | null
        targetTitle?: string | null
        targetDueDate?: string | null
        targetHint?: AICommandTargetHint | null
        title?: string | null
        newTitle?: string | null
        description?: string | null
        dueDate?: string | null
        priority?: TodoPriority | null
        reminderEnabled?: boolean | null
        completed?: boolean | null
      }
    }
  | {
      type: 'todo.delete'
      payload: {
        id?: string | null
        targetId?: string | null
        targetTitle?: string | null
        targetDueDate?: string | null
        targetHint?: AICommandTargetHint | null
        title?: string | null
        dueDate?: string | null
      }
    }

type AIChatContext = {
  currentDate: string
  currentDateTime: string
  selectedScheduleDate?: string
  schedules: Array<{
    id: string
    title: string
    date: string
    time?: string
    createdAt: string
    updatedAt: string
  }>
  todos: Array<{
    id: string
    title: string
    description?: string
    dueDate?: string
    priority: TodoPriority
    completed: boolean
    createdAt: string
    updatedAt: string
  }>
}

interface Window {
  mnAPI: {
    selectProgram: () => Promise<string | null>
    selectFolder: () => Promise<string | null>
    selectWallpaper: () => Promise<{ image: string; name: string; savedAt: string } | null>
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

    loadAIChatHistory: (characterId?: AIChatCharacterId) => Promise<{
      messages: Array<{
        id: string
        sender: 'user' | 'ai'
        text: string
        timestamp: number
        characterId?: AIChatCharacterId
        emotion?: AIEmotion
        speaker?: AIChatCharacterId
      }>
      emotion: AIEmotion
    }>
    saveAIChatHistory: (characterId: AIChatCharacterId, history: {
      messages: Array<{
        id: string
        sender: 'user' | 'ai'
        text: string
        timestamp: number
        characterId?: AIChatCharacterId
        emotion?: AIEmotion
        speaker?: AIChatCharacterId
      }>
      emotion: AIEmotion
    }) => Promise<boolean>
    clearAIChatHistory: (characterId?: AIChatCharacterId) => Promise<boolean>
    sendAIChatMessage: (
      characterId: AIChatCharacterId,
      messages: Array<{ role: 'user' | 'assistant'; content: string }>,
      context?: AIChatContext,
    ) => Promise<{
      success: true
      emotion: AIEmotion
      message: string
      messages: Array<{
        speaker: AIChatCharacterId
        emotion?: AIEmotion | null
        message: string
      }>
      action?: 'ask' | 'execute' | 'error'
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
