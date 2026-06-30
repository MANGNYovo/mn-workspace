import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { useLikeBurst } from '../components'
import { motion } from 'framer-motion'
import type { HomeMusicPlaylist, PlaylistTrack, AudioDevice, MonitorOrientation, AccentColor } from '../types'
import { rocketMap, iconMap, playbackIconMap } from '../constants'
import youtubeMusicIcon from '../assets/youtubemusic.png'
import rocketActive from '../assets/rocket-active.png'

type Props = {
  // preset & launch
  selectedPreset: number
  isLaunching: boolean
  enabledProgramCount: number
  onSetSelectedPreset: (preset: number) => void
  onLaunchPrograms: () => void
  accentColor: AccentColor
  isDarkTheme: boolean
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
  selectedAudioDevice, selectedMonitorOrientation, onSelectAudioDevice, onSelectMonitorOrientation,
  homeMusicPlaylists, homeMusicPlaylistPage, selectedHomeMusicPlaylistId, playingPlaylistId,
  isHomeMusicPlaying, overflowingHomeMusicPlaylistIds, homeMusicPlaylistTitleRefs,
  onSetSelectedHomeMusicPlaylistId, onMoveHomeMusicPlaylist, onHomeMusicPlaylistWheel, onPlaylistPlay,
  currentTrack, currentVideoId, isYtAuthenticated, homeMusicVolume, homeMusicProgress,
  homeMusicCurrentSeconds, homeMusicDurationSeconds, isShuffleEnabled,
  isTrackLiked, onToggleTrackLike,
  onPlayPrevTrack, onPlayNextTrack, onTogglePlayPause, onPlayVideo,
  onVolumePointerDown, onVolumePointerMove, onProgressPointerDown, onProgressPointerMove, onProgressPointerUp,
  onSetIsShuffleEnabled, onOpenFullPlaylist, onOpenYoutubeLogin,
  formatHomeMusicTime, getThemeIcon, getMusicControlIcon, getLikeIcon,
  renderMarqueeTitle, isMarqueeTitleOverflowing, marqueeTitleWrapRefs,
}: Props) {
  const [isListButtonHovered, setIsListButtonHovered] = useState(false)
  const [isShuffleButtonHovered, setIsShuffleButtonHovered] = useState(false)
  const [isLikeButtonHovered, setIsLikeButtonHovered] = useState(false)
  const { isBursting: isLikeButtonBursting, triggerBurst: triggerLikeBurst } = useLikeBurst()

  const homeMusicPlaylistWindowRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const playlistWindow = homeMusicPlaylistWindowRef.current
    if (!playlistWindow) return

    playlistWindow.addEventListener('wheel', onHomeMusicPlaylistWheel, { passive: false })
    return () => playlistWindow.removeEventListener('wheel', onHomeMusicPlaylistWheel)
  }, [onHomeMusicPlaylistWheel, homeMusicPlaylists.length, homeMusicPlaylistPage])

  const handleLikeButtonClick = () => {
    if (currentTrack?.id && !isTrackLiked(currentTrack.id)) triggerLikeBurst()
    onToggleTrackLike(currentTrack?.id)
  }

  return (
    <section className="home-page">
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
            <img src={getThemeIcon('speaker')} alt="" className="home-player-volume-icon" />
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
    </section>
  )
}
