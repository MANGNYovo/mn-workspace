import { useEffect, useRef, useState } from 'react'
import { loadYoutubeIframeApi, type YoutubePlayer } from '../utils/youtubePlayer'
import type { KaraokeSong } from '../utils/karaoke'

export type KaraokeClip = { song: KaraokeSong; key: number }

export function KaraokeVideo({ clip, volume, playbackEnabled = true, onPlayed, onEnded }: {
  clip: KaraokeClip | null; volume: number; playbackEnabled?: boolean; onPlayed?: (videoId: string) => void; onEnded?: () => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const player = useRef<YoutubePlayer | null>(null)
  const clipRef = useRef(clip)
  clipRef.current = clip
  const changeClip = useRef<(() => void) | null>(null)
  const callback = useRef(onPlayed)
  callback.current = onPlayed
  const endedCallback = useRef(onEnded)
  endedCallback.current = onEnded
  const volumeRef = useRef(volume)
  volumeRef.current = volume
  const playbackEnabledRef = useRef(playbackEnabled)
  playbackEnabledRef.current = playbackEnabled
  const startPlayback = useRef<(() => void) | null>(null)
  const [status, setStatus] = useState('영상을 준비하고 있어요…')
  const [needsPlay, setNeedsPlay] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    let currentClip: KaraokeClip | null = null
    let playerReady = false
    let started = false
    let ready = false
    let ended = false
    let errored = false
    let playbackRequested = false
    let watchdog: number | undefined
    setStatus('영상을 준비하고 있어요…')
    setNeedsPlay(false)
    setFailed(false)
    const fail = (message: string) => { if (!cancelled) { errored = true; setStatus(message); setFailed(true) } }
    const finish = () => {
      if (cancelled || !currentClip || currentClip !== clipRef.current || ended || !started || errored) return
      ended = true
      player.current?.pauseVideo?.()
      setStatus('구간 재생이 끝났어요.')
      endedCallback.current?.()
    }
    const start = () => {
      if (cancelled || !currentClip || currentClip !== clipRef.current || !ready || !playbackEnabledRef.current || playbackRequested || errored) return
      playbackRequested = true
      player.current?.setVolume?.(volumeRef.current)
      player.current?.playVideo?.()
      watchdog = window.setTimeout(() => {
        if (!cancelled && !started) { setStatus('재생이 시작되지 않았다면 재생 버튼을 눌러 주세요.'); setNeedsPlay(true) }
      }, 15000)
    }
    const prepare = () => {
      if (cancelled || !playerReady || currentClip === clipRef.current) return
      currentClip = clipRef.current
      ready = false
      started = false
      ended = false
      errored = false
      playbackRequested = false
      window.clearTimeout(watchdog)
      player.current?.pauseVideo?.()
      setNeedsPlay(false)
      setFailed(false)
      setStatus('영상을 준비하고 있어요…')
      if (!currentClip) { player.current?.stopVideo?.(); return }
      player.current?.cueVideoById?.({ videoId: currentClip.song.videoId, startSeconds: currentClip.song.start, endSeconds: currentClip.song.end })
    }
    changeClip.current = prepare
    startPlayback.current = start
    void loadYoutubeIframeApi().then(YT => {
      if (cancelled || !host.current) return
      const element = document.createElement('div')
      host.current.replaceChildren(element)
      player.current = new YT.Player(element, {
        width: 960, height: 540,
        playerVars: { autoplay: 0, controls: 1, playsinline: 1, rel: 0, fs: 1, origin: window.location.origin },
        events: {
          onReady: ({ target }) => {
            if (cancelled) { target.destroy?.(); return }
            playerReady = true
            target.setVolume?.(volumeRef.current)
            // Reuse this iframe for every song; cue without background playback.
            prepare()
          },
          onStateChange: ({ data, target }) => {
            if (cancelled) return
            if (!currentClip || currentClip !== clipRef.current) {
              if (data === YT.PlayerState.PLAYING) target.pauseVideo?.()
              return
            }
            if (data === YT.PlayerState.CUED) {
              ready = true
              start()
            }
            if (data === YT.PlayerState.PLAYING) {
              if (!playbackEnabledRef.current || !ready) { target.pauseVideo?.(); return }
              const duration = target.getDuration?.() ?? 0
              if (duration > 0 && currentClip.song.start >= duration) {
                target.pauseVideo?.(); fail('시작 시간이 영상 길이보다 길어요. 곡 관리에서 수정해 주세요.'); return
              }
              if (ended) { target.pauseVideo?.(); return }
              started = true
              window.clearTimeout(watchdog)
              setNeedsPlay(false)
              setStatus('지정한 구간을 재생 중이에요')
              callback.current?.(currentClip.song.videoId)
            }
            if (data === YT.PlayerState.ENDED) {
              finish()
            }
          },
          onAutoplayBlocked: () => { if (!cancelled) { setNeedsPlay(true); setStatus('재생 버튼을 눌러 노래를 시작해 주세요.') } },
          onError: () => fail('이 영상은 재생할 수 없어요. 링크나 외부 재생 허용 여부를 확인하고 다른 곡을 선택해 주세요.'),
        },
      })
    }).catch(() => fail('유튜브에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.'))
    const poll = window.setInterval(() => {
      if (!currentClip || currentClip !== clipRef.current || !ready || !started || ended || cancelled) return
      const time = player.current?.getCurrentTime?.() ?? 0
      if (time >= currentClip.song.end) {
        finish()
      }
    }, 150)
    return () => {
      cancelled = true
      startPlayback.current = null
      changeClip.current = null
      window.clearInterval(poll)
      window.clearTimeout(watchdog)
      player.current?.destroy?.()
      player.current = null
    }
  }, [])

  useEffect(() => { changeClip.current?.() }, [clip])

  useEffect(() => {
    player.current?.setVolume?.(volume)
    if (volume > 0) player.current?.unMute?.()
  }, [volume])

  // The parent reveals the same mounted player before enabling playback.
  useEffect(() => {
    if (playbackEnabled) startPlayback.current?.()
  }, [playbackEnabled])

  return <div className="karaoke-video-wrap">
    <div className="karaoke-video-host" ref={host} />
    <div className={`karaoke-video-status ${failed ? 'is-error' : ''}`} role="status">
      {status}
      {needsPlay && !failed && <button onClick={() => player.current?.playVideo?.()}>▶ 재생</button>}
    </div>
  </div>
}
