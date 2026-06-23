import { type CSSProperties, type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react'
import type { AccentColor, FloatingPlayerMode, FloatingPlayerPosition, PlaylistTrack } from '../types'
import { playbackIconMap } from '../constants'

type Props = {
  mode: FloatingPlayerMode
  isHidden: boolean
  position: FloatingPlayerPosition | null
  currentTrack: PlaylistTrack
  isPlaying: boolean
  isShuffleEnabled: boolean
  isLiked: boolean
  getLikeIcon: (isLiked: boolean, isHovered?: boolean) => string
  accentColor: AccentColor
  progress: number
  volume: number
  currentSeconds: number
  durationSeconds: number
  speakerIcon: string
  shuffleIcon: string
  shuffleActiveIcon: string
  playlistIcon: string
  listIcon: string
  listActiveIcon: string
  onChangeMode: (mode: FloatingPlayerMode) => void
  onChangeHidden: (hidden: boolean) => void
  onChangePosition: (position: FloatingPlayerPosition) => void
  onTogglePlayPause: () => void
  onPlayPrevTrack: () => void
  onPlayNextTrack: () => void
  onToggleShuffle: () => void
  onToggleLike: () => void
  onOpenFullPlaylist: () => void
  onVolumePointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onVolumePointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onProgressPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onProgressPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onProgressPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void
  formatTime: (seconds: number) => string
}

type DragState = {
  pointerId: number
  startX: number
  startY: number
  startLeft: number
  startTop: number
  width: number
  height: number
  lastPosition: FloatingPlayerPosition
}

function isNoDragTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false

  return Boolean(
    target.closest('button, input, textarea, select, a, [role="button"], [data-no-drag="true"]'),
  )
}

function clampFloatingPosition(
  position: FloatingPlayerPosition,
  width: number,
  height: number,
): FloatingPlayerPosition {
  const margin = 12
  const maxX = Math.max(margin, window.innerWidth - width - margin)
  const maxY = Math.max(margin + 34, window.innerHeight - height - margin)

  return {
    x: Math.max(margin, Math.min(position.x, maxX)),
    y: Math.max(margin + 34, Math.min(position.y, maxY)),
  }
}

function createPositionStyle(position: FloatingPlayerPosition | null): CSSProperties | undefined {
  if (!position) return undefined

  return {
    left: position.x,
    top: position.y,
  }
}

function FloatingMarqueeText({
  className,
  text,
}: {
  className: string
  text: string
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const textRef = useRef<HTMLSpanElement | null>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  useEffect(() => {
    const updateOverflow = () => {
      const wrap = wrapRef.current
      const textElement = textRef.current

      if (!wrap || !textElement) return

      setIsOverflowing(textElement.scrollWidth > wrap.clientWidth + 2)
    }

    updateOverflow()

    const resizeObserver = new ResizeObserver(updateOverflow)

    if (wrapRef.current) resizeObserver.observe(wrapRef.current)
    if (textRef.current) resizeObserver.observe(textRef.current)

    window.addEventListener('resize', updateOverflow)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateOverflow)
    }
  }, [text])

  return (
    <div
      ref={wrapRef}
      className={`${className} floating-player-marquee ${isOverflowing ? 'scrollable' : ''}`}
    >
      <span className="floating-player-marquee-track">
        <span ref={textRef} className="floating-player-marquee-text">{text}</span>
        {isOverflowing && (
          <span className="floating-player-marquee-text" aria-hidden="true">{text}</span>
        )}
      </span>
    </div>
  )
}

