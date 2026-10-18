export type YoutubePlayer = {
  playVideo?: () => void
  pauseVideo?: () => void
  stopVideo?: () => void
  seekTo?: (seconds: number, allowSeekAhead?: boolean) => void
  setVolume?: (volume: number) => void
  unMute?: () => void
  mute?: () => void
  getCurrentTime?: () => number
  getDuration?: () => number
  loadVideoById?: (videoId: string | { videoId: string; startSeconds?: number; endSeconds?: number }) => void
  cueVideoById?: (videoId: string | { videoId: string; startSeconds?: number; endSeconds?: number }) => void
  destroy?: () => void
}

export type YoutubeApi = {
  Player: new (element: HTMLElement | string, options: {
    width: number
    height: number
    videoId?: string
    playerVars?: Record<string, string | number>
    events?: {
      onReady?: (event: { target: YoutubePlayer }) => void
      onStateChange?: (event: { data: number; target: YoutubePlayer }) => void
      onAutoplayBlocked?: () => void
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

let apiPromise: Promise<YoutubeApi> | null = null

export const loadYoutubeIframeApi = () => {
    if (window.YT?.Player) return Promise.resolve(window.YT)
    if (apiPromise) return apiPromise

    apiPromise = new Promise<YoutubeApi>((resolve, reject) => {
      const previousReady = window.onYouTubeIframeAPIReady
      const timeout = window.setTimeout(() => {
        apiPromise = null
        document.querySelector('script[src="https://www.youtube.com/iframe_api"]')?.remove()
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
          apiPromise = null
          script.remove()
          reject(new Error('Failed to load YouTube IFrame API.'))
        }
        document.head.appendChild(script)
      }
    })

    return apiPromise
  }
