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
    loadYoutubeMusicPlaylistCovers: () => Promise<Record<string, string> | null>
    changeYoutubeMusicPlaylistCover: (playlistId: string) => Promise<string | null>

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
