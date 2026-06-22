import { useState } from 'react'
import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, arrayMove, verticalListSortingStrategy, rectSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToParentElement } from '@dnd-kit/modifiers'
import type {
  HomeMusicPlaylist, PlaylistTrack, AppSettings, AccentColor,
} from '../types'
import { iconMap } from '../constants'
import { SortablePlaylistRow } from '../components'

type Props = {
  // playlists
  homeMusicPlaylists: HomeMusicPlaylist[]
  filteredHomeMusicPlaylists: HomeMusicPlaylist[]
  selectedHomeMusicPlaylistId: string
  selectedHomeMusicPlaylist: HomeMusicPlaylist
  playingPlaylistId: string | null
  isHomeMusicPlaying: boolean
  playlistViewMode: 'list' | 'grid'
  playlistSearchQuery: string
  isPlaylistRefreshing: boolean
  isYtAuthenticated: boolean
  // tracks
  ytPlaylistTracks: PlaylistTrack[]
  fallbackPlaylistTracks: PlaylistTrack[]
  currentTrack: PlaylistTrack | null
  playingFullPlaylistTrackId: string | null
  // player
  homeMusicProgress: number
  homeMusicCurrentSeconds: number
  homeMusicDurationSeconds: number
  homeMusicVolume: number
  isShuffleEnabled: boolean
  isTrackLiked: (trackId?: string | null) => boolean
  onToggleTrackLike: (trackId?: string | null) => void
  // handlers
  onSetSelectedHomeMusicPlaylistId: (id: string) => void
  onSetHomeMusicPlaylists: (playlists: HomeMusicPlaylist[]) => void
  onUpdateSettings: (partial: Partial<AppSettings>) => void
  onPlaylistPlay: (id: string) => void
  onPlayVideo: (id: string, fromPlaylistId?: string, trackInfo?: PlaylistTrack) => void
  onTogglePlayPause: () => void
  onSetPlaylistViewMode: (mode: 'list' | 'grid') => void
  onSetPlaylistSearchQuery: (q: string) => void
  onRefreshPlaylists: () => void
  onOpenYoutubeLogin: () => void
  onOpenFullPlaylist: () => void
  onChangeCover: (id: string) => void
  onSetIsShuffleEnabled: (v: boolean | ((prev: boolean) => boolean)) => void
  onVolumePointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void
  onVolumePointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void
  onProgressPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void
  onProgressPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void
  onProgressPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void
  formatHomeMusicTime: (s: number) => string
  getThemeIcon: (name: keyof typeof iconMap, isActive?: boolean) => string
  getMusicControlIcon: (name: keyof typeof import('../constants').musicControlIconMap, isActive?: boolean) => string
  getLikeIcon: (isLiked: boolean, isHovered?: boolean) => string
  renderMarqueeTitle: (key: string, text: string) => React.ReactNode
  isMarqueeTitleOverflowing: (key: string) => boolean
  marqueeTitleWrapRefs: React.MutableRefObject<Record<string, HTMLElement | null>>
}

