import { useState } from 'react'

/**
 * 좋아요 버튼 버스트 애니메이션 훅
 * HomePage, PlaylistPage, FloatingMusicPlayer에서 동일하게 쓰이던 로직 통합
 */
export function useLikeBurst() {
  const [isBursting, setIsBursting] = useState(false)

  const triggerBurst = () => {
    setIsBursting(false)
    window.requestAnimationFrame(() => setIsBursting(true))
    window.setTimeout(() => setIsBursting(false), 760)
  }

  return { isBursting, triggerBurst }
}
