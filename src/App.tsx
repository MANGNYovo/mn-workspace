import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { DragEndEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'

// styles
import './styles/base.css'
import './styles/layout.css'
import './styles/home.css'
import './styles/dashboard.css'
import './styles/playlist.css'
import './styles/programs.css'
import './styles/settings.css'
import './styles/diary.css'
import './styles/modal.css'
import './styles/animations.css'
import './styles/floating-player.css'
import './styles/dark.css'
import './styles/media.css'

// types
import type {
  Page, AudioDevice, MonitorOrientation, HomeMusicPlaylist, PlaylistTrack,
  ProgramItem, AppSettings, DiaryEntry, LaunchStatus, ResolvedTheme, PlaylistViewMode,
  YoutubeMusicAccount,
} from './types'

// constants & helpers
import {
  iconMap, musicControlIconMap, logoMap, accentColorMap, accentRingMap,
  likedIconMap, prelikedIconMap, themeIconMap,
  fallbackHomeMusicPlaylists, fallbackPlaylistTracks, initialPrograms, defaultSettings,
  initialDiaryEntries, formatDateKey, createMonthDate, parseDurationToSeconds,
  getProgramIcon, getNameFromPath, createId, getProgramPresets,
  isProgramList, isSettings, isDiaryEntries, isHomeMusicPlaylistList,
  applyHomeMusicPlaylistOrder, refreshHomeMusicPlaylistThumbnails,
  filterHiddenHomeMusicPlaylists, applyHomeMusicPlaylistCoverOverrides,
} from './constants'

// pages
import {
  HomePage, DashboardPage, PlaylistPage,
  DiaryPage, WriteDiaryPage, ProgramsPage, SettingsPage,
} from './pages'

// components
import { FloatingMusicPlayer } from './components'

// modals
import {
  DiaryPickerModal, DiaryViewModal, DiaryDeleteModal,
  UpdateModal, YoutubeLoginModal, FullPlaylistModal, AddProgramModal,
} from './modals'

const YOUTUBE_TRACK_SWITCH_DELAY_MS = 700
const LIKED_PLAYLIST_ID = 'mn-liked-tracks'

type YoutubePlayer = {
  playVideo?: () => void
  pauseVideo?: () => void
  stopVideo?: () => void
  seekTo?: (seconds: number, allowSeekAhead?: boolean) => void
  setVolume?: (volume: number) => void
  unMute?: () => void
  mute?: () => void
  getCurrentTime?: () => number
  getDuration?: () => number
  loadVideoById?: (videoId: string | { videoId: string; startSeconds?: number }) => void
  destroy?: () => void
}

type YoutubeApi = {
  Player: new (element: HTMLElement | string, options: {
    width: number
    height: number
    videoId?: string
    playerVars?: Record<string, string | number>
    events?: {
      onReady?: (event: { target: YoutubePlayer }) => void
      onStateChange?: (event: { data: number; target: YoutubePlayer }) => void
      onError?: (event: { data: number; target: YoutubePlayer }) => void
    }
  }) => YoutubePlayer
  PlayerState: {
    ENDED: number
    PLAYING: number
    PAUSED: number
    BUFFERING: number
    CUED: number
  }
}

declare global {
  interface Window {
    YT?: YoutubeApi
    onYouTubeIframeAPIReady?: () => void
  }
}

function App() {
  // ─── State ────────────────────────────────────────────────────────────────
  const [activePage, setActivePage] = useState<Page>('home')
  const [selectedPreset, setSelectedPreset] = useState(1)
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<AudioDevice>('speaker')
  const [selectedMonitorOrientation, setSelectedMonitorOrientation] = useState<MonitorOrientation>('horizontal')
  const [selectedHomeMusicPlaylistId, setSelectedHomeMusicPlaylistId] = useState('focus')
  const [homeMusicPlaylists, setHomeMusicPlaylists] = useState<HomeMusicPlaylist[]>(fallbackHomeMusicPlaylists)
  const [homeMusicPlaylistPage, setHomeMusicPlaylistPage] = useState(0)
  const [isFullPlaylistModalOpen, setIsFullPlaylistModalOpen] = useState(false)
  const [isYoutubeLoginModalOpen, setIsYoutubeLoginModalOpen] = useState(false)
  const [isYtAuthenticated, setIsYtAuthenticated] = useState(false)
  const [youtubeMusicAccount, setYoutubeMusicAccount] = useState<YoutubeMusicAccount | null>(null)
  const [isYoutubeAccountLoading, setIsYoutubeAccountLoading] = useState(false)
  const [ytPlaylistTracks, setYtPlaylistTracks] = useState<PlaylistTrack[]>([])
  const [likedTrackIds, setLikedTrackIds] = useState<string[]>([])
  const [isLikedTracksLoaded, setIsLikedTracksLoaded] = useState(false)
  const [isPlaylistRefreshing, setIsPlaylistRefreshing] = useState(false)
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null)
  const [playingPlaylistId, setPlayingPlaylistId] = useState<string | null>(null)
  const [currentTrack, setCurrentTrack] = useState<PlaylistTrack | null>(null)
  const ytPlayerHostRef = useRef<HTMLDivElement | null>(null)
  const ytPlayerRef = useRef<YoutubePlayer | null>(null)
  const ytApiPromiseRef = useRef<Promise<YoutubeApi> | null>(null)
  const youtubePlayerElementRef = useRef<HTMLElement | null>(null)
  const [playingFullPlaylistTrackId, setPlayingFullPlaylistTrackId] = useState<string | null>(null)
  const [selectedPlaylistTrackId, setSelectedPlaylistTrackId] = useState<string | null>(null)
  const allTracksRef = useRef<PlaylistTrack[]>([])
  const playingPlaylistTracksRef = useRef<PlaylistTrack[]>([])
  const playingPlaylistIdRef = useRef<string | null>(null)
  const selectedPlaylistTrackIdRef = useRef<string | null>(null)
  const currentVideoIdRef = useRef<string | null>(null)
  const shuffleHistoryRef = useRef<Record<string, string[]>>({})
  const pendingVideoChangeUntilRef = useRef(0)
  const isPreparingNextVideoRef = useRef(false)
  const isWaitingForFreshVideoTimeRef = useRef(false)
  const youtubeSwitchTimerRef = useRef<number | null>(null)
  const youtubeSwitchTokenRef = useRef(0)
  const youtubePlayerReadyRef = useRef(false)
  const youtubeCommandQueueRef = useRef<{ func: string; args: unknown[] }[]>([])
  const youtubeDeferredTimerRef = useRef<number | null>(null)
  const pendingYoutubeVideoIdRef = useRef<string | null>(null)
  const lastYoutubeErrorRef = useRef<number | null>(null)
  const playNextTrackRef = useRef<() => void>(() => {})
  const [playlistViewMode, setPlaylistViewMode] = useState<PlaylistViewMode>(defaultSettings.playlistViewMode ?? 'list')
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState('')
  const [fullPlaylistSearchQuery, setFullPlaylistSearchQuery] = useState('')
  const [playlistTrackMap, setPlaylistTrackMap] = useState<Record<string, PlaylistTrack[]>>({})
  const [playlistCoverOverrides, setPlaylistCoverOverrides] = useState<Record<string, string>>({})
  const [homeMusicProgress, setHomeMusicProgress] = useState(0)
  const [homeMusicVolume, setHomeMusicVolume] = useState(58)
  const homeMusicVolumeRef = useRef(58)
  const [isHomeMusicPlaying, setIsHomeMusicPlaying] = useState(false)
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(false)
  const [ytCurrentTime, setYtCurrentTime] = useState(0)
  const [ytDuration, setYtDuration] = useState(0)
  const ytDurationRef = useRef(0)
  const isSeekingRef = useRef(false)
  const [overflowingHomeMusicPlaylistIds, setOverflowingHomeMusicPlaylistIds] = useState<string[]>([])
  const homeMusicPlaylistWheelLockRef = useRef(false)
  const homeMusicPlaylistTitleRefs = useRef<Record<string, HTMLElement | null>>({})
  const [overflowingMarqueeTitleIds, setOverflowingMarqueeTitleIds] = useState<string[]>([])
  const marqueeTitleWrapRefs = useRef<Record<string, HTMLElement | null>>({})
  const marqueeTitleTextRefs = useRef<Record<string, HTMLElement | null>>({})
  const [programs, setPrograms] = useState<ProgramItem[]>(initialPrograms)
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [isSidebarThemeToggleHovered, setIsSidebarThemeToggleHovered] = useState(false)
  const [launchStatuses, setLaunchStatuses] = useState<Record<string, LaunchStatus>>({})
  const [isLaunching, setIsLaunching] = useState(false)
  const cancelLaunchRef = useRef(false)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>('light')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appVersion, setAppVersion] = useState('')
  const [isProgramsLoaded, setIsProgramsLoaded] = useState(false)
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false)
  const [isDiariesLoaded, setIsDiariesLoaded] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [newProgramName, setNewProgramName] = useState('')
  const [newProgramType, setNewProgramType] = useState<import('./types').ProgramType>('Program')
  const [newProgramPath, setNewProgramPath] = useState('')
  const [newProgramEnabled, setNewProgramEnabled] = useState(true)
  const [newProgramIconImage, setNewProgramIconImage] = useState<string | null>(null)
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false)
  const [updateModalType, setUpdateModalType] = useState<'available' | 'downloading' | 'ready' | 'latest' | 'error' | null>(null)
  const [updateProgress, setUpdateProgress] = useState(0)
  const [diaryEntries, setDiaryEntries] = useState<Record<string, DiaryEntry>>(initialDiaryEntries)
  const [diaryDisplayDate, setDiaryDisplayDate] = useState(new Date(2026, 5, 1))
  const [isDiaryPickerOpen, setIsDiaryPickerOpen] = useState(false)
  const [selectedDiaryDate, setSelectedDiaryDate] = useState<Date | null>(null)
  const [diaryText, setDiaryText] = useState('')
  const [isDeleteDiaryConfirmOpen, setIsDeleteDiaryConfirmOpen] = useState(false)
  const [isDiarySavedVisible, setIsDiarySavedVisible] = useState(false)
  const [isDiarySaveButtonPressed, setIsDiarySaveButtonPressed] = useState(false)
  const [diaryPickerMonthIndex, setDiaryPickerMonthIndex] = useState(diaryDisplayDate.getMonth())
  const [diaryPickerYear, setDiaryPickerYear] = useState(diaryDisplayDate.getFullYear())
  const diaryMonthWheelRef = useRef<HTMLDivElement | null>(null)
  const diaryYearWheelRef = useRef<HTMLDivElement | null>(null)

  // ─── Computed values ──────────────────────────────────────────────────────
  const presetPrograms = programs.filter((p) => getProgramPresets(p).includes(selectedPreset))
  const enabledPrograms = presetPrograms.filter((p) => p.enabled)
  const enabledProgramCount = enabledPrograms.length

  const isCustomWallpaperMode = settings.theme === 'Custom Wallpaper'

  const activeTheme: ResolvedTheme = isCustomWallpaperMode
    ? 'dark'
    : settings.theme === 'System'
      ? systemTheme
      : settings.theme.toLowerCase() as ResolvedTheme

  const appStyle = {
    '--accent-color': accentColorMap[settings.accentColor],
    '--accent-ring': accentRingMap[settings.accentColor],
    ...(settings.customWallpaper
      ? { '--custom-wallpaper-image': `url("${settings.customWallpaper}")` }
      : {}),
  } as CSSProperties

  const currentTimeParts = currentDate.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  }).split(' ')
  const [hours, minutes, seconds] = currentTimeParts[0].split(':')
  const currentTimeText = `${hours} : ${minutes} : ${seconds}`
  const currentMeridiemText = currentTimeParts[1]
  const currentDateText = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const currentWeekdayText = currentDate.toLocaleDateString('en-US', { weekday: 'short' })

  const todayDateKey = formatDateKey(currentDate)
  const todayDiaryEntry = diaryEntries[todayDateKey]
  const selectedDiaryEntry = selectedDiaryDate ? diaryEntries[formatDateKey(selectedDiaryDate)] : null
  const diaryPickerMinYear = currentDate.getFullYear() - 50
  const diaryPickerMaxYear = currentDate.getFullYear() + 50

  const likedTrackIdSet = new Set(likedTrackIds)
  const knownTrackMap = new Map<string, PlaylistTrack>()
  const rememberKnownTrack = (track?: PlaylistTrack | null) => {
    if (!track?.id || knownTrackMap.has(track.id)) return
    knownTrackMap.set(track.id, track)
  }

  fallbackPlaylistTracks.forEach(rememberKnownTrack)
  ytPlaylistTracks.forEach(rememberKnownTrack)
  Object.values(playlistTrackMap).flat().forEach(rememberKnownTrack)
  rememberKnownTrack(currentTrack)

  const likedTracks = likedTrackIds
    .map((trackId) => knownTrackMap.get(trackId))
    .filter((track): track is PlaylistTrack => Boolean(track))

  const likedPlaylist: HomeMusicPlaylist = {
    id: LIKED_PLAYLIST_ID,
    name: 'Liked',
    tracks: likedTrackIds.length,
    customThumbnail: playlistCoverOverrides[LIKED_PLAYLIST_ID],
  }

  const homeMusicPlaylistsWithLiked = applyHomeMusicPlaylistOrder(
    [
      likedPlaylist,
      ...homeMusicPlaylists.filter((playlist) => playlist.id !== LIKED_PLAYLIST_ID),
    ],
    settings.musicPlaylistOrder,
  )
  const homeMusicPlaylistOrderKey = homeMusicPlaylistsWithLiked.map((p) => p.id).join('|')

  const selectedHomeMusicPlaylist =
    homeMusicPlaylistsWithLiked.find((p) => p.id === selectedHomeMusicPlaylistId) ??
    homeMusicPlaylistsWithLiked[0] ??
    fallbackHomeMusicPlaylists[0]

  const selectedPlaylistTracks = selectedHomeMusicPlaylistId === LIKED_PLAYLIST_ID
    ? likedTracks
    : isYtAuthenticated ? ytPlaylistTracks : fallbackPlaylistTracks
  const allTracks = selectedPlaylistTracks
  allTracksRef.current = allTracks
  playingPlaylistIdRef.current = playingPlaylistId
  selectedPlaylistTrackIdRef.current = selectedPlaylistTrackId

  const getPlaylistTracksForDisplay = (playlistId: string) => (
    playlistId === LIKED_PLAYLIST_ID
      ? likedTracks
      : playlistTrackMap[playlistId] ?? []
  )

  const normalizedPlaylistSearchQuery = playlistSearchQuery.trim().toLowerCase()
  const filteredHomeMusicPlaylists = normalizedPlaylistSearchQuery
    ? homeMusicPlaylistsWithLiked.filter((playlist) => {
        const nameMatch = playlist.name.toLowerCase().includes(normalizedPlaylistSearchQuery)
        const trackMatch = getPlaylistTracksForDisplay(playlist.id).some(
          (track) => track.title.toLowerCase().includes(normalizedPlaylistSearchQuery) ||
                     track.artist.toLowerCase().includes(normalizedPlaylistSearchQuery)
        )
        return nameMatch || trackMatch
      })
    : homeMusicPlaylistsWithLiked

  const fullPlaylistTracks = selectedPlaylistTracks
  const normalizedFullPlaylistSearchQuery = fullPlaylistSearchQuery.trim().toLowerCase()
  const filteredFullPlaylistTracks = normalizedFullPlaylistSearchQuery
    ? fullPlaylistTracks.filter((t) =>
        t.title.toLowerCase().includes(normalizedFullPlaylistSearchQuery) ||
        t.artist.toLowerCase().includes(normalizedFullPlaylistSearchQuery)
      )
    : fullPlaylistTracks

  const homeMusicDurationSeconds = ytDuration
  const homeMusicCurrentSeconds = ytCurrentTime
  const floatingPlayerMode = settings.floatingPlayerMode ?? defaultSettings.floatingPlayerMode ?? 'expanded'
  const isFloatingPlayerHidden = Boolean(settings.floatingPlayerHidden)
  const shouldShowFloatingMusicPlayer =
    Boolean(currentVideoId && currentTrack) &&
    activePage !== 'home' &&
    activePage !== 'playlist'
  // ─── Helper functions ─────────────────────────────────────────────────────
  const getPlaybackTracks = (playlistId?: string | null) => {
    if (playlistId) {
      if (playlistId === LIKED_PLAYLIST_ID) return likedTracks
      const mapped = playlistTrackMap[playlistId]
      if (mapped && mapped.length > 0) return mapped
      if (playlistId === selectedHomeMusicPlaylistId && allTracks.length > 0) return allTracks
    }
    if (playingPlaylistTracksRef.current.length > 0) return playingPlaylistTracksRef.current
    return allTracksRef.current
  }

  const rememberShuffleTrack = (playlistId: string | null | undefined, videoId: string) => {
    if (!playlistId || !videoId) return

    const tracks = getPlaybackTracks(playlistId)
    const validIds = new Set(tracks.map((track) => track.id))
    const previous = shuffleHistoryRef.current[playlistId] ?? []
    const filteredPrevious = previous.filter((id) => validIds.size === 0 || validIds.has(id))
    const nextHistory = [...filteredPrevious.filter((id) => id !== videoId), videoId]
    const historyLimit = Math.max(tracks.length, 20)

    shuffleHistoryRef.current[playlistId] = nextHistory.slice(-historyLimit)
  }

  const formatHomeMusicTime = (secs: number) => {
    const safe = Math.max(0, Math.floor(secs))
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
  }

  const isMarqueeTitleOverflowing = (titleId: string) =>
    overflowingMarqueeTitleIds.includes(titleId)

  const renderMarqueeTitle = (titleId: string, title: string) => {
    const isOverflowing = isMarqueeTitleOverflowing(titleId)
    return (
      <strong
        ref={(el) => { marqueeTitleTextRefs.current[titleId] = el }}
        className="marquee-title"
      >
        <span className="marquee-title-text">{title}</span>
        {isOverflowing && <span className="marquee-title-text" aria-hidden="true">{title}</span>}
      </strong>
    )
  }

  const getThemeIcon = (iconName: keyof typeof iconMap, isActive = true) => {
    if (activeTheme === 'dark') return iconMap[iconName].white
    return isActive ? iconMap[iconName][settings.accentColor] : iconMap[iconName].gray
  }

  const getMusicControlIcon = (iconName: keyof typeof musicControlIconMap, isActive = true) =>
    isActive ? musicControlIconMap[iconName][settings.accentColor] : musicControlIconMap[iconName].gray

  const getLikeIcon = (isLiked: boolean, isHovered = false) => {
    if (isLiked) return likedIconMap[settings.accentColor]
    // 좋아요가 안 눌린 상태에서 hover 시 빈 하트 accent 아이콘으로
    if (isHovered) return prelikedIconMap[settings.accentColor]
    // 좋아요가 안 눌린 기본 상태는 라이트/다크모드 모두 gray 빈 하트로 고정
    return prelikedIconMap.gray
  }

  const shouldIgnoreMusicShortcut = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false

    return Boolean(
      target.closest('input, textarea, select, [contenteditable="true"]'),
    )
  }

  const updateSettings = (partial: Partial<AppSettings>) =>
    setSettings((prev) => ({ ...prev, ...partial }))

  const isTrackLiked = (trackId?: string | null) => Boolean(trackId && likedTrackIdSet.has(trackId))

  const handleToggleTrackLike = (trackId?: string | null) => {
    if (!trackId) return

    setLikedTrackIds((prev) => {
      if (prev.includes(trackId)) return prev.filter((id) => id !== trackId)
      return [...prev, trackId]
    })
  }

  const youtubePlayerOrigin = window.location.origin.startsWith('http')
    ? window.location.origin
    : 'http://127.0.0.1'

  const isYoutubePlayerUsable = () => {
    const player = ytPlayerRef.current
    return Boolean(
      youtubePlayerReadyRef.current &&
      player &&
      typeof player.playVideo === 'function' &&
      typeof player.loadVideoById === 'function',
    )
  }

  const loadYoutubeIframeApi = () => {
    if (window.YT?.Player) return Promise.resolve(window.YT)
    if (ytApiPromiseRef.current) return ytApiPromiseRef.current

    ytApiPromiseRef.current = new Promise<YoutubeApi>((resolve, reject) => {
      const previousReady = window.onYouTubeIframeAPIReady
      const timeout = window.setTimeout(() => {
        reject(new Error('YouTube IFrame API initialization timed out.'))
      }, 15000)

      window.onYouTubeIframeAPIReady = () => {
        previousReady?.()
        window.clearTimeout(timeout)

        if (window.YT?.Player) {
          resolve(window.YT)
          return
        }

        reject(new Error('YouTube IFrame API failed to initialize.'))
      }

      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const script = document.createElement('script')
        script.src = 'https://www.youtube.com/iframe_api'
        script.async = true
        script.onerror = () => {
          window.clearTimeout(timeout)
          reject(new Error('Failed to load YouTube IFrame API.'))
        }
        document.head.appendChild(script)
      }
    })

    return ytApiPromiseRef.current
  }

  const createYoutubeHostElement = () => {
    const host = ytPlayerHostRef.current
    if (!host) return null

    host.innerHTML = ''
    const element = document.createElement('div')
    element.id = `mn-youtube-player-${Date.now()}`
    host.appendChild(element)
    youtubePlayerElementRef.current = element
    return element
  }

  const runYtCommandNow = (func: string, args: unknown[] = []) => {
    const player = ytPlayerRef.current
    if (!player || !isYoutubePlayerUsable()) return false

    try {
      if (func === 'playVideo' && typeof player.playVideo === 'function') { player.playVideo(); return true }
      if (func === 'pauseVideo' && typeof player.pauseVideo === 'function') { player.pauseVideo(); return true }
      if (func === 'stopVideo' && typeof player.stopVideo === 'function') { player.stopVideo(); return true }
      if (func === 'seekTo' && typeof player.seekTo === 'function') {
        const seconds = typeof args[0] === 'number' ? args[0] : 0
        const allowSeekAhead = typeof args[1] === 'boolean' ? args[1] : true
        player.seekTo(seconds, allowSeekAhead)
        return true
      }
      if (func === 'setVolume' && typeof player.setVolume === 'function') {
        const volume = typeof args[0] === 'number' ? args[0] : homeMusicVolumeRef.current
        player.setVolume(Math.max(0, Math.min(100, Math.round(volume))))
        return true
      }
      if (func === 'unMute' && typeof player.unMute === 'function') { player.unMute(); return true }
      if (func === 'mute' && typeof player.mute === 'function') { player.mute(); return true }
      return false
    } catch (error) {
      console.warn('YouTube player command failed:', func, error)
      return false
    }
  }

  const flushYtCommandQueue = () => {
    if (!isYoutubePlayerUsable()) return

    const queued = youtubeCommandQueueRef.current.splice(0)
    queued.forEach(({ func, args }) => runYtCommandNow(func, args))
  }

  const sendYtCommand = (func: string, args: unknown[] = []) => {
    if (!isYoutubePlayerUsable()) {
      if (func !== 'stopVideo') {
        youtubeCommandQueueRef.current = [
          ...youtubeCommandQueueRef.current.filter((command) => command.func !== func),
          { func, args },
        ].slice(-8)
      }
      return
    }

    runYtCommandNow(func, args)
  }

  const applyYtVolume = () => {
    const safeVolume = Math.max(0, Math.min(100, Math.round(homeMusicVolumeRef.current)))
    sendYtCommand('setVolume', [safeVolume])
    if (safeVolume > 0) sendYtCommand('unMute')
    else sendYtCommand('mute')
  }

  const applyYtVolumeWithRetry = () => {
    applyYtVolume()
    window.setTimeout(applyYtVolume, 180)
    window.setTimeout(applyYtVolume, 520)
    window.setTimeout(applyYtVolume, 1100)
    window.setTimeout(applyYtVolume, 2200)
  }

  const loadCurrentVideoIntoYoutubePlayer = (videoId: string) => {
    const player = ytPlayerRef.current
    if (!player || !isYoutubePlayerUsable() || typeof player.loadVideoById !== 'function') return

    pendingYoutubeVideoIdRef.current = videoId
    lastYoutubeErrorRef.current = null
    isPreparingNextVideoRef.current = true
    isWaitingForFreshVideoTimeRef.current = true
    pendingVideoChangeUntilRef.current = Date.now() + YOUTUBE_TRACK_SWITCH_DELAY_MS + 1600

    try {
      player.loadVideoById({ videoId, startSeconds: 0 })
    } catch {
      try { player.loadVideoById(videoId) } catch { /* 무시 */ }
    }

    setYtCurrentTime(0)
    setHomeMusicProgress(0)

    window.setTimeout(() => {
      if (currentVideoIdRef.current !== videoId) return
      sendYtCommand('seekTo', [0, true])
      sendYtCommand('playVideo')
      applyYtVolumeWithRetry()
    }, 120)
  }

  const createYoutubePlayer = async (videoId: string) => {
    const YT = await loadYoutubeIframeApi()
    if (currentVideoIdRef.current !== videoId) return

    if (ytPlayerRef.current && isYoutubePlayerUsable()) {
      loadCurrentVideoIntoYoutubePlayer(videoId)
      return
    }

    const element = createYoutubeHostElement()
    if (!element) return

    youtubePlayerReadyRef.current = false
    pendingYoutubeVideoIdRef.current = videoId

    ytPlayerRef.current = new YT.Player(element, {
      width: 200,
      height: 200,
      videoId,
      playerVars: {
        autoplay: 1,
        playsinline: 1,
        controls: 0,
        rel: 0,
        fs: 0,
        origin: youtubePlayerOrigin,
      },
      events: {
        onReady: (event) => {
          ytPlayerRef.current = event.target
          youtubePlayerReadyRef.current = true
          const readyVideoId = pendingYoutubeVideoIdRef.current ?? currentVideoIdRef.current
          if (!readyVideoId) return

          flushYtCommandQueue()
          if (readyVideoId !== videoId && typeof event.target.loadVideoById === 'function') {
            loadCurrentVideoIntoYoutubePlayer(readyVideoId)
            return
          }

          setYtCurrentTime(0)
          setHomeMusicProgress(0)
          sendYtCommand('seekTo', [0, true])
          sendYtCommand('playVideo')
          applyYtVolumeWithRetry()
        },
        onStateChange: (event) => {
          ytPlayerRef.current = event.target
          const playerState = window.YT?.PlayerState
          if (!playerState) return

          if (event.data === playerState.PLAYING) {
            isPreparingNextVideoRef.current = false
            isWaitingForFreshVideoTimeRef.current = false
            pendingVideoChangeUntilRef.current = 0
            setIsHomeMusicPlaying(true)
            applyYtVolumeWithRetry()
            return
          }

          if (event.data === playerState.ENDED) {
            if (isPreparingNextVideoRef.current || isWaitingForFreshVideoTimeRef.current || Date.now() < pendingVideoChangeUntilRef.current) return
            playNextTrackRef.current()
          }
        },
        onError: (event) => {
          lastYoutubeErrorRef.current = event.data
          console.warn('YouTube player error:', event.data)
          if (currentVideoIdRef.current === pendingYoutubeVideoIdRef.current) {
            window.setTimeout(() => playNextTrackRef.current(), 600)
          }
        },
      },
    })
  }

  // ─── YouTube Player ───────────────────────────────────────────────────────
  const playVideo = (videoId: string, fromPlaylistId?: string, trackInfo?: PlaylistTrack) => {
    const track = trackInfo ?? allTracksRef.current.find((t) => t.id === videoId) ?? allTracks.find((t) => t.id === videoId) ?? null
    const isSameVideo = currentVideoIdRef.current === videoId
    const initialDuration = track?.duration ? parseDurationToSeconds(track.duration) : 0

    if (fromPlaylistId) {
      const currentTracks = playingPlaylistTracksRef.current
      const tracksForPlayback =
        playingPlaylistIdRef.current === fromPlaylistId && currentTracks.some((t) => t.id === videoId)
          ? currentTracks
          : getPlaybackTracks(fromPlaylistId)
      if (tracksForPlayback.length > 0) playingPlaylistTracksRef.current = tracksForPlayback
      playingPlaylistIdRef.current = fromPlaylistId
    }

    if (youtubeSwitchTimerRef.current) {
      window.clearTimeout(youtubeSwitchTimerRef.current)
      youtubeSwitchTimerRef.current = null
    }

    const switchToken = youtubeSwitchTokenRef.current + 1
    youtubeSwitchTokenRef.current = switchToken

    currentVideoIdRef.current = videoId
    selectedPlaylistTrackIdRef.current = videoId
    isSeekingRef.current = false

    setSelectedPlaylistTrackId(videoId)
    setPlayingFullPlaylistTrackId(videoId)
    setIsHomeMusicPlaying(true)
    setYtCurrentTime(0)
    setHomeMusicProgress(0)

    if (initialDuration > 0 || !isSameVideo) {
      setYtDuration(initialDuration)
      ytDurationRef.current = initialDuration
    }

    if (track) setCurrentTrack(track)
    if (fromPlaylistId) {
      playingPlaylistIdRef.current = fromPlaylistId
      setPlayingPlaylistId(fromPlaylistId)
    }

    rememberShuffleTrack(
      fromPlaylistId ?? playingPlaylistIdRef.current ?? playingPlaylistId ?? selectedHomeMusicPlaylistId,
      videoId,
    )

    if (track) {
      updateSettings({
        lastTrack: {
          videoId,
          title: track.title,
          artist: track.artist,
          thumbnail: track.thumbnail ?? '',
          playlistId: fromPlaylistId ?? playingPlaylistId ?? selectedHomeMusicPlaylistId ?? '',
        },
      })
    }

    pendingYoutubeVideoIdRef.current = videoId
    youtubeCommandQueueRef.current = [
      { func: 'playVideo', args: [] },
      { func: 'setVolume', args: [Math.max(0, Math.min(100, Math.round(homeMusicVolumeRef.current)))] },
    ]
    if (homeMusicVolumeRef.current > 0) youtubeCommandQueueRef.current.push({ func: 'unMute', args: [] })

    if (isSameVideo && ytPlayerRef.current) {
      isPreparingNextVideoRef.current = true
      isWaitingForFreshVideoTimeRef.current = true
      pendingVideoChangeUntilRef.current = Date.now() + YOUTUBE_TRACK_SWITCH_DELAY_MS + 900
      setCurrentVideoId(null)
      youtubeSwitchTimerRef.current = window.setTimeout(() => {
        if (youtubeSwitchTokenRef.current !== switchToken) return
        isPreparingNextVideoRef.current = false
        setYtCurrentTime(0)
        setHomeMusicProgress(0)
        setCurrentVideoId(videoId)
      }, YOUTUBE_TRACK_SWITCH_DELAY_MS)
      return
    }

    isPreparingNextVideoRef.current = true
    isWaitingForFreshVideoTimeRef.current = true
    pendingVideoChangeUntilRef.current = Date.now() + YOUTUBE_TRACK_SWITCH_DELAY_MS + 900

    setCurrentVideoId(null)

    youtubeSwitchTimerRef.current = window.setTimeout(() => {
      if (youtubeSwitchTokenRef.current !== switchToken) return
      isPreparingNextVideoRef.current = false
      setYtCurrentTime(0)
      setHomeMusicProgress(0)
      setCurrentVideoId(videoId)
    }, YOUTUBE_TRACK_SWITCH_DELAY_MS)
  }

  const getShuffleTrack = (tracks: PlaylistTrack[], currentId: string | null, playlistId: string) => {
    if (tracks.length === 0) return null
    if (tracks.length === 1) return tracks[0]

    const targets = currentId ? tracks.filter((track) => track.id !== currentId) : tracks
    const validIds = new Set(tracks.map((track) => track.id))
    const history = (shuffleHistoryRef.current[playlistId] ?? []).filter((id) => validIds.has(id))
    const playedIds = new Set(history)
    const unplayedTargets = targets.filter((track) => !playedIds.has(track.id))

    shuffleHistoryRef.current[playlistId] = history

    if (unplayedTargets.length > 0) {
      return unplayedTargets[Math.floor(Math.random() * unplayedTargets.length)] ?? unplayedTargets[0]
    }

    const recentLimit = Math.min(20, Math.max(0, tracks.length - 1))
    const recentIds = new Set(history.slice(-recentLimit))
    const recentSafeTargets = targets.filter((track) => !recentIds.has(track.id))

    if (recentSafeTargets.length > 0) {
      return recentSafeTargets[Math.floor(Math.random() * recentSafeTargets.length)] ?? recentSafeTargets[0]
    }

    return targets[Math.floor(Math.random() * targets.length)] ?? tracks[0]
  }

  const playNextTrack = () => {
    const playlistId = playingPlaylistIdRef.current ?? playingPlaylistId ?? selectedHomeMusicPlaylistId
    if (!isYtAuthenticated && playlistId !== LIKED_PLAYLIST_ID) { setIsYoutubeLoginModalOpen(true); return }
    const tracks = getPlaybackTracks(playlistId)
    const currentId = currentVideoIdRef.current
    if (tracks.length === 0) return
    if (isShuffleEnabled) {
      const next = getShuffleTrack(tracks, currentId, playlistId)
      if (next) playVideo(next.id, playlistId, next)
      return
    }
    if (!currentId) { playVideo(tracks[0].id, playlistId, tracks[0]); return }
    const idx = tracks.findIndex((t) => t.id === currentId)
    if (idx < 0) { playVideo(tracks[0].id, playlistId, tracks[0]); return }
    if (idx < tracks.length - 1) { const next = tracks[idx + 1]; playVideo(next.id, playlistId, next) }
  }
  playNextTrackRef.current = playNextTrack

  const playPrevTrack = () => {
    const playlistId = playingPlaylistIdRef.current ?? playingPlaylistId ?? selectedHomeMusicPlaylistId
    if (!isYtAuthenticated && playlistId !== LIKED_PLAYLIST_ID) { setIsYoutubeLoginModalOpen(true); return }
    const tracks = getPlaybackTracks(playlistId)
    const currentId = currentVideoIdRef.current
    if (!currentId) return
    const idx = tracks.findIndex((t) => t.id === currentId)
    if (idx > 0) { const prev = tracks[idx - 1]; playVideo(prev.id, playlistId, prev) }
  }

  const togglePlayPause = () => {
    const next = !isHomeMusicPlaying
    setIsHomeMusicPlaying(next)
    sendYtCommand(next ? 'playVideo' : 'pauseVideo')
  }

  const loadYoutubeMusicAccount = async () => {
    setIsYoutubeAccountLoading(true)
    try {
      const account = await window.mnAPI.getYoutubeMusicAccount()
      setYoutubeMusicAccount(account?.signedIn ? account : null)
      return account?.signedIn ? account : null
    } catch (error) {
      console.error(error)
      setYoutubeMusicAccount(null)
      return null
    } finally {
      setIsYoutubeAccountLoading(false)
    }
  }

  const resetYoutubeMusicLoginState = (openLogin = false) => {
    setIsYtAuthenticated(false)
    setYoutubeMusicAccount(null)
    setIsYoutubeAccountLoading(false)
    setYtPlaylistTracks([])
    setPlaylistTrackMap({})
    playingPlaylistTracksRef.current = []
    playingPlaylistIdRef.current = null
    setPlayingPlaylistId(null)
    setSelectedPlaylistTrackId(null)
    if (openLogin) setIsYoutubeLoginModalOpen(true)
  }

  const handleLoginYoutubeMusicFromSettings = () => {
    setIsYoutubeLoginModalOpen(true)
  }

  const handleLogoutYoutubeMusic = async () => {
    const success = await window.mnAPI.logoutYoutubeMusic()
    if (!success) return

    resetYoutubeMusicLoginState(false)
    setIsYoutubeLoginModalOpen(false)
    setHomeMusicPlaylists(fallbackHomeMusicPlaylists)
    setSelectedHomeMusicPlaylistId(fallbackHomeMusicPlaylists[0]?.id ?? LIKED_PLAYLIST_ID)
    setCurrentVideoId(null)
    setCurrentTrack(null)
    setIsHomeMusicPlaying(false)
    setPlayingFullPlaylistTrackId(null)
    sendYtCommand('stopVideo')
  }

  // ─── Playlist handlers ────────────────────────────────────────────────────
  const handlePlaylistPlay = async (playlistId: string) => {
    if (playlistId === LIKED_PLAYLIST_ID) {
      if (playingPlaylistId === playlistId) { togglePlayPause(); return }
      setSelectedHomeMusicPlaylistId(playlistId)
      if (likedTracks.length === 0) return
      playingPlaylistTracksRef.current = likedTracks
      playingPlaylistIdRef.current = playlistId
      playVideo(likedTracks[0].id, playlistId, likedTracks[0])
      return
    }

    if (!isYtAuthenticated) { setIsYoutubeLoginModalOpen(true); return }
    if (playingPlaylistId === playlistId) { togglePlayPause(); return }
    setSelectedHomeMusicPlaylistId(playlistId)

    try {
      const tracks = await window.mnAPI.getYoutubeMusicPlaylistTracks(playlistId)
      if (!Array.isArray(tracks)) {
        resetYoutubeMusicLoginState(true)
        return
      }
      if (tracks.length === 0) {
        setYtPlaylistTracks([])
        setSelectedPlaylistTrackId(null)
        return
      }
      const pl = tracks as PlaylistTrack[]
      playingPlaylistTracksRef.current = pl
      playingPlaylistIdRef.current = playlistId
      setYtPlaylistTracks(pl)
      setPlaylistTrackMap((prev) => {
        const next = { ...prev, [playlistId]: pl }
        window.mnAPI.saveYoutubeMusicTrackCache(next)
        return next
      })
      playVideo(pl[0].id, playlistId, pl[0])
    } catch (e) {
      console.error(e)
      resetYoutubeMusicLoginState(true)
    }
  }

  const handleRefreshPlaylists = async () => {
    if (!isYtAuthenticated) { setIsYoutubeLoginModalOpen(true); return }
    if (isPlaylistRefreshing) return
    setIsPlaylistRefreshing(true)
    try {
      const loaded = await window.mnAPI.getYoutubeMusicPlaylists()
      if (!isHomeMusicPlaylistList(loaded) || loaded.length === 0) {
        resetYoutubeMusicLoginState(true)
        return
      }
      const visible = filterHiddenHomeMusicPlaylists(loaded)
      const refreshed = applyHomeMusicPlaylistCoverOverrides(refreshHomeMusicPlaylistThumbnails(visible), playlistCoverOverrides)
      setHomeMusicPlaylists((prev) => {
        const map = new Map(refreshed.map((p) => [p.id, p]))
        const reordered = prev.filter((p) => map.has(p.id)).map((p) => map.get(p.id)!)
        const added = refreshed.filter((p) => !new Set(prev.map((x) => x.id)).has(p.id))
        return [...reordered, ...added]
      })
      if (selectedHomeMusicPlaylistId && selectedHomeMusicPlaylistId !== 'focus' && selectedHomeMusicPlaylistId !== LIKED_PLAYLIST_ID) {
        const tracks = await window.mnAPI.getYoutubeMusicPlaylistTracks(selectedHomeMusicPlaylistId)
        if (!Array.isArray(tracks)) {
          resetYoutubeMusicLoginState(true)
          return
        }
        if (tracks.length > 0) {
          setYtPlaylistTracks(tracks as PlaylistTrack[])
          setPlaylistTrackMap((prev) => {
            const next = { ...prev, [selectedHomeMusicPlaylistId]: tracks as PlaylistTrack[] }
            window.mnAPI.saveYoutubeMusicTrackCache(next)
            return next
          })
        }
      }
    } catch (e) {
      console.error(e)
      resetYoutubeMusicLoginState(true)
    }
    finally { setIsPlaylistRefreshing(false) }
  }

  const handleReloadYoutubeMusicData = async () => {
    if (!isYtAuthenticated) { setIsYoutubeLoginModalOpen(true); return }
    if (isPlaylistRefreshing) return
    setIsPlaylistRefreshing(true)
    try {
      const loaded = await window.mnAPI.getYoutubeMusicPlaylists()
      if (!isHomeMusicPlaylistList(loaded) || loaded.length === 0) {
        resetYoutubeMusicLoginState(true)
        return
      }
      const visible = filterHiddenHomeMusicPlaylists(loaded)
      const refreshed = applyHomeMusicPlaylistCoverOverrides(refreshHomeMusicPlaylistThumbnails(visible), playlistCoverOverrides)
      const ordered = applyHomeMusicPlaylistOrder(refreshed, settings.musicPlaylistOrder)
      const orderedWithLiked = applyHomeMusicPlaylistOrder([likedPlaylist, ...ordered], settings.musicPlaylistOrder)
      const nextId = orderedWithLiked.some((p) => p.id === selectedHomeMusicPlaylistId) ? selectedHomeMusicPlaylistId : orderedWithLiked[0]?.id ?? LIKED_PLAYLIST_ID
      const trackResults = await Promise.all(
        ordered.map(async (p): Promise<[string, PlaylistTrack[]]> => {
          try {
            const t = await window.mnAPI.getYoutubeMusicPlaylistTracks(p.id)
            return [p.id, Array.isArray(t) ? t as PlaylistTrack[] : []]
          } catch { return [p.id, []] }
        })
      )
      const nextMap = trackResults.reduce<Record<string, PlaylistTrack[]>>((acc, [id, t]) => ({ ...acc, [id]: t }), {})
      setHomeMusicPlaylists(ordered)
      setSelectedHomeMusicPlaylistId(nextId)
      setPlaylistTrackMap(nextMap)
      setYtPlaylistTracks(nextId === LIKED_PLAYLIST_ID ? likedTracks : nextMap[nextId] ?? [])
      window.mnAPI.saveYoutubeMusicTrackCache(nextMap)
      updateSettings({ musicPlaylistOrder: orderedWithLiked.map((p) => p.id) })
      const playingTracks = playingPlaylistIdRef.current
        ? playingPlaylistIdRef.current === LIKED_PLAYLIST_ID ? likedTracks : nextMap[playingPlaylistIdRef.current] ?? []
        : []
      if (playingTracks.length > 0) playingPlaylistTracksRef.current = playingTracks
      const updated = currentVideoIdRef.current ? Object.values(nextMap).flat().find((t) => t.id === currentVideoIdRef.current) : null
      if (updated) setCurrentTrack(updated)
      const nextSelected = nextId === LIKED_PLAYLIST_ID ? likedTracks : nextMap[nextId] ?? []
      if (nextSelected.length > 0 && nextId !== playingPlaylistIdRef.current) setSelectedPlaylistTrackId(nextSelected[0].id)
    } catch (e) { console.error(e) }
    finally { setIsPlaylistRefreshing(false) }
  }

  const handleChangePlaylistCover = async (playlistId: string) => {
    try {
      const coverUrl = await window.mnAPI.changeYoutubeMusicPlaylistCover(playlistId)
      if (!coverUrl) return
      setPlaylistCoverOverrides((prev) => ({ ...prev, [playlistId]: coverUrl }))
      setHomeMusicPlaylists((prev) => prev.map((p) => p.id === playlistId ? { ...p, customThumbnail: coverUrl } : p))
    } catch (e) { console.error(e) }
  }

  // ─── Progress / Volume ────────────────────────────────────────────────────
  const getTrackPercent = (e: React.PointerEvent<HTMLElement>) =>
    Math.max(0, Math.min(100, (e.nativeEvent.offsetX / e.currentTarget.offsetWidth) * 100))

  const handleHomeMusicProgressPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    isSeekingRef.current = true
    setHomeMusicProgress(getTrackPercent(e))
  }
  const handleHomeMusicProgressPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    setHomeMusicProgress(getTrackPercent(e))
  }
  const handleHomeMusicProgressPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    const dur = Math.max(0, ytDurationRef.current || ytDuration)
    if (dur <= 0) { setHomeMusicProgress(0); setYtCurrentTime(0); isSeekingRef.current = false; return }
    const pct = getTrackPercent(e)
    const seek = Math.max(0, Math.min(dur, Math.floor((pct / 100) * dur)))
    sendYtCommand('seekTo', [seek, true])
    setYtCurrentTime(seek)
    setHomeMusicProgress((seek / dur) * 100)
    isSeekingRef.current = false
  }
  const handleHomeMusicVolumePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setHomeMusicVolume(getTrackPercent(e))
  }
  const handleHomeMusicVolumePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    setHomeMusicVolume(getTrackPercent(e))
  }

  // ─── Playlist carousel ────────────────────────────────────────────────────
  const handleMoveHomeMusicPlaylist = (direction: -1 | 1) => {
    setHomeMusicPlaylistPage((prev) => {
      const max = Math.max(0, homeMusicPlaylistsWithLiked.length - 4)
      return Math.max(0, Math.min(prev + direction, max))
    })
  }
  const handleHomeMusicPlaylistWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const amount = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX
    if (Math.abs(amount) < 20 || homeMusicPlaylistWheelLockRef.current) return
    e.preventDefault()
    homeMusicPlaylistWheelLockRef.current = true
    handleMoveHomeMusicPlaylist(amount > 0 ? 1 : -1)
    window.setTimeout(() => { homeMusicPlaylistWheelLockRef.current = false }, 320)
  }

  // ─── Diary handlers ───────────────────────────────────────────────────────
  const handleOpenDiaryDate = (date: Date) => {
    if (!diaryEntries[formatDateKey(date)]) return
    setSelectedDiaryDate(date)
  }
  const handleMoveDiaryMonth = (offset: number) => setDiaryDisplayDate((prev) => createMonthDate(prev, offset))
  const handleDiaryMonthScroll = () => {
    const el = diaryMonthWheelRef.current
    if (!el) return
    setDiaryPickerMonthIndex(Math.max(0, Math.min(11, Math.round(el.scrollTop / 60))))
  }
  const handleDiaryYearScroll = () => {
    const el = diaryYearWheelRef.current
    if (!el) return
    setDiaryPickerYear(Math.max(diaryPickerMinYear, Math.min(diaryPickerMaxYear, diaryPickerMinYear + Math.round(el.scrollTop / 60))))
  }
  const handleSaveDiary = () => {
    const content = diaryText.trim()
    if (!content) return
    const now = new Date().toISOString()
    setDiaryEntries((prev) => ({ ...prev, [todayDateKey]: { date: todayDateKey, content, createdAt: prev[todayDateKey]?.createdAt ?? now, updatedAt: now } }))
    setIsDiarySaveButtonPressed(true)
    setIsDiarySavedVisible(true)
    window.setTimeout(() => setIsDiarySaveButtonPressed(false), 280)
    window.setTimeout(() => setIsDiarySavedVisible(false), 1400)
  }
  const handleConfirmDeleteDiary = () => {
    if (!selectedDiaryDate) return
    setDiaryEntries((prev) => { const next = { ...prev }; delete next[formatDateKey(selectedDiaryDate)]; return next })
    setIsDeleteDiaryConfirmOpen(false)
    setSelectedDiaryDate(null)
  }

  // ─── Program handlers ─────────────────────────────────────────────────────
  const resetAddProgramForm = () => { setNewProgramName(''); setNewProgramType('Program'); setNewProgramPath(''); setNewProgramEnabled(true); setNewProgramIconImage(null) }
  const closeAddModal = () => { setIsAddModalOpen(false); resetAddProgramForm() }
  const handleBrowse = async () => {
    try {
      if (newProgramType === 'URL') return
      const path = newProgramType === 'Folder' ? await window.mnAPI.selectFolder() : await window.mnAPI.selectProgram()
      if (!path) return
      setNewProgramPath(path)
      if (!newProgramName.trim()) setNewProgramName(getNameFromPath(path))
      if (newProgramType === 'Program') { const icon = await window.mnAPI.getFileIcon(path); setNewProgramIconImage(icon) }
      else setNewProgramIconImage(null)
    } catch (e) { console.error(e) }
  }
  const handleAddProgram = () => {
    if (!newProgramName.trim() || !newProgramPath.trim()) return
    const iconData = getProgramIcon(newProgramType)
    setPrograms((prev) => [...prev, { id: createId(), name: newProgramName.trim(), path: newProgramPath.trim(), type: newProgramType, iconClass: iconData.iconClass, icon: iconData.icon, iconImage: newProgramIconImage, enabled: newProgramEnabled, presets: [selectedPreset] }])
    closeAddModal()
  }
  const handleToggleProgram = (id: string) => setPrograms((prev) => prev.map((p) => p.id === id ? { ...p, enabled: !p.enabled } : p))
  const handleDeleteProgram = (id: string) => { setPrograms((prev) => prev.filter((p) => p.id !== id)); setOpenMenuId(null) }
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    setPrograms((prev) => { const oi = prev.findIndex((p) => p.id === active.id); const ni = prev.findIndex((p) => p.id === over.id); return arrayMove(prev, oi, ni) })
  }

  // ─── Launch handlers ──────────────────────────────────────────────────────
  const getLaunchDelayMs = () => ({ '1 second': 1000, '2 seconds': 2000, '3 seconds': 3000, '5 seconds': 5000 }[settings.launchDelay] ?? 1000)
  const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms))
  const resetStatusesAfterDelay = async () => {
    await wait(2000)
    setLaunchStatuses(enabledPrograms.reduce<Record<string, LaunchStatus>>((acc, p) => ({ ...acc, [p.id]: 'waiting' }), {}))
  }
  const handleLaunchSingleProgram = async (program: ProgramItem) => {
    if (isLaunching || (launchStatuses[program.id] ?? 'waiting') !== 'waiting') return
    setLaunchStatuses((prev) => ({ ...prev, [program.id]: 'launching' }))
    const result = await window.mnAPI.launchProgram({ path: program.path, type: program.type })
    await wait(1500)
    setLaunchStatuses((prev) => ({ ...prev, [program.id]: result.success ? 'completed' : 'failed' }))
    await wait(2000)
    setLaunchStatuses((prev) => ({ ...prev, [program.id]: 'waiting' }))
  }
  const handleLaunchPrograms = async () => {
    if (isLaunching) { cancelLaunchRef.current = true; return }
    if (enabledPrograms.length === 0) return
    cancelLaunchRef.current = false
    setIsLaunching(true)
    setLaunchStatuses(enabledPrograms.reduce<Record<string, LaunchStatus>>((acc, p) => ({ ...acc, [p.id]: 'waiting' }), {}))
    if (settings.launchBehavior === 'Launch all at once') {
      setLaunchStatuses((prev) => { const next = { ...prev }; enabledPrograms.forEach((p) => { next[p.id] = 'launching' }); return next })
      const results = await Promise.all(enabledPrograms.map(async (p) => ({ program: p, result: await window.mnAPI.launchProgram({ path: p.path, type: p.type }) })))
      await wait(1500)
      if (cancelLaunchRef.current) { setLaunchStatuses((prev) => { const next = { ...prev }; enabledPrograms.forEach((p) => { if (next[p.id] === 'launching') next[p.id] = 'cancelled' }); return next }); setIsLaunching(false); await resetStatusesAfterDelay(); return }
      setLaunchStatuses((prev) => { const next = { ...prev }; results.forEach(({ program, result }) => { next[program.id] = result.success ? 'completed' : 'failed' }); return next })
      setIsLaunching(false); await resetStatusesAfterDelay(); return
    }
    for (const p of enabledPrograms) {
      if (cancelLaunchRef.current) { setLaunchStatuses((prev) => ({ ...prev, [p.id]: 'cancelled' })); break }
      setLaunchStatuses((prev) => ({ ...prev, [p.id]: 'launching' }))
      const result = await window.mnAPI.launchProgram({ path: p.path, type: p.type })
      await wait(1500)
      if (cancelLaunchRef.current) { setLaunchStatuses((prev) => ({ ...prev, [p.id]: 'cancelled' })); break }
      setLaunchStatuses((prev) => ({ ...prev, [p.id]: result.success ? 'completed' : 'failed' }))
      if (!result.success && settings.stopLaunchingOnError) break
      await wait(getLaunchDelayMs())
    }
    setIsLaunching(false); await resetStatusesAfterDelay()
  }

  // ─── Settings handlers ────────────────────────────────────────────────────
  const handleToggleStartWithWindows = async () => {
    const next = !settings.startWithWindows
    updateSettings({ startWithWindows: next })
    updateSettings({ startWithWindows: await window.mnAPI.setStartWithWindows(next) })
  }
  const handleCheckForUpdates = async () => {
    setIsCheckingUpdates(true); setUpdateProgress(0)
    const has = await window.mnAPI.checkForUpdates()
    if (!has) setUpdateModalType('latest')
    window.setTimeout(() => setIsCheckingUpdates(false), 2000)
  }
  const handleStartUpdateDownload = async () => {
    setUpdateModalType('downloading'); setUpdateProgress(1)
    try { if (!await window.mnAPI.downloadUpdate()) { setUpdateProgress(0); setUpdateModalType('error') } }
    catch { setUpdateProgress(0); setUpdateModalType('error') }
  }
  const refreshDeviceStates = async () => {
    try {
      const [audio, monitor] = await Promise.all([window.mnAPI.getAudioDevice(), window.mnAPI.getMonitorOrientation()])
      if (audio) setSelectedAudioDevice(audio)
      if (monitor) setSelectedMonitorOrientation(monitor)
    } catch (e) { console.error(e) }
  }
  const handleSelectAudioDevice = async (device: AudioDevice) => {
    const r = await window.mnAPI.setAudioDevice(device)
    if (!r.success) { console.error(r.error || r.stderr); return }
    await refreshDeviceStates()
  }
  const handleSelectMonitorOrientation = async (orientation: MonitorOrientation) => {
    const r = await window.mnAPI.setMonitorOrientation(orientation)
    if (!r.success) { console.error(r.error || r.stderr); return }
    await refreshDeviceStates()
  }

  // ─── useEffects ───────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const auth = await window.mnAPI.isYoutubeMusicAuthenticated()
        setIsYtAuthenticated(auth)
        if (!auth) return
        const [loaded, cache, covers, account] = await Promise.all([
          window.mnAPI.getYoutubeMusicPlaylists(),
          window.mnAPI.loadYoutubeMusicTrackCache(),
          window.mnAPI.loadYoutubeMusicPlaylistCovers(),
          window.mnAPI.getYoutubeMusicAccount(),
        ])
        setYoutubeMusicAccount(account?.signedIn ? account : null)
        const loadedCovers = covers && typeof covers === 'object' ? covers as Record<string, string> : {}
        setPlaylistCoverOverrides(loadedCovers)
        if (!isHomeMusicPlaylistList(loaded) || loaded.length === 0) {
          resetYoutubeMusicLoginState(false)
          return
        }
        if (cache && typeof cache === 'object') setPlaylistTrackMap(cache as Record<string, PlaylistTrack[]>)
        const visible = filterHiddenHomeMusicPlaylists(loaded)
        const refreshed = applyHomeMusicPlaylistCoverOverrides(refreshHomeMusicPlaylistThumbnails(visible), loadedCovers)
        setHomeMusicPlaylists(refreshed)
        const refreshedWithLiked = applyHomeMusicPlaylistOrder([likedPlaylist, ...refreshed], settings.musicPlaylistOrder)
        if (!refreshedWithLiked.some((p) => p.id === selectedHomeMusicPlaylistId)) setSelectedHomeMusicPlaylistId(refreshedWithLiked[0]?.id ?? LIKED_PLAYLIST_ID)
      } catch (e) {
        console.error(e)
        resetYoutubeMusicLoginState(false)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!isSettingsLoaded) return
    if (!settings.musicPlaylistOrder || settings.musicPlaylistOrder.length === 0) return
    setHomeMusicPlaylists((prev) => {
      const ordered = applyHomeMusicPlaylistOrder(prev, settings.musicPlaylistOrder)
      const pk = prev.map((p) => p.id).join('|')
      const nk = ordered.map((p) => p.id).join('|')
      return pk === nk ? prev : ordered
    })
  }, [isSettingsLoaded, settings.musicPlaylistOrder, homeMusicPlaylistOrderKey])

  useEffect(() => {
    const update = () => {
      const next = homeMusicPlaylistsWithLiked.filter((p) => {
        const el = homeMusicPlaylistTitleRefs.current[p.id]
        return el ? el.scrollWidth > el.clientWidth + 1 : false
      }).map((p) => p.id)
      setOverflowingHomeMusicPlaylistIds((prev) => prev.join('|') === next.join('|') ? prev : next)
    }
    const onResize = () => window.requestAnimationFrame(update)
    update()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [homeMusicPlaylistOrderKey, homeMusicPlaylistsWithLiked])

  useEffect(() => {
    const update = () => {
      const next = Object.entries(marqueeTitleWrapRefs.current).filter(([id, wrap]) => {
        const text = marqueeTitleTextRefs.current[id]
        const span = text?.querySelector('.marquee-title-text')
        if (!wrap || !span) return false
        return span.getBoundingClientRect().width > wrap.getBoundingClientRect().width + 1
      }).map(([id]) => id)
      setOverflowingMarqueeTitleIds((prev) => prev.join('|') === next.join('|') ? prev : next)
    }
    const onResize = () => window.requestAnimationFrame(update)
    const observer = new ResizeObserver(() => window.requestAnimationFrame(update))
    Object.values(marqueeTitleWrapRefs.current).forEach((el) => { if (el) observer.observe(el) })
    const frame = window.requestAnimationFrame(update)
    const timer = window.setTimeout(update, 260)
    window.addEventListener('resize', onResize)
    return () => { window.cancelAnimationFrame(frame); window.clearTimeout(timer); window.removeEventListener('resize', onResize); observer.disconnect() }
  }, [activePage, currentTrack?.title, currentTrack?.artist, currentTrack?.id, isFullPlaylistModalOpen, playlistSearchQuery, playlistViewMode, selectedHomeMusicPlaylistId, ytPlaylistTracks, likedTrackIds])

  useEffect(() => {
    if (selectedHomeMusicPlaylistId === LIKED_PLAYLIST_ID) {
      setSelectedPlaylistTrackId(likedTracks[0]?.id ?? null)
      return
    }
    if (!isYtAuthenticated) return
    if (!selectedHomeMusicPlaylistId || selectedHomeMusicPlaylistId === 'focus') return
    const cached = playlistTrackMap[selectedHomeMusicPlaylistId]
    if (cached && cached.length > 0) {
      setYtPlaylistTracks(cached)
      if (selectedHomeMusicPlaylistId !== playingPlaylistId) setSelectedPlaylistTrackId(cached[0].id)
      return
    }
    const load = async () => {
      try {
        const tracks = await window.mnAPI.getYoutubeMusicPlaylistTracks(selectedHomeMusicPlaylistId)
        if (!Array.isArray(tracks)) {
          resetYoutubeMusicLoginState(false)
          return
        }
        if (tracks.length > 0) {
          setYtPlaylistTracks(tracks as PlaylistTrack[])
          setPlaylistTrackMap((prev) => { const next = { ...prev, [selectedHomeMusicPlaylistId]: tracks as PlaylistTrack[] }; window.mnAPI.saveYoutubeMusicTrackCache(next); return next })
          if (selectedHomeMusicPlaylistId !== playingPlaylistId) setSelectedPlaylistTrackId(tracks[0].id)
        }
      } catch (e) {
        console.error(e)
        resetYoutubeMusicLoginState(false)
      }
    }
    load()
  }, [selectedHomeMusicPlaylistId, isYtAuthenticated, likedTrackIds])

  useEffect(() => { window.mnAPI.getAppVersion().then(setAppVersion) }, [])

  useEffect(() => {
    if (activePage !== 'home') return
    const refresh = () => refreshDeviceStates()
    refresh()
    const id = window.setInterval(refresh, 1000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(id); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [activePage])

  useEffect(() => {
    const update = () => setCurrentDate(new Date())
    update()
    const id = window.setInterval(update, 1000)
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    return () => { window.clearInterval(id); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update) }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemTheme(mq.matches ? 'dark' : 'light')
    const onChange = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const load = async () => {
      try { const s = await window.mnAPI.loadPrograms(); if (isProgramList(s)) setPrograms(s) }
      catch (e) { console.error(e) }
      finally { setIsProgramsLoaded(true) }
    }
    load()
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const s = await window.mnAPI.loadSettings()
        if (isSettings(s)) {
          const loadedSettings = { ...defaultSettings, ...s }
          setSettings(loadedSettings)
          if (typeof loadedSettings.musicVolume === 'number') {
            setHomeMusicVolume(loadedSettings.musicVolume)
            homeMusicVolumeRef.current = loadedSettings.musicVolume
          }
          if (loadedSettings.playlistViewMode === 'list' || loadedSettings.playlistViewMode === 'grid') {
            setPlaylistViewMode(loadedSettings.playlistViewMode)
          }
          if (loadedSettings.lastTrack) {
            const t = loadedSettings.lastTrack
            setCurrentTrack({ id: t.videoId, title: t.title, artist: t.artist, thumbnail: t.thumbnail, duration: '' })
            setPlayingPlaylistId(t.playlistId)
            setSelectedHomeMusicPlaylistId(t.playlistId || 'focus')
          }
        }
      } catch (e) { console.error(e) }
      finally { setIsSettingsLoaded(true) }
    }
    load()
  }, [])

  useEffect(() => {
    const load = async () => {
      try { const d = await window.mnAPI.loadDiaries(); if (isDiaryEntries(d)) setDiaryEntries(d) }
      catch (e) { console.error(e) }
      finally { setIsDiariesLoaded(true) }
    }
    load()
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const loaded = await window.mnAPI.loadLikedTracks()
        if (Array.isArray(loaded)) {
          setLikedTrackIds([...new Set(loaded.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))])
        }
      } catch (e) { console.error(e) }
      finally { setIsLikedTracksLoaded(true) }
    }
    load()
  }, [])

  useEffect(() => { if (!isProgramsLoaded) return; window.mnAPI.savePrograms(programs).catch(console.error) }, [programs, isProgramsLoaded])
  useEffect(() => { if (!isSettingsLoaded) return; window.mnAPI.saveSettings(settings).catch(console.error) }, [settings, isSettingsLoaded])
  useEffect(() => { if (!isDiariesLoaded) return; window.mnAPI.saveDiaries(diaryEntries).catch(console.error) }, [diaryEntries, isDiariesLoaded])
  useEffect(() => { if (!isLikedTracksLoaded) return; window.mnAPI.saveLikedTracks(likedTrackIds).catch(console.error) }, [likedTrackIds, isLikedTracksLoaded])

  useEffect(() => {
    if (!isAddModalOpen) return
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAddModal() }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [isAddModalOpen])

  useEffect(() => {
    const rm1 = window.mnAPI.onUpdateAvailable(() => window.setTimeout(() => setUpdateModalType('available'), 850))
    const rm2 = window.mnAPI.onUpdateProgress((p) => setUpdateProgress(Math.max(1, Math.min(99, Math.round(p.percent)))))
    const rm3 = window.mnAPI.onUpdateDownloaded(() => { setUpdateProgress(100); window.setTimeout(() => setUpdateModalType('ready'), 500) })
    return () => { rm1(); rm2(); rm3() }
  }, [])

  useEffect(() => {
    if (activePage !== 'writeDiary') return
    setDiaryText(todayDiaryEntry?.content ?? '')
  }, [activePage, todayDateKey, todayDiaryEntry?.content])

  useEffect(() => {
    if (!isDiaryPickerOpen) return
    window.requestAnimationFrame(() => {
      diaryMonthWheelRef.current?.scrollTo({ top: diaryPickerMonthIndex * 60 })
      diaryYearWheelRef.current?.scrollTo({ top: (diaryPickerYear - diaryPickerMinYear) * 60 })
    })
  }, [isDiaryPickerOpen])

  useEffect(() => {
    const hasModal = isDiaryPickerOpen || Boolean(selectedDiaryDate) || isDeleteDiaryConfirmOpen || isFullPlaylistModalOpen || isYoutubeLoginModalOpen || Boolean(updateModalType) || isAddModalOpen
    if (!hasModal) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (isDeleteDiaryConfirmOpen) { setIsDeleteDiaryConfirmOpen(false); return }
      if (selectedDiaryDate) { setSelectedDiaryDate(null); return }
      if (isDiaryPickerOpen) { setIsDiaryPickerOpen(false); return }
      if (isFullPlaylistModalOpen) { setIsFullPlaylistModalOpen(false); return }
      if (isYoutubeLoginModalOpen) { setIsYoutubeLoginModalOpen(false); return }
      if (updateModalType) { setUpdateModalType(null); return }
      if (isAddModalOpen) closeAddModal()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [isDiaryPickerOpen, selectedDiaryDate, isDeleteDiaryConfirmOpen, isFullPlaylistModalOpen, isYoutubeLoginModalOpen, updateModalType, isAddModalOpen])

  useEffect(() => {
    const isMusicShortcutPage = activePage === 'home' || activePage === 'playlist'
    if (!isMusicShortcutPage) return
    if (!currentVideoId) return

    const hasModal = isDiaryPickerOpen || Boolean(selectedDiaryDate) || isDeleteDiaryConfirmOpen || isFullPlaylistModalOpen || isYoutubeLoginModalOpen || Boolean(updateModalType) || isAddModalOpen
    if (hasModal) return

    const preventFocusedButtonSpaceClick = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.key !== ' ') return
      if (shouldIgnoreMusicShortcut(event.target)) return

      event.preventDefault()
    }

    const onSpaceTogglePlayback = (event: KeyboardEvent) => {
      if (event.repeat) return
      if (event.code !== 'Space' && event.key !== ' ') return
      if (shouldIgnoreMusicShortcut(event.target)) return

      event.preventDefault()
      togglePlayPause()
    }

    window.addEventListener('keydown', onSpaceTogglePlayback)
    window.addEventListener('keyup', preventFocusedButtonSpaceClick)

    return () => {
      window.removeEventListener('keydown', onSpaceTogglePlayback)
      window.removeEventListener('keyup', preventFocusedButtonSpaceClick)
    }
  }, [
    activePage,
    currentVideoId,
    isDiaryPickerOpen,
    selectedDiaryDate,
    isDeleteDiaryConfirmOpen,
    isFullPlaylistModalOpen,
    isYoutubeLoginModalOpen,
    updateModalType,
    isAddModalOpen,
    isHomeMusicPlaying,
  ])

  useEffect(() => {
    homeMusicVolumeRef.current = homeMusicVolume
    if (!currentVideoId) return
    applyYtVolumeWithRetry()
  }, [homeMusicVolume, currentVideoId])

  useEffect(() => { if (!isSettingsLoaded) return; updateSettings({ musicVolume: homeMusicVolume }) }, [homeMusicVolume, isSettingsLoaded])

  useEffect(() => {
    if (!currentVideoId) {
      if (isYoutubePlayerUsable()) runYtCommandNow('stopVideo')
      return
    }

    pendingYoutubeVideoIdRef.current = currentVideoId
    void createYoutubePlayer(currentVideoId).catch((error) => console.warn('Failed to create YouTube player:', error))
  }, [currentVideoId, youtubePlayerOrigin])

  useEffect(() => {
    if (!currentVideoId || !isHomeMusicPlaying) return
    const id = window.setInterval(() => {
      if (isSeekingRef.current || isPreparingNextVideoRef.current) return
      if (isWaitingForFreshVideoTimeRef.current) {
        if (Date.now() < pendingVideoChangeUntilRef.current) return
        isWaitingForFreshVideoTimeRef.current = false
        pendingVideoChangeUntilRef.current = 0
      }
      if (Date.now() < pendingVideoChangeUntilRef.current) return
      if (!isYoutubePlayerUsable()) return

      const player = ytPlayerRef.current
      if (!player) return

      try {
        const current = typeof player.getCurrentTime === 'function' ? Math.max(0, Math.floor(player.getCurrentTime() || 0)) : ytCurrentTime
        const receivedDuration = typeof player.getDuration === 'function' ? Math.max(0, Math.round(player.getDuration() || 0)) : 0
        const dur = receivedDuration > 0 ? receivedDuration : ytDurationRef.current

        if (dur > 0) {
          const next = Math.min(current, dur)
          setYtDuration(dur)
          ytDurationRef.current = dur
          setYtCurrentTime(next)
          setHomeMusicProgress(Math.max(0, Math.min(100, (next / dur) * 100)))
          if (next >= dur) window.setTimeout(() => playNextTrackRef.current(), 800)
          return
        }

        setYtCurrentTime(current)
      } catch (error) {
        console.warn('Failed to read YouTube player time:', error)
      }
    }, 500)
    return () => window.clearInterval(id)
  }, [currentVideoId, isHomeMusicPlaying, ytCurrentTime])

  useEffect(() => {
    return () => {
      if (youtubeDeferredTimerRef.current) window.clearTimeout(youtubeDeferredTimerRef.current)
      if (youtubeSwitchTimerRef.current) window.clearTimeout(youtubeSwitchTimerRef.current)
      try { ytPlayerRef.current?.destroy?.() } catch { /* 무시 */ }
      ytPlayerRef.current = null
      youtubePlayerReadyRef.current = false
    }
  }, [])

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="app"
      data-theme={activeTheme}
      data-accent={settings.accentColor}
      data-wallpaper={isCustomWallpaperMode && settings.customWallpaper ? 'true' : undefined}
      style={appStyle}
    >
      {/* 타이틀바 */}
      <div className="custom-titlebar">
        <div className="custom-titlebar-controls">
          <button type="button" className="titlebar-minimize" onClick={() => window.mnAPI.minimizeWindow()}></button>
          <button type="button" onClick={() => window.mnAPI.closeWindow()}>×</button>
        </div>
      </div>

      {/* 사이드바 */}
      <aside className="sidebar">
        <button type="button" className={`brand ${activePage === 'home' ? 'active' : ''}`} onClick={() => setActivePage('home')}>
          <img src={logoMap[settings.accentColor]} alt="MN Logo" className="brand-logo" />
        </button>
        <nav className="menu">
          {([
            { page: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
            { page: 'programs',  icon: 'programs',  label: 'Programs'  },
          ] as const).map(({ page, icon, label }) => (
            <button key={page} className={`menu-item ${activePage === page ? 'active' : ''}`} onClick={() => setActivePage(page)}>
              <img src={getThemeIcon(icon, activePage === page)} alt="" className="menu-icon" />
              {label}
            </button>
          ))}
          <button className={`menu-item ${activePage === 'diary' || activePage === 'writeDiary' ? 'active' : ''}`} onClick={() => setActivePage('diary')}>
            <img src={getThemeIcon('date', activePage === 'diary' || activePage === 'writeDiary')} alt="" className="menu-icon" />
            Diary
          </button>
          <button className={`menu-item ${activePage === 'playlist' ? 'active' : ''}`} onClick={() => setActivePage('playlist')}>
            <img
              src={
                activeTheme === 'dark'
                  ? musicControlIconMap.playlist.white
                  : getMusicControlIcon('playlist', activePage === 'playlist')
              }
              alt=""
              className="menu-icon"
            />
            Playlist
          </button>
          <button className={`menu-item ${activePage === 'settings' ? 'active' : ''}`} onClick={() => setActivePage('settings')}>
            <img src={getThemeIcon('settings', activePage === 'settings')} alt="" className="menu-icon" />
            Settings
          </button>
        </nav>
        <div className="sidebar-accent-picker" aria-label="Quick appearance controls">
          <button
            type="button"
            className="sidebar-theme-toggle"
            aria-label={activeTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={activeTheme === 'dark' ? 'Light mode' : 'Dark mode'}
            onMouseEnter={() => setIsSidebarThemeToggleHovered(true)}
            onMouseLeave={() => setIsSidebarThemeToggleHovered(false)}
            onClick={() => updateSettings({ theme: activeTheme === 'dark' ? 'Light' : 'Dark' })}
          >
            <img
              src={themeIconMap[activeTheme][isSidebarThemeToggleHovered ? settings.accentColor : 'gray']}
              alt=""
              className="sidebar-theme-icon"
            />
          </button>
          {(['purple', 'blue', 'green', 'orange', 'red', 'gray'] as const).map((color) => (
            <button
              key={color}
              type="button"
              className={`sidebar-accent-dot ${settings.accentColor === color ? 'active' : ''}`}
              style={{
                '--sidebar-dot-color': accentColorMap[color],
                '--sidebar-dot-ring': accentRingMap[color],
              } as CSSProperties}
              aria-label={`Set accent color to ${color}`}
              title={color}
              onClick={() => updateSettings({ accentColor: color })}
            />
          ))}
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="content" onClick={() => setOpenMenuId(null)}>
        {activePage === 'home' && (
          <HomePage
            selectedPreset={selectedPreset} isLaunching={isLaunching} enabledProgramCount={enabledProgramCount}
            accentColor={settings.accentColor}
            isDarkTheme={activeTheme === 'dark'}
            onSetSelectedPreset={setSelectedPreset} onLaunchPrograms={handleLaunchPrograms}
            selectedAudioDevice={selectedAudioDevice} selectedMonitorOrientation={selectedMonitorOrientation}
            onSelectAudioDevice={handleSelectAudioDevice} onSelectMonitorOrientation={handleSelectMonitorOrientation}
            homeMusicPlaylists={homeMusicPlaylistsWithLiked} homeMusicPlaylistPage={homeMusicPlaylistPage}
            selectedHomeMusicPlaylistId={selectedHomeMusicPlaylistId} playingPlaylistId={playingPlaylistId}
            isHomeMusicPlaying={isHomeMusicPlaying} overflowingHomeMusicPlaylistIds={overflowingHomeMusicPlaylistIds}
            homeMusicPlaylistTitleRefs={homeMusicPlaylistTitleRefs}
            onSetSelectedHomeMusicPlaylistId={setSelectedHomeMusicPlaylistId}
            onMoveHomeMusicPlaylist={handleMoveHomeMusicPlaylist} onHomeMusicPlaylistWheel={handleHomeMusicPlaylistWheel}
            onPlaylistPlay={handlePlaylistPlay}
            currentTrack={currentTrack} currentVideoId={currentVideoId} isYtAuthenticated={isYtAuthenticated}
            homeMusicVolume={homeMusicVolume} homeMusicProgress={homeMusicProgress}
            homeMusicCurrentSeconds={homeMusicCurrentSeconds} homeMusicDurationSeconds={homeMusicDurationSeconds}
            isShuffleEnabled={isShuffleEnabled}
            isTrackLiked={isTrackLiked} onToggleTrackLike={handleToggleTrackLike}
            onPlayPrevTrack={playPrevTrack} onPlayNextTrack={playNextTrack} onTogglePlayPause={togglePlayPause}
            onPlayVideo={playVideo}
            onVolumePointerDown={handleHomeMusicVolumePointerDown} onVolumePointerMove={handleHomeMusicVolumePointerMove}
            onProgressPointerDown={handleHomeMusicProgressPointerDown} onProgressPointerMove={handleHomeMusicProgressPointerMove}
            onProgressPointerUp={handleHomeMusicProgressPointerUp}
            onSetIsShuffleEnabled={setIsShuffleEnabled}
            onOpenFullPlaylist={() => setIsFullPlaylistModalOpen(true)} onOpenYoutubeLogin={() => setIsYoutubeLoginModalOpen(true)}
            formatHomeMusicTime={formatHomeMusicTime} getThemeIcon={getThemeIcon} getMusicControlIcon={getMusicControlIcon}
            getLikeIcon={getLikeIcon}
            renderMarqueeTitle={renderMarqueeTitle} isMarqueeTitleOverflowing={isMarqueeTitleOverflowing}
            marqueeTitleWrapRefs={marqueeTitleWrapRefs}
          />
        )}

        {activePage === 'playlist' && (
          <PlaylistPage
            homeMusicPlaylists={homeMusicPlaylistsWithLiked} filteredHomeMusicPlaylists={filteredHomeMusicPlaylists}
            selectedHomeMusicPlaylistId={selectedHomeMusicPlaylistId} selectedHomeMusicPlaylist={selectedHomeMusicPlaylist}
            playingPlaylistId={playingPlaylistId} isHomeMusicPlaying={isHomeMusicPlaying}
            accentColor={settings.accentColor}
            playlistViewMode={playlistViewMode} playlistSearchQuery={playlistSearchQuery}
            isPlaylistRefreshing={isPlaylistRefreshing} isYtAuthenticated={isYtAuthenticated}
            ytPlaylistTracks={selectedPlaylistTracks} fallbackPlaylistTracks={fallbackPlaylistTracks}
            currentTrack={currentTrack}
            homeMusicProgress={homeMusicProgress} homeMusicCurrentSeconds={homeMusicCurrentSeconds}
            homeMusicDurationSeconds={homeMusicDurationSeconds} homeMusicVolume={homeMusicVolume}
            isShuffleEnabled={isShuffleEnabled}
            isTrackLiked={isTrackLiked} onToggleTrackLike={handleToggleTrackLike}
            onSetSelectedHomeMusicPlaylistId={setSelectedHomeMusicPlaylistId}
            onSetHomeMusicPlaylists={(playlists) => setHomeMusicPlaylists(playlists.filter((playlist) => playlist.id !== LIKED_PLAYLIST_ID))} onUpdateSettings={updateSettings}
            onPlaylistPlay={handlePlaylistPlay} onPlayVideo={playVideo} onTogglePlayPause={togglePlayPause}
            onSetPlaylistViewMode={(mode) => {
              setPlaylistViewMode(mode)
              updateSettings({ playlistViewMode: mode })
            }} onSetPlaylistSearchQuery={setPlaylistSearchQuery}
            onRefreshPlaylists={handleRefreshPlaylists}
            onOpenYoutubeLogin={() => setIsYoutubeLoginModalOpen(true)}
            onOpenFullPlaylist={() => setIsFullPlaylistModalOpen(true)}
            onChangeCover={handleChangePlaylistCover} onSetIsShuffleEnabled={setIsShuffleEnabled}
            onVolumePointerDown={handleHomeMusicVolumePointerDown} onVolumePointerMove={handleHomeMusicVolumePointerMove}
            onProgressPointerDown={handleHomeMusicProgressPointerDown} onProgressPointerMove={handleHomeMusicProgressPointerMove}
            onProgressPointerUp={handleHomeMusicProgressPointerUp}
            formatHomeMusicTime={formatHomeMusicTime} getThemeIcon={getThemeIcon} getMusicControlIcon={getMusicControlIcon}
            getLikeIcon={getLikeIcon}
            renderMarqueeTitle={renderMarqueeTitle} isMarqueeTitleOverflowing={isMarqueeTitleOverflowing}
            marqueeTitleWrapRefs={marqueeTitleWrapRefs}
          />
        )}

        {activePage === 'dashboard' && (
          <DashboardPage
            currentTimeText={currentTimeText} currentMeridiemText={currentMeridiemText}
            currentDateText={currentDateText} currentWeekdayText={currentWeekdayText}
            selectedPreset={selectedPreset} isLaunching={isLaunching} enabledProgramCount={enabledProgramCount}
            enabledPrograms={enabledPrograms} launchStatuses={launchStatuses} accentColor={settings.accentColor}
            onSetSelectedPreset={setSelectedPreset} onLaunchPrograms={handleLaunchPrograms}
            onLaunchSingleProgram={handleLaunchSingleProgram} getThemeIcon={getThemeIcon}
          />
        )}

        {activePage === 'diary' && (
          <DiaryPage
            currentDate={currentDate} diaryDisplayDate={diaryDisplayDate}
            diaryEntries={diaryEntries} todayDiaryEntry={todayDiaryEntry}
            onSetActivePage={(p) => setActivePage(p)} onMoveDiaryMonth={handleMoveDiaryMonth}
            onOpenDiaryPickerWithDate={() => { setDiaryPickerMonthIndex(diaryDisplayDate.getMonth()); setDiaryPickerYear(diaryDisplayDate.getFullYear()); setIsDiaryPickerOpen(true) }}
            onSetDiaryDisplayDate={setDiaryDisplayDate} onOpenDiaryDate={handleOpenDiaryDate}
          />
        )}

        {activePage === 'writeDiary' && (
          <WriteDiaryPage
            currentDate={currentDate} diaryText={diaryText}
            isDiarySaveButtonPressed={isDiarySaveButtonPressed} isDiarySavedVisible={isDiarySavedVisible}
            onSetActivePage={(p) => setActivePage(p)} onSetDiaryText={setDiaryText}
            onSaveDiary={handleSaveDiary} getThemeIcon={getThemeIcon}
          />
        )}

        {activePage === 'programs' && (
          <ProgramsPage
            selectedPreset={selectedPreset} programs={programs} presetPrograms={presetPrograms}
            openMenuId={openMenuId}
            onSetSelectedPreset={setSelectedPreset} onSetIsAddModalOpen={setIsAddModalOpen}
            onSetOpenMenuId={setOpenMenuId} onToggleProgram={handleToggleProgram}
            onDeleteProgram={handleDeleteProgram} onDragEnd={handleDragEnd}
          />
        )}

        {activePage === 'settings' && (
          <SettingsPage
            settings={settings} appVersion={appVersion} isCheckingUpdates={isCheckingUpdates}
            isPlaylistRefreshing={isPlaylistRefreshing} activeTheme={activeTheme}
            isYtAuthenticated={isYtAuthenticated} youtubeMusicAccount={youtubeMusicAccount}
            isYoutubeAccountLoading={isYoutubeAccountLoading}
            onUpdateSettings={updateSettings} onToggleStartWithWindows={handleToggleStartWithWindows}
            onCheckForUpdates={handleCheckForUpdates} onReloadYoutubeMusicData={handleReloadYoutubeMusicData}
            onLoginYoutubeMusic={handleLoginYoutubeMusicFromSettings}
            onLogoutYoutubeMusic={handleLogoutYoutubeMusic}
            getThemeIcon={getThemeIcon}
          />
        )}

        {/* 모달들 */}
        {isDiaryPickerOpen && (
          <DiaryPickerModal
            diaryPickerMonthIndex={diaryPickerMonthIndex} diaryPickerYear={diaryPickerYear}
            diaryPickerMinYear={diaryPickerMinYear} diaryPickerMaxYear={diaryPickerMaxYear}
            diaryMonthWheelRef={diaryMonthWheelRef} diaryYearWheelRef={diaryYearWheelRef}
            onClose={() => setIsDiaryPickerOpen(false)}
            onMonthScroll={handleDiaryMonthScroll} onYearScroll={handleDiaryYearScroll}
            onConfirm={() => { setDiaryDisplayDate(new Date(diaryPickerYear, diaryPickerMonthIndex, 1)); setIsDiaryPickerOpen(false) }}
          />
        )}

        {selectedDiaryDate && selectedDiaryEntry && (
          <DiaryViewModal
            selectedDiaryDate={selectedDiaryDate} selectedDiaryEntry={selectedDiaryEntry}
            onClose={() => setSelectedDiaryDate(null)}
            onDelete={() => setIsDeleteDiaryConfirmOpen(true)}
            getThemeIcon={getThemeIcon}
          />
        )}

        {isDeleteDiaryConfirmOpen && (
          <DiaryDeleteModal
            onClose={() => setIsDeleteDiaryConfirmOpen(false)}
            onConfirm={handleConfirmDeleteDiary}
          />
        )}

        {updateModalType && (
          <UpdateModal
            updateModalType={updateModalType} updateProgress={updateProgress}
            appVersion={appVersion} accentColor={settings.accentColor}
            onClose={() => setUpdateModalType(null)}
            onStartDownload={handleStartUpdateDownload}
            onInstall={() => window.mnAPI.installUpdate()}
          />
        )}

        {isYoutubeLoginModalOpen && (
          <YoutubeLoginModal
            onClose={() => setIsYoutubeLoginModalOpen(false)}
            onLoginSuccess={(playlists) => {
              const visible = filterHiddenHomeMusicPlaylists(playlists)
              const refreshed = applyHomeMusicPlaylistCoverOverrides(refreshHomeMusicPlaylistThumbnails(visible), playlistCoverOverrides)
              setIsYtAuthenticated(true)
              setIsYoutubeLoginModalOpen(false)
              setHomeMusicPlaylists(refreshed)
              setSelectedHomeMusicPlaylistId(refreshed[0]?.id ?? LIKED_PLAYLIST_ID)
              loadYoutubeMusicAccount()
            }}
          />
        )}

        {isFullPlaylistModalOpen && (
          <FullPlaylistModal
            selectedHomeMusicPlaylist={selectedHomeMusicPlaylist}
            selectedHomeMusicPlaylistId={selectedHomeMusicPlaylistId}
            fullPlaylistTracks={fullPlaylistTracks} filteredFullPlaylistTracks={filteredFullPlaylistTracks}
            fullPlaylistSearchQuery={fullPlaylistSearchQuery}
            normalizedFullPlaylistSearchQuery={normalizedFullPlaylistSearchQuery}
            currentTrack={currentTrack} playingPlaylistId={playingPlaylistId}
            accentColor={settings.accentColor}
            isHomeMusicPlaying={isHomeMusicPlaying} playingFullPlaylistTrackId={playingFullPlaylistTrackId}
            isTrackLiked={isTrackLiked} onToggleTrackLike={handleToggleTrackLike}
            onClose={() => setIsFullPlaylistModalOpen(false)}
            onPlaylistPlay={handlePlaylistPlay} onPlayVideo={playVideo} onTogglePlayPause={togglePlayPause}
            onSetFullPlaylistSearchQuery={setFullPlaylistSearchQuery}
            renderMarqueeTitle={renderMarqueeTitle} isMarqueeTitleOverflowing={isMarqueeTitleOverflowing}
            marqueeTitleWrapRefs={marqueeTitleWrapRefs} getThemeIcon={getThemeIcon}
            getLikeIcon={getLikeIcon}
          />
        )}

        {isAddModalOpen && (
          <AddProgramModal
            newProgramName={newProgramName} newProgramType={newProgramType}
            newProgramPath={newProgramPath} newProgramEnabled={newProgramEnabled}
            onSetNewProgramName={setNewProgramName} onSetNewProgramType={setNewProgramType}
            onSetNewProgramPath={setNewProgramPath} onSetNewProgramIconImage={setNewProgramIconImage}
            onSetNewProgramEnabled={setNewProgramEnabled}
            onClose={closeAddModal} onAdd={handleAddProgram} onBrowse={handleBrowse}
          />
        )}
      </main>

      {shouldShowFloatingMusicPlayer && currentTrack && (
        <FloatingMusicPlayer
          mode={floatingPlayerMode}
          isHidden={isFloatingPlayerHidden}
          position={isFloatingPlayerHidden ? null : settings.floatingPlayerPosition ?? null}
          currentTrack={currentTrack}
          isPlaying={isHomeMusicPlaying}
          isShuffleEnabled={isShuffleEnabled}
          isLiked={isTrackLiked(currentTrack.id)}
          getLikeIcon={getLikeIcon}
          accentColor={settings.accentColor}
          progress={homeMusicProgress}
          volume={homeMusicVolume}
          currentSeconds={homeMusicCurrentSeconds}
          durationSeconds={homeMusicDurationSeconds}
          speakerIcon={getThemeIcon('speaker')}
          shuffleIcon={getMusicControlIcon('shuffle', isShuffleEnabled)}
          playlistIcon={
            activeTheme === 'dark'
              ? musicControlIconMap.playlist.white
              : getMusicControlIcon('playlist')
          }
          listIcon={getMusicControlIcon('list', activeTheme !== 'dark')}
          listActiveIcon={getMusicControlIcon('list')}
          onChangeMode={(mode) => {
            updateSettings({
              floatingPlayerMode: mode,
              floatingPlayerPosition: null,
            })
          }}
          onChangeHidden={(hidden) => {
            updateSettings({
              floatingPlayerHidden: hidden,
              floatingPlayerPosition: null,
            })
          }}
          onChangePosition={(position) => updateSettings({ floatingPlayerPosition: position })}
          onTogglePlayPause={togglePlayPause}
          onPlayPrevTrack={playPrevTrack}
          onPlayNextTrack={playNextTrack}
          onToggleShuffle={() => setIsShuffleEnabled((prev) => !prev)}
          onToggleLike={() => handleToggleTrackLike(currentTrack.id)}
          onOpenFullPlaylist={() => setIsFullPlaylistModalOpen(true)}
          onVolumePointerDown={handleHomeMusicVolumePointerDown}
          onVolumePointerMove={handleHomeMusicVolumePointerMove}
          onProgressPointerDown={handleHomeMusicProgressPointerDown}
          onProgressPointerMove={handleHomeMusicProgressPointerMove}
          onProgressPointerUp={handleHomeMusicProgressPointerUp}
          formatTime={formatHomeMusicTime}
        />
      )}

      {/* 숨겨진 YouTube 플레이어 */}
      <div
        ref={ytPlayerHostRef}
        style={{
          position: 'fixed',
          width: 200,
          height: 200,
          opacity: 0,
          pointerEvents: 'none',
          bottom: 0,
          right: 0,
          border: 0,
          overflow: 'hidden',
        }}
        aria-hidden="true"
      />
    </div>
  )
}

export default App
