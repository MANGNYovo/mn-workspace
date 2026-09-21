import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { useLikeBurst } from '../components'
import { motion } from 'framer-motion'
import type { HomeMusicPlaylist, PlaylistTrack, AudioDevice, MonitorOrientation, AccentColor, CalendarSchedule, HomeShortcut } from '../types'
import { accentColorMap, rocketMap, iconMap, playbackIconMap } from '../constants'
import youtubeMusicIcon from '../assets/youtubemusic.png'
import rocketActive from '../assets/rocket-active.png'

const HOME_SHORTCUT_MIN_SLOTS = 3
const HOME_SHORTCUT_MAX_SLOTS = 6
const HOME_SHORTCUT_BUTTON_SIZE = 36
const HOME_SHORTCUT_GAP = 28
const HOME_SHORTCUT_HORIZONTAL_PADDING = 18

const clampHomeShortcutSlots = (count: number) => Math.min(HOME_SHORTCUT_MAX_SLOTS, Math.max(HOME_SHORTCUT_MIN_SLOTS, count))
const getHomeShortcutDockWidth = (count: number) =>
  count * HOME_SHORTCUT_BUTTON_SIZE + (count - 1) * HOME_SHORTCUT_GAP + HOME_SHORTCUT_HORIZONTAL_PADDING

type Props = {
  // preset & launch
  selectedPreset: number
  isLaunching: boolean
  enabledProgramCount: number
  onSetSelectedPreset: (preset: number) => void
  onLaunchPrograms: () => void
  accentColor: AccentColor
  isDarkTheme: boolean
  todaySchedules: CalendarSchedule[]
  homeShortcuts: Array<HomeShortcut | null>
  homeShortcutSlotCount: number
  onHomeShortcutSlotCountChange: (count: number) => void
  onConfigureHomeShortcut: (index: number) => void
  onLaunchHomeShortcut: (shortcut: HomeShortcut) => void
  onChangeHomeShortcutIcon: (index: number) => void
  onRemoveHomeShortcut: (index: number) => void
  // device
  selectedAudioDevice: AudioDevice
  selectedMonitorOrientation: MonitorOrientation
  onSelectAudioDevice: (device: AudioDevice) => void
  onSelectMonitorOrientation: (orientation: MonitorOrientation) => void
  // playlist
  homeMusicPlaylists: HomeMusicPlaylist[]
  homeMusicPlaylistPage: number
  selectedHomeMusicPlaylistId: string
  playingPlaylistId: string | null
  isHomeMusicPlaying: boolean
  overflowingHomeMusicPlaylistIds: string[]
  homeMusicPlaylistTitleRefs: React.MutableRefObject<Record<string, HTMLElement | null>>
  onSetSelectedHomeMusicPlaylistId: (id: string) => void
  onMoveHomeMusicPlaylist: (direction: -1 | 1) => void
  onHomeMusicPlaylistWheel: (event: WheelEvent) => void
  onPlaylistPlay: (id: string) => void
  // player
  currentTrack: PlaylistTrack | null
  currentVideoId: string | null
  isYtAuthenticated: boolean
  homeMusicVolume: number
  homeMusicProgress: number
  homeMusicCurrentSeconds: number
  homeMusicDurationSeconds: number
  isShuffleEnabled: boolean
  isTrackLiked: (trackId?: string | null) => boolean
  onToggleTrackLike: (trackId?: string | null) => void
  onPlayPrevTrack: () => void
  onPlayNextTrack: () => void
  onTogglePlayPause: () => void
  onPlayVideo: (id: string, fromPlaylistId?: string, trackInfo?: PlaylistTrack) => void
  onVolumePointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void
  onVolumePointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void
  onToggleMute: () => void
  onProgressPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void
  onProgressPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void
  onProgressPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void
  onSetIsShuffleEnabled: (v: boolean | ((prev: boolean) => boolean)) => void
  onOpenFullPlaylist: () => void
  onOpenYoutubeLogin: () => void
  formatHomeMusicTime: (seconds: number) => string
  getThemeIcon: (name: keyof typeof iconMap, isActive?: boolean) => string
  getMusicControlIcon: (name: keyof typeof import('../constants').musicControlIconMap, isActive?: boolean) => string
  getLikeIcon: (isLiked: boolean, isHovered?: boolean) => string
  renderMarqueeTitle: (key: string, text: string) => React.ReactNode
  isMarqueeTitleOverflowing: (key: string) => boolean
  marqueeTitleWrapRefs: React.MutableRefObject<Record<string, HTMLElement | null>>
}

