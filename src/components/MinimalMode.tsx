import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type {
  AccentColor, AudioDevice, CalendarSchedule, HomeMusicPlaylist, HomeShortcut,
  MonitorOrientation, PlaylistTrack, ResolvedTheme,
} from '../types'
import { accentColorMap, iconMap, musicControlIconMap, playbackIconMap, rocketMap, likedIconMap, prelikedIconMap } from '../constants'
import youtubeMusicIcon from '../assets/youtubemusic.png'

type Props = {
  theme: ResolvedTheme
  now: Date
  wallpaper?: string | null
  accentColor: AccentColor
  selectedPreset: number
  onSelectPreset: (preset: number) => void
  onLaunchPreset: () => void
  audioDevice: AudioDevice
  monitorOrientation: MonitorOrientation
  onSelectAudioDevice: (device: AudioDevice) => void
  onSelectMonitorOrientation: (orientation: MonitorOrientation) => void
  schedules: CalendarSchedule[]
  playlists: HomeMusicPlaylist[]
  selectedPlaylistId: string
  onSelectPlaylist: (id: string) => void
  onPlayPlaylist: (id: string) => void
  currentTrack: PlaylistTrack | null
  isPlaying: boolean
  progress: number
  volume: number
  onTogglePlay: () => void
  onPrevious: () => void
  onNext: () => void
  onVolumePointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void
  onVolumePointerMove: (event: React.PointerEvent<HTMLButtonElement>) => void
  onToggleMute: () => void
  isShuffleEnabled: boolean
  onToggleShuffle: () => void
  isLiked: boolean
  onToggleLike: () => void
  onProgressPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void
  onProgressPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => void
  onProgressPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => void
  shortcuts: Array<HomeShortcut | null>
  onLaunchShortcut: (shortcut: HomeShortcut) => void
  onExit: () => void
}

const formatTime = (date: Date) => date.toLocaleTimeString('en-US', {
  hour: '2-digit', minute: '2-digit', hour12: true,
}).split(' ')

