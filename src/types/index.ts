export type Page = 'home' | 'dashboard' | 'programs' | 'diary' | 'writeDiary' | 'todo' | 'playlist' | 'settings' | 'aiChat'
export type ProgramType = 'Program' | 'Folder' | 'URL'
export type LaunchDelay = '1 second' | '2 seconds' | '3 seconds' | '5 seconds'
export type LaunchBehavior = 'Launch in order' | 'Launch all at once'
export type Theme = 'Light' | 'Dark' | 'System' | 'Custom Wallpaper'
export type ResolvedTheme = 'light' | 'dark'
export type CustomWallpaperTheme = 'light' | 'dark'
export type PlaylistCoverTheme = 'light' | 'dark'
export type PlaylistCoverOverride = Partial<Record<PlaylistCoverTheme, string>>
export type PlaylistCoverOverrideMap = Record<string, string | PlaylistCoverOverride>
export type PlaylistCoverChangeResult = {
  theme: PlaylistCoverTheme
  coverUrl: string
}
export type WallpaperHistoryItem = {
  image: string
  name: string
  savedAt: string
}
export type WallpaperSelectResult = WallpaperHistoryItem | {
  error: 'unsupported-file-type'
  name: string
}
export type AccentColor = 'purple' | 'blue' | 'green' | 'orange' | 'red' | 'gray'
export type PlaylistViewMode = 'list' | 'grid'
export type FloatingPlayerMode = 'expanded' | 'minimized'
export type FloatingPlayerPosition = {
  x: number
  y: number
}

export type YoutubeMusicAccount = {
  signedIn: boolean
  email?: string | null
  name?: string | null
  picture?: string | null
  channelTitle?: string | null
}
export type LaunchStatus = 'waiting' | 'launching' | 'completed' | 'failed' | 'cancelled'
export type AudioDevice = 'speaker' | 'headphone'
export type MonitorOrientation = 'horizontal' | 'vertical'

export type HomeMusicPlaylist = {
  id: string
  name: string
  tracks: number
  mood?: string
  duration?: string
  thumbnail?: string
  customThumbnail?: string
}

export type PlaylistTrack = {
  id: string
  title: string
  artist: string
  duration: string
  coverClass?: string
  thumbnail?: string
}

export type ProgramItem = {
  id: string
  name: string
  path: string
  type: ProgramType
  iconClass: string
  icon: string
  iconImage?: string | null
  enabled: boolean
  presets?: number[]
}

export type AppSettings = {
  startWithWindows: boolean
  minimizeToTray: boolean
  checkForUpdates: boolean
  launchDelay: LaunchDelay
  launchBehavior: LaunchBehavior
  stopLaunchingOnError: boolean
  theme: Theme
  customWallpaper?: string | null
  customWallpaperName?: string | null
  customWallpaperTheme?: CustomWallpaperTheme
  customWallpaperHistory?: WallpaperHistoryItem[]
  accentColor: AccentColor
  musicVolume?: number
  musicPlaylistOrder?: string[]
  playlistViewMode?: PlaylistViewMode
  floatingPlayerMode?: FloatingPlayerMode
  floatingPlayerHidden?: boolean
  floatingPlayerPosition?: FloatingPlayerPosition | null
  sidebarCollapsed?: boolean
  lastTrack?: {
    videoId: string
    title: string
    artist: string
    thumbnail: string
    playlistId: string
  } | null
}

export type DiaryEntry = {
  date: string
  content: string
  createdAt: string
  updatedAt: string
}

export type CalendarSchedule = {
  id: string
  date: string
  title: string
  time?: string
  color?: 'red' | 'blue' | 'green' | 'orange' | 'purple' | 'gray'
  createdAt: string
  updatedAt: string
}


export type TodoPriority = 'high' | 'medium' | 'low'
export type TodoFilter = 'all' | 'today' | 'upcoming' | 'completed'

export type TodoTask = {
  id: string
  title: string
  description?: string
  dueDate?: string
  priority: TodoPriority
  reminderEnabled: boolean
  completed: boolean
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}


export type AIChatCharacterId = 'cheong' | 'noah'

export type AIEmotion =
  | 'default'
  | 'smile'
  | 'joy'
  | 'sleepy'
  | 'surprised'
  | 'shy'
  | 'pout'
  | 'sad'
  | 'soft-sad'
  | 'gloomy'
  | 'angry-small'
  | 'done'

export type AIChatSpeaker = AIChatCharacterId

export type AIChatRequestMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AIChatStoredMessage = {
  id: string
  sender: 'user' | 'ai'
  text: string
  timestamp: number
  characterId?: AIChatCharacterId
  emotion?: AIEmotion
  speaker?: AIChatSpeaker
}

export type AIChatHistoryPayload = {
  messages: AIChatStoredMessage[]
  emotion: AIEmotion
}

export type AICommandTargetHint = 'latest' | 'matched' | 'selected' | 'today'

export type AICalendarCreateCommand = {
  type: 'calendar.create'
  payload: {
    title: string
    date: string | null
    time?: string | null
    color?: CalendarSchedule['color'] | null
  }
}

export type AICalendarUpdateCommand = {
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

export type AICalendarDeleteCommand = {
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

export type AITodoCreateCommand = {
  type: 'todo.create'
  payload: {
    title: string
    description?: string | null
    dueDate?: string | null
    priority?: TodoPriority | null
    reminderEnabled?: boolean | null
  }
}

export type AITodoUpdateCommand = {
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

export type AITodoDeleteCommand = {
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

export type AICommand =
  | AICalendarCreateCommand
  | AICalendarUpdateCommand
  | AICalendarDeleteCommand
  | AITodoCreateCommand
  | AITodoUpdateCommand
  | AITodoDeleteCommand

export type AIChatContext = {
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

export type AIChatAPIResult = {
  success: true
  emotion: AIEmotion
  message: string
  messages: Array<{
    speaker: AIChatSpeaker
    emotion?: AIEmotion | null
    message: string
  }>
  action?: 'ask' | 'execute' | 'error'
  commands?: AICommand[]
  missingFields?: string[]
} | {
  success: false
  error: string
}