export function HomePage({
  selectedPreset, isLaunching, enabledProgramCount, onSetSelectedPreset, onLaunchPrograms, accentColor, isDarkTheme,
  todaySchedules, homeShortcuts, homeShortcutSlotCount, onHomeShortcutSlotCountChange,
  onConfigureHomeShortcut, onLaunchHomeShortcut, onChangeHomeShortcutIcon, onRemoveHomeShortcut,
  selectedAudioDevice, selectedMonitorOrientation, onSelectAudioDevice, onSelectMonitorOrientation,
  homeMusicPlaylists, homeMusicPlaylistPage, selectedHomeMusicPlaylistId, playingPlaylistId,
  isHomeMusicPlaying, overflowingHomeMusicPlaylistIds, homeMusicPlaylistTitleRefs,
  onSetSelectedHomeMusicPlaylistId, onMoveHomeMusicPlaylist, onHomeMusicPlaylistWheel, onPlaylistPlay,
  currentTrack, currentVideoId, isYtAuthenticated, homeMusicVolume, homeMusicProgress,
  homeMusicCurrentSeconds, homeMusicDurationSeconds, isShuffleEnabled,
  isTrackLiked, onToggleTrackLike,
  onPlayPrevTrack, onPlayNextTrack, onTogglePlayPause, onPlayVideo,
  onVolumePointerDown, onVolumePointerMove, onToggleMute, onProgressPointerDown, onProgressPointerMove, onProgressPointerUp,
  onSetIsShuffleEnabled, onOpenFullPlaylist, onOpenYoutubeLogin,
  formatHomeMusicTime, getThemeIcon, getMusicControlIcon, getLikeIcon,
  renderMarqueeTitle, isMarqueeTitleOverflowing, marqueeTitleWrapRefs,
}: Props) {
  const [isListButtonHovered, setIsListButtonHovered] = useState(false)
  const [isShuffleButtonHovered, setIsShuffleButtonHovered] = useState(false)
  const [isLikeButtonHovered, setIsLikeButtonHovered] = useState(false)
  const [shortcutMenu, setShortcutMenu] = useState<{ index: number; x: number; y: number } | null>(null)
  const [shortcutSlotPreview, setShortcutSlotPreview] = useState(() => clampHomeShortcutSlots(homeShortcutSlotCount))
  const [shortcutResizeWidth, setShortcutResizeWidth] = useState<number | null>(null)
  const [isShortcutResizing, setIsShortcutResizing] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const { isBursting: isLikeButtonBursting, triggerBurst: triggerLikeBurst } = useLikeBurst()

  const homeMusicPlaylistWindowRef = useRef<HTMLDivElement | null>(null)
  const shortcutDockRef = useRef<HTMLDivElement | null>(null)
  const shortcutResizeRef = useRef<{
    side: 'left' | 'right'
    startX: number
    startWidth: number
    startCount: number
  } | null>(null)
  const shortcutSlotPreviewRef = useRef(shortcutSlotPreview)

  useEffect(() => {
    const playlistWindow = homeMusicPlaylistWindowRef.current
    if (!playlistWindow) return

    playlistWindow.addEventListener('wheel', onHomeMusicPlaylistWheel, { passive: false })
    return () => playlistWindow.removeEventListener('wheel', onHomeMusicPlaylistWheel)
  }, [onHomeMusicPlaylistWheel, homeMusicPlaylists.length, homeMusicPlaylistPage])

  useEffect(() => {
    if (shortcutResizeRef.current) return
    const nextCount = clampHomeShortcutSlots(homeShortcutSlotCount)
    shortcutSlotPreviewRef.current = nextCount
    setShortcutSlotPreview(nextCount)
  }, [homeShortcutSlotCount])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!shortcutMenu) return

    const closeMenu = () => setShortcutMenu(null)
    const closeMenuOnKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu()
    }

    window.addEventListener('pointerdown', closeMenu)
    window.addEventListener('blur', closeMenu)
    window.addEventListener('resize', closeMenu)
    window.addEventListener('keydown', closeMenuOnKey)
    return () => {
      window.removeEventListener('pointerdown', closeMenu)
      window.removeEventListener('blur', closeMenu)
      window.removeEventListener('resize', closeMenu)
      window.removeEventListener('keydown', closeMenuOnKey)
    }
  }, [shortcutMenu])

  const hours12 = now.getHours() % 12 || 12
  const clockTime = `${String(hours12).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const clockPeriod = now.getHours() >= 12 ? 'PM' : 'AM'
  const clockDate = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
  const clockWeekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(now).toUpperCase()

  const parseScheduleTimestamp = (schedule: CalendarSchedule) => {
    if (!schedule.time) return null
    const match = schedule.time.match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return null

    const [, rawHour, rawMinute] = match
    const hour = Number(rawHour)
    const minute = Number(rawMinute)
    if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null

    const timestamp = new Date(now)
    timestamp.setHours(hour, minute, 0, 0)
    return timestamp
  }

  const visibleSchedules = [...todaySchedules]
    .filter((schedule) => {
      const scheduleTimestamp = parseScheduleTimestamp(schedule)
      if (!scheduleTimestamp) return true
      return now.getTime() - scheduleTimestamp.getTime() < 5 * 60 * 1000
    })
    .sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time)
      if (a.time) return -1
      if (b.time) return 1
      return a.createdAt.localeCompare(b.createdAt)
    })
    .slice(0, 3)

  const getShortcutResizeState = (clientX: number) => {
    const resizeState = shortcutResizeRef.current
    if (!resizeState) return null

    const dragDirection = resizeState.side === 'right' ? 1 : -1
    const rawWidth = resizeState.startWidth + (clientX - resizeState.startX) * dragDirection
    const minWidth = getHomeShortcutDockWidth(HOME_SHORTCUT_MIN_SLOTS)
    const maxWidth = getHomeShortcutDockWidth(HOME_SHORTCUT_MAX_SLOTS)
    const clampedWidth = Math.min(maxWidth, Math.max(minWidth, rawWidth))
    const slotStep = HOME_SHORTCUT_BUTTON_SIZE + HOME_SHORTCUT_GAP
    const slotOffset = Math.round((clampedWidth - getHomeShortcutDockWidth(resizeState.startCount)) / slotStep)
    const slotCount = clampHomeShortcutSlots(resizeState.startCount + slotOffset)

    return { width: clampedWidth, slotCount }
  }

  const handleShortcutResizeStart = (side: 'left' | 'right', event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    setShortcutMenu(null)

    const startCount = shortcutSlotPreviewRef.current
    const startWidth = shortcutDockRef.current?.getBoundingClientRect().width ?? getHomeShortcutDockWidth(startCount)
    shortcutResizeRef.current = { side, startX: event.clientX, startWidth, startCount }
    setShortcutResizeWidth(startWidth)
    setIsShortcutResizing(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleShortcutResizeMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const next = getShortcutResizeState(event.clientX)
    if (!next) return
    event.preventDefault()
    setShortcutResizeWidth(next.width)
    if (next.slotCount !== shortcutSlotPreviewRef.current) {
      shortcutSlotPreviewRef.current = next.slotCount
      setShortcutSlotPreview(next.slotCount)
    }
  }

  const handleShortcutResizeEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    const next = getShortcutResizeState(event.clientX)
    const nextCount = next?.slotCount ?? shortcutSlotPreviewRef.current
    shortcutSlotPreviewRef.current = nextCount
    setShortcutSlotPreview(nextCount)
    setShortcutResizeWidth(null)
    setIsShortcutResizing(false)
    shortcutResizeRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    onHomeShortcutSlotCountChange(nextCount)
  }

  const handleShortcutResizeKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const delta = event.key === 'ArrowRight' ? 1 : -1
    const nextCount = clampHomeShortcutSlots(shortcutSlotPreviewRef.current + delta)
    shortcutSlotPreviewRef.current = nextCount
    setShortcutSlotPreview(nextCount)
    onHomeShortcutSlotCountChange(nextCount)
  }

  const handleLikeButtonClick = () => {
    if (currentTrack?.id && !isTrackLiked(currentTrack.id)) triggerLikeBurst()
    onToggleTrackLike(currentTrack?.id)
  }

  return (
    <section className="home-page">
      <div className="home-main-stack">
        <div className="home-top-row">
          <div className="home-card">
        <div className="home-preset-section">
          <p className="dashboard-preset-title dashboard-section-title">
            <img src={getThemeIcon('preset')} alt="" className="dashboard-title-icon" />
            Current Preset
          </p>

          <div className="home-preset-track" style={{ '--selected-preset-index': selectedPreset - 1 } as CSSProperties}>
            <span className="home-preset-active-dot"></span>
            {[1, 2, 3, 4].map((presetNumber) => (
              <button
                key={presetNumber}
                className={`home-preset-dot ${selectedPreset === presetNumber ? 'active' : ''}`}
                onClick={() => onSetSelectedPreset(presetNumber)}
              >
                <span></span>
                <b>{String(presetNumber).padStart(2, '0')}</b>
              </button>
            ))}
          </div>

          <button
            className={`home-launch-button ${isLaunching ? 'launching' : ''}`}
            onClick={onLaunchPrograms}
            disabled={enabledProgramCount === 0}
          >
            <img src={isLaunching ? rocketActive : rocketMap[accentColor]} alt="" className="home-launch-icon" />
          </button>
        </div>

        <div className="home-divider"></div>

        <div className="home-device-section">
          <div className="home-device-group">
            <p className="home-device-title home-device-title-audio">
              <img src={getThemeIcon('speaker')} alt="" className="home-device-title-icon" />
              Audio
            </p>
            <div className="home-device-buttons">
              <button
                className={`home-device-button ${selectedAudioDevice === 'speaker' ? 'active' : ''}`}
                onClick={() => onSelectAudioDevice('speaker')}
              >
                <img src={getThemeIcon('speaker', selectedAudioDevice === 'speaker')} alt="" className="home-device-icon" />
              </button>
              <button
                className={`home-device-button ${selectedAudioDevice === 'headphone' ? 'active' : ''}`}
                onClick={() => onSelectAudioDevice('headphone')}
              >
                <img src={getThemeIcon('headphone', selectedAudioDevice === 'headphone')} alt="" className="home-device-icon" />
              </button>
            </div>
          </div>

          <div className="home-device-split"></div>

          <div className="home-device-group">
            <p className="home-device-title">
              <img src={getThemeIcon('hmonitor')} alt="" className="home-device-title-icon" />
              Monitor
            </p>
            <div className="home-device-buttons">
              <button
                className={`home-device-button ${selectedMonitorOrientation === 'horizontal' ? 'active' : ''}`}
                onClick={() => onSelectMonitorOrientation('horizontal')}
              >
                <img src={getThemeIcon('hmonitor', selectedMonitorOrientation === 'horizontal')} alt="" className="home-device-icon" />
              </button>
              <button
                className={`home-device-button ${selectedMonitorOrientation === 'vertical' ? 'active' : ''}`}
                onClick={() => onSelectMonitorOrientation('vertical')}
              >
                <img src={getThemeIcon('vmonitor', selectedMonitorOrientation === 'vertical')} alt="" className="home-device-icon" />
              </button>
            </div>
          </div>
        </div>
          </div>

          <aside className="home-info-card" aria-label="Current time and today's schedule">
            <div className="home-clock-block">
              <div className="home-clock-time-row">
                <strong className="home-clock-time">{clockTime}</strong>
                <span className="home-clock-period">{clockPeriod}</span>
              </div>
              <p className="home-clock-date">{clockDate} <span>{clockWeekday}</span></p>
            </div>

            <div className="home-info-divider"></div>

            <div className="home-schedule-section">
              <div className="home-schedule-heading">
                <img src={getThemeIcon('date')} alt="" />
                <strong>Today's Schedule</strong>
              </div>

              <div className="home-schedule-list">
                {visibleSchedules.length > 0 ? visibleSchedules.map((schedule, index) => (
                  <div className="home-schedule-item" key={schedule.id}>
                    <time>{schedule.time ?? '--:--'}</time>
                    <span className={`home-schedule-marker ${index < visibleSchedules.length - 1 ? 'connected' : ''}`} aria-hidden="true">
                      <span className={`home-schedule-dot ${schedule.color ?? 'gray'}`}></span>
                    </span>
                    <span className="home-schedule-title" title={schedule.title}>{schedule.title}</span>
                  </div>
                )) : (
                  <p className="home-schedule-empty">No schedules today</p>
                )}
              </div>
            </div>
          </aside>
        </div>

        <div className="home-music-card">
        <div className="home-music-top">
          <div className="home-music-title">
            <img src={youtubeMusicIcon} alt="" className="home-youtube-icon" />
            <div><h2>YouTube Music</h2></div>
          </div>
        </div>

        <div className="home-music-playlist-row">
          <button className="home-music-arrow" onClick={() => onMoveHomeMusicPlaylist(-1)}>‹</button>

          <div ref={homeMusicPlaylistWindowRef} className="home-music-playlist-window">
            <motion.div
              className="home-music-playlist-scroll"
              animate={{ x: `calc(${homeMusicPlaylistPage} * -25% - ${homeMusicPlaylistPage} * 3.5px)` }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            >
              {homeMusicPlaylists.map((playlist) => (
                <button
                  key={playlist.id}
                  className={`home-music-playlist-card ${selectedHomeMusicPlaylistId === playlist.id ? 'active' : ''}`}
                  onClick={() => onSetSelectedHomeMusicPlaylistId(playlist.id)}
                >
                  {playlist.customThumbnail ?? playlist.thumbnail
                    ? <img src={playlist.customThumbnail ?? playlist.thumbnail} alt="" className="home-music-cover" style={{ borderRadius: 8, objectFit: 'cover' }} />
                    : <span className={`home-music-cover home-music-cover-${playlist.id}`}></span>
                  }
                  <div className="home-music-playlist-info">
                    <strong
                      ref={(el) => { homeMusicPlaylistTitleRefs.current[playlist.id] = el }}
                      className={overflowingHomeMusicPlaylistIds.includes(playlist.id) ? 'scrollable' : ''}
                    >
                      {playlist.name}
                    </strong>
                    <small>{playlist.tracks} Tracks</small>
                  </div>
                  <i onClick={(e) => { e.stopPropagation(); onPlaylistPlay(playlist.id) }}>
                    {playingPlaylistId === playlist.id && isHomeMusicPlaying
                      ? <img src={playbackIconMap.pause[accentColor]} alt="" className="home-music-playlist-play-icon" />
                      : <img src={playbackIconMap.start[accentColor]} alt="" className="home-music-playlist-play-icon" />
                    }
                  </i>
                </button>
              ))}
            </motion.div>
          </div>

          <button className="home-music-arrow" onClick={() => onMoveHomeMusicPlaylist(1)}>›</button>
        </div>

        <div className="home-player">
          <div className="home-player-track">
            {currentTrack?.thumbnail
              ? <img src={currentTrack.thumbnail} alt="" className="home-player-cover" style={{ borderRadius: 6, objectFit: 'cover' }} />
              : <span className="home-player-cover"></span>
            }
            <div
              ref={(el) => { marqueeTitleWrapRefs.current['home-player-current'] = el }}
              className={`home-player-track-info marquee-title-wrap ${isMarqueeTitleOverflowing('home-player-current') ? 'scrollable' : ''}`}
            >
              {renderMarqueeTitle('home-player-current', currentTrack?.title ?? '—')}
              <p>{currentTrack?.artist ?? ''}</p>
            </div>
          </div>

          <div className="home-player-controls">
            <button
              className="home-player-side-button"
              onClick={onPlayPrevTrack}
            >
              ‹
            </button>
            <button
              className="home-player-main-button"
              onClick={() => {
                if (!isYtAuthenticated) { onOpenYoutubeLogin(); return }
                if (currentVideoId) { onTogglePlayPause() }
                else if (currentTrack) { onPlayVideo(currentTrack.id, playingPlaylistId ?? undefined, currentTrack) }
              }}
            >
              {isHomeMusicPlaying
                ? <img src={playbackIconMap.pause.white} alt="" className="home-player-playback-icon" />
                : <img src={playbackIconMap.start.white} alt="" className="home-player-playback-icon" />
              }
            </button>
            <button
              className="home-player-side-button"
              onClick={onPlayNextTrack}
            >
              ›
            </button>
          </div>

          <div className="home-player-volume">
            <button
              type="button"
              className={`home-player-volume-toggle ${homeMusicVolume <= 0 ? 'muted' : ''}`}
              style={{ '--mute-icon-color': isDarkTheme ? '#fff' : accentColorMap[accentColor] } as CSSProperties}
              onClick={onToggleMute}
              aria-label={homeMusicVolume > 0 ? 'Mute' : 'Unmute'}
              title={homeMusicVolume > 0 ? 'Mute' : 'Unmute'}
            >
              <img src={getThemeIcon('speaker')} alt="" className="home-player-volume-icon" />
            </button>
            <button className="home-player-volume-track" onPointerDown={onVolumePointerDown} onPointerMove={onVolumePointerMove}>
              <i style={{ width: `${homeMusicVolume}%` }}></i>
            </button>
            <button
              type="button"
              className={`home-like-button like-burst-button ${isTrackLiked(currentTrack?.id) ? 'active' : ''} ${isLikeButtonBursting ? 'bursting' : ''}`}
              onClick={handleLikeButtonClick}
              onMouseEnter={() => setIsLikeButtonHovered(true)}
              onMouseLeave={() => setIsLikeButtonHovered(false)}
              disabled={!currentTrack}
              title={isTrackLiked(currentTrack?.id) ? 'Unlike' : 'Like'}
              aria-label={isTrackLiked(currentTrack?.id) ? 'Unlike current track' : 'Like current track'}
            >
              <img src={getLikeIcon(isTrackLiked(currentTrack?.id), isLikeButtonHovered)} alt="" className="like-icon" />
              <span className="like-burst" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>
            <div className="home-player-extra-actions">
              <button
                className={`home-player-icon-button home-player-shuffle-button ${isShuffleEnabled ? 'active' : ''}`}
                onClick={() => onSetIsShuffleEnabled((prev) => !prev)}
                onMouseEnter={() => setIsShuffleButtonHovered(true)}
                onMouseLeave={() => setIsShuffleButtonHovered(false)}
                title="Shuffle"
              >
                <img src={getMusicControlIcon('shuffle', isShuffleEnabled || isShuffleButtonHovered)} alt="" className="home-player-action-icon" />
              </button>
              <button
                className="home-player-icon-button home-player-list-button"
                onMouseEnter={() => setIsListButtonHovered(true)}
                onMouseLeave={() => setIsListButtonHovered(false)}
                onClick={() => { if (!isYtAuthenticated) { onOpenYoutubeLogin(); return } onOpenFullPlaylist() }}
                title="Full playlist"
              >
                <img
                  src={getMusicControlIcon('list', !isDarkTheme || isListButtonHovered)}
                  alt=""
                  className="home-player-list-icon"
                />
              </button>
            </div>
          </div>
        </div>

        <button
          className="home-player-progress"
          onPointerDown={onProgressPointerDown}
          onPointerMove={onProgressPointerMove}
          onPointerUp={onProgressPointerUp}
        >
          <span style={{ width: `${homeMusicProgress}%` }}></span>
        </button>

        <div className="home-player-times">
          <span>{formatHomeMusicTime(homeMusicCurrentSeconds)}</span>
          <span>{formatHomeMusicTime(homeMusicDurationSeconds)}</span>
        </div>
        </div>
      </div>

      <div
        ref={shortcutDockRef}
        className={`home-shortcut-dock ${isShortcutResizing ? 'resizing' : ''}`}
        aria-label="Program shortcuts"
        style={shortcutResizeWidth === null ? undefined : { width: `${shortcutResizeWidth}px` }}
      >
        <button
          type="button"
          className="home-shortcut-resize-handle left"
          aria-label="바로가기 카드 크기 조절"
          title="드래그해서 바로가기 개수 조절 (3~6개)"
          onPointerDown={(event) => handleShortcutResizeStart('left', event)}
          onPointerMove={handleShortcutResizeMove}
          onPointerUp={handleShortcutResizeEnd}
          onPointerCancel={handleShortcutResizeEnd}
          onKeyDown={handleShortcutResizeKeyDown}
        />

        {Array.from({ length: shortcutSlotPreview }, (_, index) => {
          const shortcut = homeShortcuts[index] ?? null
          if (!shortcut) {
            return (
              <button
                key={`empty-${index}`}
                type="button"
                className="home-shortcut-button empty"
                onClick={() => onConfigureHomeShortcut(index)}
                title="바로가기 추가"
                aria-label={`바로가기 ${index + 1} 추가`}
              >
                <span className="home-shortcut-add" aria-hidden="true">+</span>
              </button>
            )
          }

          return (
            <button
              key={`${shortcut.path}-${index}`}
              type="button"
              className="home-shortcut-button configured"
              onClick={() => {
                setShortcutMenu(null)
                onLaunchHomeShortcut(shortcut)
              }}
              onContextMenu={(event) => {
                event.preventDefault()
                event.stopPropagation()
                const menuWidth = 132
                const menuHeight = 78
                setShortcutMenu({
                  index,
                  x: Math.min(event.clientX, window.innerWidth - menuWidth - 8),
                  y: Math.min(event.clientY, window.innerHeight - menuHeight - 8),
                })
              }}
              title={`${shortcut.name} · 클릭해서 실행 / 우클릭해서 관리`}
              aria-label={`${shortcut.name} 실행`}
            >
              <img src={shortcut.iconImage ?? getThemeIcon('programs')} alt="" draggable={false} />
            </button>
          )
        })}

        <button
          type="button"
          className="home-shortcut-resize-handle right"
          aria-label="바로가기 카드 크기 조절"
          title="드래그해서 바로가기 개수 조절 (3~6개)"
          onPointerDown={(event) => handleShortcutResizeStart('right', event)}
          onPointerMove={handleShortcutResizeMove}
          onPointerUp={handleShortcutResizeEnd}
          onPointerCancel={handleShortcutResizeEnd}
          onKeyDown={handleShortcutResizeKeyDown}
        />
      </div>

      {shortcutMenu && (
        <div
          className="home-shortcut-context-menu"
          role="menu"
          aria-label="바로가기 메뉴"
          style={{ left: shortcutMenu.x, top: shortcutMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const index = shortcutMenu.index
              setShortcutMenu(null)
              onChangeHomeShortcutIcon(index)
            }}
          >
            아이콘 변경
          </button>
          <button
            type="button"
            role="menuitem"
            className="danger"
            onClick={() => {
              const index = shortcutMenu.index
              setShortcutMenu(null)
              onRemoveHomeShortcut(index)
            }}
          >
            삭제
          </button>
        </div>
      )}
    </section>
  )
}
