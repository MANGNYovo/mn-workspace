import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { AccentColor, HomeMusicPlaylist } from '../types'
import { playbackIconMap } from '../constants'
import writeIcon from '../assets/write.png'

type Props = {
  playlist: HomeMusicPlaylist
  isSelected: boolean
  isPlaying: boolean
  playingPlaylistId: string | null
  isHomeMusicPlaying: boolean
  viewMode: 'list' | 'grid'
  onSelect: (id: string) => void
  onPlay: (id: string) => void
  onChangeCover: (id: string) => void
  accentColor: AccentColor
}

export function SortablePlaylistRow({
  playlist,
  isSelected,
  isPlaying,
  playingPlaylistId,
  isHomeMusicPlaying,
  viewMode,
  onSelect,
  onPlay,
  onChangeCover,
  accentColor,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: playlist.id })

  const style = {
    transform: transform
      ? CSS.Transform.toString(
          viewMode === 'list'
            ? { ...transform, x: 0 }
            : transform
        )
      : undefined,
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.7 : 1,
  }

  const playlistCover = playlist.customThumbnail ?? playlist.thumbnail

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`playlist-row ${isSelected ? 'active' : ''}`}
      onClick={() => onSelect(playlist.id)}
    >
      <div className="playlist-cover-wrap">
        {playlistCover
          ? <img src={playlistCover} alt="" className="playlist-cover" />
          : <span className={`playlist-cover home-music-cover-${playlist.id}`}></span>
        }

        <button
          className="playlist-cover-edit-button"
          onClick={(event) => {
            event.stopPropagation()
            onChangeCover(playlist.id)
          }}
          title="Change cover"
          aria-label="Change playlist cover"
        >
          <img src={writeIcon} alt="" />
        </button>
      </div>

      <div className="playlist-row-info">
        <strong>{playlist.name}</strong>
        <small>{playlist.tracks} tracks</small>
      </div>

      <button
        className="playlist-row-play"
        onClick={(event) => {
          event.stopPropagation()
          onPlay(playlist.id)
        }}
      >
        {playingPlaylistId === playlist.id && isHomeMusicPlaying
          ? <img src={playbackIconMap.pause[accentColor]} alt="" className="playlist-row-play-icon" />
          : <img src={playbackIconMap.start[accentColor]} alt="" className="playlist-row-play-icon" />
        }
      </button>

      <button
        className="playlist-row-drag"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        ⠿
      </button>
    </div>
  )
}