export function MinimalMode({
  theme, now, wallpaper, accentColor, selectedPreset, onSelectPreset, onLaunchPreset,
  audioDevice, monitorOrientation, onSelectAudioDevice, onSelectMonitorOrientation,
  schedules, playlists, selectedPlaylistId, onSelectPlaylist, onPlayPlaylist,
  currentTrack, isPlaying, progress, volume, onTogglePlay, onPrevious, onNext,
  onVolumePointerDown, onVolumePointerMove, onToggleMute,
  isShuffleEnabled, onToggleShuffle, isLiked, onToggleLike,
  onProgressPointerDown, onProgressPointerMove, onProgressPointerUp,
  shortcuts, onLaunchShortcut, onExit,
}: Props) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onExit()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onExit])

  const [time, meridiem = ''] = formatTime(now)
  const neutralIcon = theme === 'light' && !wallpaper ? 'gray' : 'white'
  const todayLabel = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', weekday: 'short' })
  const visiblePlaylists = playlists.slice(0, 3)
  const visiblePlaylistTitleKey = visiblePlaylists.map((playlist) => `${playlist.id}:${playlist.name}`).join('|')
  const sortedSchedules = [...schedules].sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'))
  const titleRefs = useRef<Record<string, HTMLElement | null>>({})
  const [overflowingTitles, setOverflowingTitles] = useState<Set<string>>(() => new Set())
  const [contentScale, setContentScale] = useState(() => Math.min(1, window.innerWidth / 1280, window.innerHeight / 400))

  useEffect(() => {
    const updateScale = () => setContentScale(Math.min(1, window.innerWidth / 1280, window.innerHeight / 400))
    window.addEventListener('resize', updateScale)
    updateScale()
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  useLayoutEffect(() => {
    const measureTitles = () => {
      const next = new Set<string>()
      Object.entries(titleRefs.current).forEach(([id, element]) => {
        if (!element) return
        const original = id === 'current-track'
          ? element.querySelector<HTMLElement>('.minimal-track-title > span:first-child')
          : null
        // Measure only the original text, excluding the looping copy and its gap.
        const width = original
          ? original.offsetWidth - parseFloat(getComputedStyle(original).paddingRight || '0')
          : element.scrollWidth
        if (width > element.clientWidth + 1) next.add(id)
      })
      setOverflowingTitles(next)
    }
    measureTitles()
    const observer = new ResizeObserver(measureTitles)
    Object.values(titleRefs.current).forEach((element) => { if (element) observer.observe(element) })
    return () => observer.disconnect()
  }, [currentTrack?.title, visiblePlaylistTitleKey])
  const style = {
    '--minimal-accent': accentColorMap[accentColor],
    '--minimal-wallpaper': wallpaper ? `url("${wallpaper}")` : 'none',
  } as CSSProperties

  return (
    <section className="minimal-mode" data-theme={theme} style={style} aria-label="Secondary monitor minimal mode">
      <div className="minimal-mode-background" aria-hidden="true" />
      <div className="minimal-mode-drag-region" aria-hidden="true" />

      <div className="minimal-mode-content" style={{ '--minimal-content-scale': contentScale } as CSSProperties}>
      <div className="minimal-mode-layout">
        <section className="minimal-glass minimal-control-panel">
          <header><img src={iconMap.preset[neutralIcon]} alt="" /> Current Preset</header>
          <div className="minimal-preset-track" style={{ '--minimal-preset-index': selectedPreset - 1 } as CSSProperties}>
            <span className="minimal-preset-active-dot" aria-hidden="true" />
            {[1, 2, 3, 4].map((preset) => (
              <button key={preset} type="button" className={selectedPreset === preset ? 'active' : ''} onClick={() => onSelectPreset(preset)}>
                <i /><span>{String(preset).padStart(2, '0')}</span>
              </button>
            ))}
          </div>
          <button type="button" className="minimal-launch" onClick={onLaunchPreset} title="Launch preset">
            <img src={rocketMap[accentColor]} alt="" />
          </button>

          <div className="minimal-device-grid">
            <div>
              <strong><img src={iconMap.speaker[neutralIcon]} alt="" />Audio</strong>
              <div className="minimal-device-buttons">
                <button type="button" className={audioDevice === 'speaker' ? 'active' : ''} onClick={() => onSelectAudioDevice('speaker')}>
                  <img src={iconMap.speaker[audioDevice === 'speaker' ? accentColor : neutralIcon]} alt="Speaker" />
                </button>
                <button type="button" className={audioDevice === 'headphone' ? 'active' : ''} onClick={() => onSelectAudioDevice('headphone')}>
                  <img src={iconMap.headphone[audioDevice === 'headphone' ? accentColor : neutralIcon]} alt="Headphone" />
                </button>
              </div>
            </div>
            <div>
              <strong><img src={iconMap.hmonitor[neutralIcon]} alt="" />Monitor</strong>
              <div className="minimal-device-buttons">
                <button type="button" className={monitorOrientation === 'horizontal' ? 'active' : ''} onClick={() => onSelectMonitorOrientation('horizontal')}>
                  <img src={iconMap.hmonitor[monitorOrientation === 'horizontal' ? accentColor : neutralIcon]} alt="Horizontal" />
                </button>
                <button type="button" className={monitorOrientation === 'vertical' ? 'active' : ''} onClick={() => onSelectMonitorOrientation('vertical')}>
                  <img src={iconMap.vmonitor[monitorOrientation === 'vertical' ? accentColor : neutralIcon]} alt="Vertical" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="minimal-glass minimal-clock-panel">
          <div className="minimal-clock"><span>{time}</span><small>{meridiem}</small></div>
          <div className="minimal-date">{now.getFullYear()}.{todayLabel}</div>
          <div className="minimal-schedule-title"><img src={iconMap.date[neutralIcon]} alt="" />Today&apos;s Schedule</div>
          <div className="minimal-schedule-list">
            {sortedSchedules.length ? sortedSchedules.slice(0, 3).map((schedule) => (
              <div key={schedule.id}><time>{schedule.time ?? '—'}</time><i /><span>{schedule.title}</span></div>
            )) : <p>No schedule today</p>}
          </div>
        </section>

        <section className="minimal-glass minimal-music-panel">
          <header><img src={youtubeMusicIcon} alt="" /><strong>YouTube Music</strong><span>•••</span></header>
          <div className="minimal-playlists">
            {visiblePlaylists.map((playlist) => (
              <button key={playlist.id} type="button" className={selectedPlaylistId === playlist.id ? 'active' : ''} onClick={() => onSelectPlaylist(playlist.id)}>
                {playlist.customThumbnail ?? playlist.thumbnail
                  ? <img src={playlist.customThumbnail ?? playlist.thumbnail} alt="" />
                  : <span className="minimal-cover-fallback" />}
                <span>
                  <strong
                    ref={(element) => { titleRefs.current[`playlist-${playlist.id}`] = element }}
                    className={overflowingTitles.has(`playlist-${playlist.id}`) ? 'scrollable' : ''}
                  >{playlist.name}</strong>
                  <small>{playlist.tracks} Tracks</small>
                </span>
                <i onClick={(event) => { event.stopPropagation(); onPlayPlaylist(playlist.id) }}>▶</i>
              </button>
            ))}
          </div>
          <div className="minimal-player">
            {currentTrack?.thumbnail ? <img src={currentTrack.thumbnail} alt="" /> : <span className="minimal-track-fallback" />}
            <div className="minimal-track-copy">
              <div
                ref={(element) => { titleRefs.current['current-track'] = element }}
                className={`minimal-track-title-wrap ${overflowingTitles.has('current-track') ? 'scrollable' : ''}`}
              >
                <strong className="minimal-track-title">
                  <span>{currentTrack?.title ?? 'Select a playlist'}</span>
                  {overflowingTitles.has('current-track') && <span aria-hidden="true">{currentTrack?.title ?? 'Select a playlist'}</span>}
                </strong>
              </div>
              <small>{currentTrack?.artist ?? 'YouTube Music'}</small>
            </div>
            <div className="minimal-playback-controls">
            <button type="button" onClick={onPrevious}>‹</button>
            <button type="button" className="primary" onClick={onTogglePlay}><img src={playbackIconMap[isPlaying ? 'pause' : 'start'].white} alt={isPlaying ? 'Pause' : 'Play'} /></button>
            <button type="button" onClick={onNext}>›</button>
            </div>
            <button type="button" className="minimal-action-button" onClick={onToggleLike} disabled={!currentTrack?.id} aria-pressed={isLiked} aria-label={isLiked ? 'Unlike current track' : 'Like current track'} title={isLiked ? 'Unlike' : 'Like'}>
              <img src={isLiked ? likedIconMap[accentColor] : prelikedIconMap[neutralIcon]} alt="" />
            </button>
            <button type="button" className="minimal-action-button" onClick={onToggleShuffle} aria-pressed={isShuffleEnabled} aria-label="Shuffle" title="Shuffle">
              <img src={musicControlIconMap.shuffle[isShuffleEnabled ? accentColor : neutralIcon]} alt="" />
            </button>
            <button type="button" className={`minimal-volume-toggle ${volume <= 0 ? 'muted' : ''}`} onClick={onToggleMute} aria-label={volume > 0 ? 'Mute' : 'Unmute'} title={volume > 0 ? 'Mute' : 'Unmute'}>
              <img className="minimal-volume-icon" src={iconMap.speaker[neutralIcon]} alt="" />
            </button>
            <button
              type="button"
              className="minimal-volume"
              aria-label="Volume"
              onPointerDown={onVolumePointerDown}
              onPointerMove={onVolumePointerMove}
            >
              <span style={{ width: `${volume}%` }}><i /></span>
            </button>
            <img className="minimal-list-icon" src={musicControlIconMap.list[neutralIcon]} alt="Playlist" />
          </div>
          <button
            type="button"
            className="minimal-progress"
            aria-label="Playback position"
            onPointerDown={onProgressPointerDown}
            onPointerMove={onProgressPointerMove}
            onPointerUp={onProgressPointerUp}
          >
            <span style={{ width: `${progress}%` }}><i /></span>
          </button>
        </section>
      </div>

      <nav className="minimal-shortcut-dock" aria-label="Program shortcuts">
        {shortcuts.map((shortcut, index) => shortcut ? (
          <button key={`${shortcut.path}-${index}`} type="button" onClick={() => onLaunchShortcut(shortcut)} title={shortcut.name}>
            {shortcut.iconImage ? <img src={shortcut.iconImage} alt="" /> : <span>{shortcut.name.slice(0, 2).toUpperCase()}</span>}
          </button>
        ) : <span key={`empty-${index}`} className="empty">＋</span>)}
      </nav>
      </div>
    </section>
  )
}
