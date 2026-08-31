import type { CSSProperties, MouseEvent } from 'react'

type Props = {
  now: Date
  wallpaper?: string | null
  wallpaperName?: string | null
  onExit: () => void
}

const isVideoWallpaper = (wallpaper?: string | null, wallpaperName?: string | null) => (
  /\.(mp4|webm)(?:$|[?#])/i.test(wallpaper ?? '') || /\.(mp4|webm)$/i.test(wallpaperName ?? '')
)

export function IdleScreen({ now, wallpaper, wallpaperName, onExit }: Props) {
  const timeParts = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).split(' ')

  const timeText = timeParts[0]
  const meridiem = timeParts[1] ?? ''
  const useVideo = Boolean(wallpaper && isVideoWallpaper(wallpaper, wallpaperName))

  const backgroundStyle = wallpaper && !useVideo
    ? ({ '--idle-wallpaper-image': `url("${wallpaper}")` } as CSSProperties)
    : undefined

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
    onExit()
  }

  return (
    <div
      className="idle-screen"
      role="presentation"
      aria-label="Idle screen. Click anywhere to continue."
      onClick={handleClick}
    >
      <div className="idle-screen-background" style={backgroundStyle} aria-hidden="true" />
      {useVideo && wallpaper && (
        <video
          className="idle-screen-video"
          src={wallpaper}
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        />
      )}
      <div className="idle-screen-soften" aria-hidden="true" />

      <div className="idle-screen-panel" aria-hidden="true">
        <div className="idle-screen-clock-row">
          <span className="idle-screen-time">{timeText}</span>
          <span className="idle-screen-meridiem">{meridiem}</span>
        </div>

        <div className="idle-screen-divider">
          <span />
          <i>✦</i>
          <span />
        </div>

        <div className="idle-screen-continue">
          <span>Click</span>
          <span>to continue</span>
        </div>

        <div className="idle-screen-orb">
          <span>✦</span>
        </div>
      </div>
    </div>
  )
}
