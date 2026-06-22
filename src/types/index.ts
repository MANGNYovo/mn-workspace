export type Page = 'home' | 'dashboard' | 'programs' | 'diary' | 'writeDiary' | 'playlist' | 'settings'
export type ProgramType = 'Program' | 'Folder' | 'URL'
export type LaunchDelay = '1 second' | '2 seconds' | '3 seconds' | '5 seconds'
export type LaunchBehavior = 'Launch in order' | 'Launch all at once'
export type Theme = 'Light' | 'Dark' | 'System' | 'Custom Wallpaper'
export type ResolvedTheme = 'light' | 'dark'
export type AccentColor = 'purple' | 'blue' | 'green' | 'orange' | 'red' | 'gray'
export type PlaylistViewMode = 'list' | 'grid'
export type FloatingPlayerMode = 'expanded' | 'minimized'
export type FloatingPlayerPosition = {
  x: number
  y: number
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
  accentColor: AccentColor
  musicVolume?: number
  musicPlaylistOrder?: string[]
  playlistViewMode?: PlaylistViewMode
  floatingPlayerMode?: FloatingPlayerMode
  floatingPlayerHidden?: boolean
  floatingPlayerPosition?: FloatingPlayerPosition | null
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