export function FloatingMusicPlayer({
  mode,
  isHidden,
  position,
  currentTrack,
  isPlaying,
  isShuffleEnabled,
  isLiked,
  getLikeIcon,
  accentColor,
  progress,
  volume,
  currentSeconds,
  durationSeconds,
  speakerIcon,
  shuffleIcon,
  shuffleActiveIcon,
  playlistIcon,
  listIcon,
  listActiveIcon,
  onChangeMode,
  onChangeHidden,
  onChangePosition,
  onTogglePlayPause,
  onPlayPrevTrack,
  onPlayNextTrack,
  onToggleShuffle,
  onToggleLike,
  onOpenFullPlaylist,
  onVolumePointerDown,
  onVolumePointerMove,
  onProgressPointerDown,
  onProgressPointerMove,
  onProgressPointerUp,
  formatTime,
}: Props) {
  const playerRef = useRef<HTMLDivElement | null>(null)
  const restoreButtonRef = useRef<HTMLButtonElement | null>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const windowSizeRef = useRef({
    width: window.innerWidth,
    height: window.innerHeight,
  })
  const [dragPosition, setDragPosition] = useState<FloatingPlayerPosition | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isListButtonHovered, setIsListButtonHovered] = useState(false)
  const [isShuffleButtonHovered, setIsShuffleButtonHovered] = useState(false)
  const [isLikeButtonHovered, setIsLikeButtonHovered] = useState(false)
  const [isLikeButtonBursting, setIsLikeButtonBursting] = useState(false)
  const [isExpandButtonHovered, setIsExpandButtonHovered] = useState(false)

  const playLikeBurst = () => {
    setIsLikeButtonBursting(false)
    window.requestAnimationFrame(() => setIsLikeButtonBursting(true))
    window.setTimeout(() => setIsLikeButtonBursting(false), 760)
  }

  const handleLikeButtonClick = () => {
    if (!isLiked) playLikeBurst()

    onToggleLike()
  }

  const activePosition = dragPosition ?? position
  const positionStyle = createPositionStyle(activePosition)
  const isPositioned = Boolean(activePosition)

  useEffect(() => {
    if (isHidden) return
    if (!position) {
      windowSizeRef.current = {
        width: window.innerWidth,
        height: window.innerHeight,
      }
      return
    }

    let animationFrameId = 0

    const clampCurrentPosition = () => {
      const element = playerRef.current

      if (!element) return

      const rect = element.getBoundingClientRect()
      const previousWindowSize = windowSizeRef.current
      const previousRightGap = previousWindowSize.width - position.x - rect.width
      const previousBottomGap = previousWindowSize.height - position.y - rect.height
      const shouldStickToRight = previousRightGap <= 72
      const shouldStickToBottom = previousBottomGap <= 72

      const nextPosition = clampFloatingPosition(
        {
          x: shouldStickToRight
            ? window.innerWidth - rect.width - Math.max(12, previousRightGap)
            : position.x,
          y: shouldStickToBottom
            ? window.innerHeight - rect.height - Math.max(12, previousBottomGap)
            : position.y,
        },
        rect.width,
        rect.height,
      )

      windowSizeRef.current = {
        width: window.innerWidth,
        height: window.innerHeight,
      }

      if (
        Math.abs(nextPosition.x - position.x) < 1 &&
        Math.abs(nextPosition.y - position.y) < 1
      ) {
        return
      }

      onChangePosition(nextPosition)
    }

    const handleResize = () => {
      window.cancelAnimationFrame(animationFrameId)
      animationFrameId = window.requestAnimationFrame(clampCurrentPosition)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [isHidden, mode, position, onChangePosition])

  const startDrag = (
    event: ReactPointerEvent<HTMLDivElement> | ReactPointerEvent<HTMLButtonElement>,
    element: HTMLElement | null,
  ) => {
    if (isNoDragTarget(event.target)) return
    if (!element) return

    const rect = element.getBoundingClientRect()
    const initialPosition = {
      x: rect.left,
      y: rect.top,
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      width: rect.width,
      height: rect.height,
      lastPosition: initialPosition,
    }

    element.setPointerCapture(event.pointerId)
    setDragPosition(initialPosition)
    setIsDragging(true)
  }

  const moveDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) return

    const nextPosition = clampFloatingPosition(
      {
        x: dragState.startLeft + event.clientX - dragState.startX,
        y: dragState.startTop + event.clientY - dragState.startY,
      },
      dragState.width,
      dragState.height,
    )

    dragState.lastPosition = nextPosition
    setDragPosition(nextPosition)
  }

  const finishDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) return

    onChangePosition(dragState.lastPosition)
    dragStateRef.current = null
    setDragPosition(null)
    setIsDragging(false)

    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // 이미 capture가 풀린 경우 무시
    }
  }

  if (isHidden) {
    return (
      <button
        ref={restoreButtonRef}
        type="button"
        className="floating-player-restore is-default"
        onClick={() => onChangeHidden(false)}
        title="Show player"
      >
        <img src={playlistIcon} alt="" />
      </button>
    )
  }

  return (
    <div
      ref={playerRef}
      className={`floating-player floating-player-${mode} ${isPositioned ? 'is-positioned' : 'is-default'} ${isDragging ? 'dragging' : ''}`}
      style={positionStyle}
      onPointerDown={(event) => startDrag(event, playerRef.current)}
      onPointerMove={moveDrag}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
    >
      {mode === 'expanded' ? (
        <>
          <div className="floating-player-top-actions">
            <button
              type="button"
              className="floating-player-window-button minimize"
              onClick={() => onChangeMode('minimized')}
              title="Minimize player"
            >
              —
            </button>
            <button
              type="button"
              className="floating-player-window-button close"
              onClick={() => onChangeHidden(true)}
              title="Close player"
            >
              ×
            </button>
          </div>

          <div className="floating-player-main">
            {currentTrack.thumbnail
              ? <img src={currentTrack.thumbnail} alt="" className="floating-player-cover" />
              : <span className="floating-player-cover"></span>
            }

            <div className="floating-player-info">
              <FloatingMarqueeText
                className="floating-player-title"
                text={currentTrack.title}
              />
              <FloatingMarqueeText
                className="floating-player-artist"
                text={currentTrack.artist}
              />
            </div>

            <div className="floating-player-controls" data-no-drag="true">
              <button type="button" onClick={onPlayPrevTrack} title="Previous">‹</button>
              <button
                type="button"
                className="floating-player-play"
                onClick={onTogglePlayPause}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying
                  ? <img src={playbackIconMap.pause.white} alt="" className="floating-player-play-icon" />
                  : <img src={playbackIconMap.start.white} alt="" className="floating-player-play-icon" />
                }
              </button>
              <button type="button" onClick={onPlayNextTrack} title="Next">›</button>
            </div>
          </div>

          <button
            type="button"
            className="floating-player-progress"
            onPointerDown={onProgressPointerDown}
            onPointerMove={onProgressPointerMove}
            onPointerUp={onProgressPointerUp}
            data-no-drag="true"
          >
            <span style={{ width: `${progress}%` }}></span>
          </button>

          <div className="floating-player-times">
            <span>{formatTime(currentSeconds)}</span>
            <span>{formatTime(durationSeconds)}</span>
          </div>

          <div className="floating-player-bottom">
            <div className="floating-player-volume" data-no-drag="true">
              <img src={speakerIcon} alt="" />
              <button
                type="button"
                className="floating-player-volume-track"
                onPointerDown={onVolumePointerDown}
                onPointerMove={onVolumePointerMove}
              >
                <i style={{ width: `${volume}%` }}></i>
              </button>
            </div>

            <button
              type="button"
              className={`floating-player-like-button like-burst-button ${isLiked ? 'active' : ''} ${isLikeButtonBursting ? 'bursting' : ''}`}
              onClick={handleLikeButtonClick}
              onMouseEnter={() => setIsLikeButtonHovered(true)}
              onMouseLeave={() => setIsLikeButtonHovered(false)}
              title={isLiked ? 'Unlike' : 'Like'}
              aria-label={isLiked ? 'Unlike current track' : 'Like current track'}
              data-no-drag="true"
            >
              <img src={getLikeIcon(isLiked, isLikeButtonHovered)} alt="" className="like-icon" />
              <span className="like-burst" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>

            <div className="floating-player-actions" data-no-drag="true">
              <button
                type="button"
                className={`floating-player-icon-button ${isShuffleEnabled ? 'active' : ''}`}
                onClick={onToggleShuffle}
                onMouseEnter={() => setIsShuffleButtonHovered(true)}
                onMouseLeave={() => setIsShuffleButtonHovered(false)}
                title="Shuffle"
              >
                <img src={isShuffleEnabled || isShuffleButtonHovered ? shuffleActiveIcon : shuffleIcon} alt="" />
              </button>
              <button
                type="button"
                className="floating-player-icon-button"
                onMouseEnter={() => setIsListButtonHovered(true)}
                onMouseLeave={() => setIsListButtonHovered(false)}
                onClick={onOpenFullPlaylist}
                title="Full playlist"
              >
                <img src={isListButtonHovered ? listActiveIcon : listIcon} alt="" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {currentTrack.thumbnail
            ? <img src={currentTrack.thumbnail} alt="" className="floating-player-mini-cover" />
            : <span className="floating-player-mini-cover"></span>
          }

          <div className="floating-player-mini-info">
            <FloatingMarqueeText
              className="floating-player-mini-title"
              text={currentTrack.title}
            />
            <FloatingMarqueeText
              className="floating-player-mini-artist"
              text={currentTrack.artist}
            />
          </div>

          <div className="floating-player-mini-volume" data-no-drag="true">
            <img src={speakerIcon} alt="" />
            <button
              type="button"
              className="floating-player-volume-track"
              onPointerDown={onVolumePointerDown}
              onPointerMove={onVolumePointerMove}
            >
              <i style={{ width: `${volume}%` }}></i>
            </button>
          </div>

          <div className="floating-player-mini-time">
            {formatTime(currentSeconds)} / {formatTime(durationSeconds)}
          </div>

          <div className="floating-player-mini-controls" data-no-drag="true">
            <button type="button" onClick={onPlayPrevTrack} title="Previous">‹</button>
            <button
              type="button"
              className="floating-player-mini-play"
              onClick={onTogglePlayPause}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying
                ? <img src={playbackIconMap.pause[accentColor]} alt="" className="floating-player-mini-play-icon" />
                : <img src={playbackIconMap.start[accentColor]} alt="" className="floating-player-mini-play-icon" />
              }
            </button>
            <button type="button" onClick={onPlayNextTrack} title="Next">›</button>
          </div>

          <button
            type="button"
            className={`floating-player-like-button floating-player-mini-like-button like-burst-button ${isLiked ? 'active' : ''} ${isLikeButtonBursting ? 'bursting' : ''}`}
            onClick={handleLikeButtonClick}
            onMouseEnter={() => setIsLikeButtonHovered(true)}
            onMouseLeave={() => setIsLikeButtonHovered(false)}
            title={isLiked ? 'Unlike' : 'Like'}
            aria-label={isLiked ? 'Unlike current track' : 'Like current track'}
            data-no-drag="true"
          >
            <img src={getLikeIcon(isLiked, isLikeButtonHovered)} alt="" className="like-icon" />
            <span className="like-burst" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>

          <button
            type="button"
            className={`floating-player-icon-button ${isShuffleEnabled ? 'active' : ''}`}
            onClick={onToggleShuffle}
            onMouseEnter={() => setIsShuffleButtonHovered(true)}
            onMouseLeave={() => setIsShuffleButtonHovered(false)}
            title="Shuffle"
            data-no-drag="true"
          >
            <img src={isShuffleEnabled || isShuffleButtonHovered ? shuffleActiveIcon : shuffleIcon} alt="" />
          </button>

          <button
            type="button"
            className="floating-player-window-button expand"
            onClick={() => onChangeMode('expanded')}
            onMouseEnter={() => setIsExpandButtonHovered(true)}
            onMouseLeave={() => setIsExpandButtonHovered(false)}
            title="Expand player"
            data-no-drag="true"
          >
            <img
              src={playbackIconMap.max[isExpandButtonHovered ? accentColor : 'gray']}
              alt=""
              className="floating-player-max-icon"
            />
          </button>

          <button
            type="button"
            className="floating-player-window-button close"
            onClick={() => onChangeHidden(true)}
            title="Close player"
            data-no-drag="true"
          >
            ×
          </button>
        </>
      )}
    </div>
  )
}
