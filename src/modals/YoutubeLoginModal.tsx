import type { HomeMusicPlaylist } from '../types'
import { isHomeMusicPlaylistList } from '../constants'
import youtubeMusicIcon from '../assets/youtubemusic.png'
import googleIcon from '../assets/google.png'

type Props = {
  onClose: () => void
  onLoginSuccess: (playlists: HomeMusicPlaylist[]) => void
}

export function YoutubeLoginModal({ onClose, onLoginSuccess }: Props) {
  return (
    <div className="modal-overlay">
      <div className="youtube-login-modal">
        <button className="youtube-login-close" onClick={onClose}>×</button>

        <img src={youtubeMusicIcon} alt="" className="youtube-login-icon" />
        <h2>Sign in to YouTube Music</h2>
        <p>Sign in with your YouTube Music account<br />to access your playlists, library, and more.</p>

        <button
          className="youtube-google-button"
          onClick={async () => {
            const success = await window.mnAPI.loginYoutubeMusic()
            if (success) {
              const loadedPlaylists = await window.mnAPI.getYoutubeMusicPlaylists()
              if (isHomeMusicPlaylistList(loadedPlaylists)) {
                onLoginSuccess(loadedPlaylists)
              }
            }
          }}
        >
          <img src={googleIcon} alt="" className="youtube-google-icon" />
          Continue with Google
        </button>

        <div className="youtube-login-divider"><span></span></div>

        <div className="youtube-login-links">
          <span>Don't have an account?</span>
          <a href="https://accounts.google.com/signup" target="_blank" rel="noreferrer">Create account</a>
        </div>

        <div className="youtube-login-policy">
          By continuing, you agree to YouTube's<br />
          <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">Terms of Service</a>
          {' '}and{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.
        </div>
      </div>
    </div>
  )
}
