import type { HomeMusicPlaylist, PlaylistTrack } from '../types'
import { iconMap } from '../constants'

type Props = {
  selectedHomeMusicPlaylist: HomeMusicPlaylist
  selectedHomeMusicPlaylistId: string
  fullPlaylistTracks: PlaylistTrack[]
  filteredFullPlaylistTracks: PlaylistTrack[]
  fullPlaylistSearchQuery: string
  normalizedFullPlaylistSearchQuery: string
  currentTrack: PlaylistTrack | null
  playingPlaylistId: string | null
  isHomeMusicPlaying: boolean
  playingFullPlaylistTrackId: string | null
  isTrackLiked: (trackId?: string | null) => boolean
  onToggleTrackLike: (trackId?: string | null) => void
  onClose: () => void
  onPlaylistPlay: (id: string) => void
  onPlayVideo: (id: string, fromPlaylistId?: string, trackInfo?: PlaylistTrack) => void
  onTogglePlayPause: () => void
  onSetFullPlaylistSearchQuery: (q: string) => void
  renderMarqueeTitle: (key: string, text: string) => React.ReactNode
  isMarqueeTitleOverflowing: (key: string) => boolean
  marqueeTitleWrapRefs: React.MutableRefObject<Record<string, HTMLElement | null>>
  getThemeIcon: (name: keyof typeof iconMap, isActive?: boolean) => string
  getLikeIcon: (isLiked: boolean) => string
}

export function FullPlaylistModal({
  selectedHomeMusicPlaylist, selectedHomeMusicPlaylistId,
  fullPlaylistTracks, filteredFullPlaylistTracks, fullPlaylistSearchQuery,
  normalizedFullPlaylistSearchQuery, currentTrack, playingPlaylistId,
  isHomeMusicPlaying, playingFullPlaylistTrackId, isTrackLiked, onToggleTrackLike,
  onClose, onPlaylistPlay, onPlayVideo, onTogglePlayPause,
  onSetFullPlaylistSearchQuery,
  renderMarqueeTitle, isMarqueeTitleOverflowing, marqueeTitleWrapRefs, getLikeIcon,
}: Props) {
  const cover = selectedHomeMusicPlaylist?.customThumbnail ?? selectedHomeMusicPlaylist?.thumbnail

  return (
    <div className="modal-overlay">
      <div className="full-playlist-modal">
        <button className="full-playlist-close" onClick={onClose}>×</button>

        <div className="full-playlist-header">
          <span className="full-playlist-cover">
            {cover
              ? <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
              : '♡'
            }
          </span>
          <div>
            <h2>{selectedHomeMusicPlaylist.name}</h2>
            <p>
              {selectedHomeMusicPlaylist.tracks} tracks
              {selectedHomeMusicPlaylist.duration ? <><i></i> {selectedHomeMusicPlaylist.duration}</> : null}
            </p>
          </div>
          <button
            className="full-playlist-play-button"
            onClick={() => onPlaylistPlay(selectedHomeMusicPlaylistId)}
          >
            {playingPlaylistId === selectedHomeMusicPlaylistId && isHomeMusicPlaying ? (
              <><span className="full-playlist-main-pause-icon"></span>Pause</>
            ) : (
              <>▶ Play</>
            )}
          </button>
        </div>

        <div className="full-playlist-search-row">
          <input
            className="full-playlist-search-input"
            type="text"
            placeholder="Search songs..."
            value={fullPlaylistSearchQuery}
            onChange={(e) => onSetFullPlaylistSearchQuery(e.target.value)}
          />
          {fullPlaylistSearchQuery && (
            <button type="button" className="full-playlist-search-clear" onClick={() => onSetFullPlaylistSearchQuery('')} aria-label="Clear song search">×</button>
          )}
        </div>

        <div className="full-playlist-track-list">
          {filteredFullPlaylistTracks.map((track, index) => (
            <div
              className={`full-playlist-track-row ${currentTrack?.id === track.id && playingPlaylistId === selectedHomeMusicPlaylistId ? 'active' : ''}`}
              key={track.id}
            >
              <span>{index + 1}</span>
              {track.thumbnail
                ? <img src={track.thumbnail} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }} />
                : <i className={track.coverClass ?? ''}></i>
              }
              <div
                ref={(el) => { marqueeTitleWrapRefs.current[`full-playlist-track-${track.id}`] = el }}
                className={`full-playlist-track-info marquee-title-wrap ${isMarqueeTitleOverflowing(`full-playlist-track-${track.id}`) ? 'scrollable' : ''}`}
              >
                {renderMarqueeTitle(`full-playlist-track-${track.id}`, track.title)}
                <small>{track.artist}</small>
              </div>
              <em>{track.duration}</em>
              <button
                type="button"
                className={`full-playlist-like-button ${isTrackLiked(track.id) ? 'active' : ''}`}
                onClick={() => onToggleTrackLike(track.id)}
                title={isTrackLiked(track.id) ? 'Unlike' : 'Like'}
                aria-label={isTrackLiked(track.id) ? `Unlike ${track.title}` : `Like ${track.title}`}
              >
                <img src={getLikeIcon(isTrackLiked(track.id))} alt="" className="like-icon" />
              </button>
              <button
                type="button"
                className="full-playlist-row-play-button"
                onClick={() => {
                  if (playingFullPlaylistTrackId === track.id && isHomeMusicPlaying) { onTogglePlayPause(); return }
                  onPlayVideo(track.id, selectedHomeMusicPlaylistId, track)
                }}
              >
                {playingFullPlaylistTrackId === track.id && isHomeMusicPlaying
                  ? <span className="full-playlist-pause-icon"></span>
                  : '▶'
                }
              </button>
            </div>
          ))}
        </div>

        <div className="full-playlist-footer">
          {normalizedFullPlaylistSearchQuery
            ? `${filteredFullPlaylistTracks.length} / ${fullPlaylistTracks.length} tracks`
            : `${fullPlaylistTracks.length} tracks`
          }
        </div>
      </div>
    </div>
  )
}