export function PlaylistPage({
  homeMusicPlaylists, filteredHomeMusicPlaylists, selectedHomeMusicPlaylistId,
  selectedHomeMusicPlaylist, playingPlaylistId, isHomeMusicPlaying,
  playlistViewMode, playlistSearchQuery, isPlaylistRefreshing, isYtAuthenticated,
  ytPlaylistTracks, fallbackPlaylistTracks, currentTrack, playingFullPlaylistTrackId,
  homeMusicProgress, homeMusicCurrentSeconds, homeMusicDurationSeconds, homeMusicVolume,
  isShuffleEnabled, isTrackLiked, onToggleTrackLike,
  onSetSelectedHomeMusicPlaylistId, onSetHomeMusicPlaylists, onUpdateSettings,
  onPlaylistPlay, onPlayVideo, onTogglePlayPause,
  onSetPlaylistViewMode, onSetPlaylistSearchQuery, onRefreshPlaylists,
  onOpenYoutubeLogin, onOpenFullPlaylist, onChangeCover, onSetIsShuffleEnabled,
  onVolumePointerDown, onVolumePointerMove,
  onProgressPointerDown, onProgressPointerMove, onProgressPointerUp,
  formatHomeMusicTime, getThemeIcon, getMusicControlIcon, getLikeIcon,
  renderMarqueeTitle, isMarqueeTitleOverflowing, marqueeTitleWrapRefs,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const isLikedPlaylistSelected = selectedHomeMusicPlaylistId === 'mn-liked-tracks'
  const tracks = isLikedPlaylistSelected ? ytPlaylistTracks : isYtAuthenticated ? ytPlaylistTracks : fallbackPlaylistTracks
  const [isLikeButtonHovered, setIsLikeButtonHovered] = useState(false)
  const [isLikeButtonBursting, setIsLikeButtonBursting] = useState(false)

  const playLikeBurst = () => {
    setIsLikeButtonBursting(false)
    window.requestAnimationFrame(() => setIsLikeButtonBursting(true))
    window.setTimeout(() => setIsLikeButtonBursting(false), 760)
  }

  const handleLikeButtonClick = () => {
    const willLike = Boolean(currentTrack?.id && !isTrackLiked(currentTrack.id))

    if (willLike) playLikeBurst()

    onToggleTrackLike(currentTrack?.id)
  }

  return (
    <section className="playlist-page">
      <div className="playlist-main">
        <div className="playlist-header">
          <div>
            <h1>Playlist</h1>
            <p>play your Music playlists.</p>
          </div>
        </div>

        <div className="playlist-toolbar">
          <div className="playlist-search">
            <img src={getMusicControlIcon('search')} alt="" className="playlist-search-icon" />
            <input
              value={playlistSearchQuery}
              placeholder="Search playlists..."
              onChange={(e) => onSetPlaylistSearchQuery(e.target.value)}
            />
            {playlistSearchQuery && (
              <button type="button" className="playlist-search-clear" onClick={() => onSetPlaylistSearchQuery('')} aria-label="Clear playlist search">×</button>
            )}
          </div>

          <button
            className={`playlist-refresh-button ${isPlaylistRefreshing ? 'spinning' : ''}`}
            onClick={onRefreshPlaylists}
            disabled={!isYtAuthenticated || isPlaylistRefreshing}
            title="Refresh playlists"
          >
            <img src={getThemeIcon('check')} alt="" className="playlist-refresh-icon" />
          </button>

          <div className={`playlist-view-switch ${playlistViewMode === 'grid' ? 'grid' : ''}`}>
            <span className="playlist-view-switch-bg"></span>
            <button className={`playlist-view-button ${playlistViewMode === 'list' ? 'active' : ''}`} onClick={() => onSetPlaylistViewMode('list')}>
              <img src={getMusicControlIcon('list', playlistViewMode === 'list')} alt="" className="playlist-view-icon" />
            </button>
            <button className={`playlist-view-button ${playlistViewMode === 'grid' ? 'active' : ''}`} onClick={() => onSetPlaylistViewMode('grid')}>
              <img src={getMusicControlIcon('grid', playlistViewMode === 'grid')} alt="" className="playlist-view-icon" />
            </button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToParentElement]}
          onDragEnd={(event) => {
            const { active, over } = event
            if (!over || active.id === over.id) return
            const oldIndex = homeMusicPlaylists.findIndex((p) => p.id === active.id)
            const newIndex = homeMusicPlaylists.findIndex((p) => p.id === over.id)
            if (oldIndex < 0 || newIndex < 0) return
            const next = arrayMove(homeMusicPlaylists, oldIndex, newIndex)
            onSetHomeMusicPlaylists(next)
            onUpdateSettings({ musicPlaylistOrder: next.map((p) => p.id) })
          }}
        >
          <SortableContext
            items={filteredHomeMusicPlaylists.map((p) => p.id)}
            strategy={playlistViewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
          >
            <div className={`playlist-list ${playlistViewMode === 'grid' ? 'grid' : ''}`}>
              {filteredHomeMusicPlaylists.map((playlist) => (
                <SortablePlaylistRow
                  key={playlist.id}
                  playlist={playlist}
                  isSelected={selectedHomeMusicPlaylistId === playlist.id}
                  isPlaying={playingPlaylistId === playlist.id && isHomeMusicPlaying}
                  playingPlaylistId={playingPlaylistId}
                  isHomeMusicPlaying={isHomeMusicPlaying}
                  viewMode={playlistViewMode}
                  onSelect={onSetSelectedHomeMusicPlaylistId}
                  onPlay={onPlaylistPlay}
                  onChangeCover={onChangeCover}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <aside className="playlist-side">
        <div className="playlist-detail-card">
          <span className="playlist-detail-cover">
            {selectedHomeMusicPlaylist?.customThumbnail ?? selectedHomeMusicPlaylist?.thumbnail
              ? <img src={selectedHomeMusicPlaylist?.customThumbnail ?? selectedHomeMusicPlaylist?.thumbnail ?? ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
              : '♡'
            }
          </span>
          <h2>{selectedHomeMusicPlaylist.name}</h2>
          <p>{selectedHomeMusicPlaylist.tracks} tracks</p>

          <button
            className="playlist-play-button"
            onClick={() => { if (!isYtAuthenticated && !isLikedPlaylistSelected) { onOpenYoutubeLogin(); return } onPlaylistPlay(selectedHomeMusicPlaylistId) }}
          >
            {playingPlaylistId === selectedHomeMusicPlaylistId && isHomeMusicPlaying ? (
              <><span className="playlist-page-pause-icon"></span>Pause</>
            ) : (
              <>▶ Play Playlist</>
            )}
          </button>

          <div className="playlist-track-header">
            <strong>Tracks</strong>
            <button onClick={() => { if (!isYtAuthenticated && !isLikedPlaylistSelected) { onOpenYoutubeLogin(); return } onOpenFullPlaylist() }}>Full Playlist ›</button>
          </div>

          <div className="playlist-track-list">
            {tracks.map((track, index) => (
              <button
                key={track.id}
                className={`playlist-track-row ${currentTrack?.id === track.id && playingPlaylistId === selectedHomeMusicPlaylistId ? 'active' : ''}`}
                onClick={() => onPlayVideo(track.id, selectedHomeMusicPlaylistId, track)}
              >
                <span>{index + 1}</span>
                {track.thumbnail
                  ? <img src={track.thumbnail} alt="" className="track-cover-img" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }} />
                  : <i className={track.coverClass ?? ''}></i>
                }
                <div
                  ref={(el) => { marqueeTitleWrapRefs.current[`playlist-track-${track.id}`] = el }}
                  className={`playlist-track-info marquee-title-wrap ${isMarqueeTitleOverflowing(`playlist-track-${track.id}`) ? 'scrollable' : ''}`}
                >
                  {renderMarqueeTitle(`playlist-track-${track.id}`, track.title)}
                  <small>{track.artist}</small>
                </div>
                <em>{track.duration}</em>
              </button>
            ))}
          </div>
        </div>

        <div className="playlist-player-card">
          <div className="playlist-player-top">
            {currentTrack?.thumbnail
              ? <img src={currentTrack.thumbnail} alt="" className="playlist-player-cover" style={{ borderRadius: 8, objectFit: 'cover' }} />
              : <span className="playlist-player-cover"></span>
            }
            <div className="playlist-player-info">
              <div
                ref={(el) => { marqueeTitleWrapRefs.current['playlist-player-current'] = el }}
                className={`playlist-player-title marquee-title-wrap ${isMarqueeTitleOverflowing('playlist-player-current') ? 'scrollable' : ''}`}
              >
                {renderMarqueeTitle('playlist-player-current', currentTrack?.title ?? '—')}
              </div>

              <small
                ref={(el) => { marqueeTitleWrapRefs.current['playlist-player-current-artist'] = el }}
                className={`playlist-player-artist marquee-title-wrap ${isMarqueeTitleOverflowing('playlist-player-current-artist') ? 'scrollable' : ''}`}
              >
                {renderMarqueeTitle('playlist-player-current-artist', currentTrack?.artist ?? '')}
              </small>
            </div>

            <button
              className={`playlist-player-shuffle-button ${isShuffleEnabled ? 'active' : ''}`}
              onClick={() => onSetIsShuffleEnabled((prev) => !prev)}
              title="Shuffle"
            >
              <img src={getMusicControlIcon('shuffle', isShuffleEnabled)} alt="" className="playlist-player-shuffle-icon" />
            </button>

            <button className="playlist-player-main-button" onClick={onTogglePlayPause}>
              {isHomeMusicPlaying ? <span className="pause-icon"></span> : '▶'}
            </button>
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

          <div className="playlist-player-volume">
            <img src={getThemeIcon('speaker')} alt="" className="home-player-volume-icon" />
            <button className="home-player-volume-track" onPointerDown={onVolumePointerDown} onPointerMove={onVolumePointerMove}>
              <i style={{ width: `${homeMusicVolume}%` }}></i>
            </button>
          </div>

          <button
            type="button"
            className={`playlist-player-like-button like-burst-button ${isTrackLiked(currentTrack?.id) ? 'active' : ''} ${isLikeButtonBursting ? 'bursting' : ''}`}
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
        </div>
      </aside>
    </section>
  )
}
