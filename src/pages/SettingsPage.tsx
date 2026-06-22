import { useRef, type ChangeEvent } from 'react'
import type { AppSettings, AccentColor, LaunchDelay, LaunchBehavior, ResolvedTheme, YoutubeMusicAccount } from '../types'
import { iconMap } from '../constants'

type Props = {
  settings: AppSettings
  appVersion: string
  isCheckingUpdates: boolean
  isPlaylistRefreshing: boolean
  activeTheme: ResolvedTheme
  isYtAuthenticated: boolean
  youtubeMusicAccount: YoutubeMusicAccount | null
  isYoutubeAccountLoading: boolean
  onUpdateSettings: (partial: Partial<AppSettings>) => void
  onToggleStartWithWindows: () => void
  onCheckForUpdates: () => void
  onReloadYoutubeMusicData: () => void
  onLoginYoutubeMusic: () => void
  onLogoutYoutubeMusic: () => void
  getThemeIcon: (name: keyof typeof iconMap, isActive?: boolean) => string
}

export function SettingsPage({
  settings, appVersion, isCheckingUpdates, isPlaylistRefreshing, activeTheme,
  isYtAuthenticated, youtubeMusicAccount, isYoutubeAccountLoading,
  onUpdateSettings, onToggleStartWithWindows, onCheckForUpdates, onReloadYoutubeMusicData,
  onLoginYoutubeMusic, onLogoutYoutubeMusic,
}: Props) {
  const wallpaperInputRef = useRef<HTMLInputElement | null>(null)
  const youtubeAccountLabel = isYoutubeAccountLoading
    ? 'Checking account...'
    : isYtAuthenticated
      ? youtubeMusicAccount?.email
        ? `Signed in as ${youtubeMusicAccount.email}`
        : youtubeMusicAccount?.name || youtubeMusicAccount?.channelTitle
          ? `Signed in as ${youtubeMusicAccount.name || youtubeMusicAccount.channelTitle}`
          : 'Signed in'
      : 'Not signed in'


  const handleWallpaperChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') return

      onUpdateSettings({
        theme: 'Custom Wallpaper',
        customWallpaper: reader.result,
        customWallpaperName: file.name,
      })
    }
    reader.readAsDataURL(file)
  }

  return (
    <section className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Configure workspace auto-launch and application preferences.</p>
      </div>

      <div className="settings-card">
        <h3>General</h3>

        <div className="setting-row">
          <div>
            <strong>Start with Windows</strong>
            <p>Launch MN WORKSPACE automatically when Windows starts.</p>
          </div>
          <button className={`toggle ${settings.startWithWindows ? 'on' : ''}`} onClick={onToggleStartWithWindows}>
            <span></span>
          </button>
        </div>

        <div className="setting-row">
          <div>
            <strong>Minimize to system tray</strong>
            <p>Minimize application to system tray instead of taskbar.</p>
          </div>
          <button
            className={`toggle ${settings.minimizeToTray ? 'on' : ''}`}
            onClick={() => onUpdateSettings({ minimizeToTray: !settings.minimizeToTray })}
          >
            <span></span>
          </button>
        </div>

        <div className="setting-row">
          <div>
            <strong>Check for updates</strong>
            <p>Automatically check for updates on startup.</p>
          </div>
          <div className="setting-update-actions">
            <button
              className={`setting-icon-action ${isCheckingUpdates ? 'checking' : ''}`}
              onClick={onCheckForUpdates}
              title="Check for updates"
            >
              <img
                src={isCheckingUpdates
                  ? iconMap.check[settings.accentColor]
                  : activeTheme === 'dark' ? iconMap.check.white : iconMap.check.gray
                }
                alt=""
              />
            </button>
            <button
              className={`toggle ${settings.checkForUpdates ? 'on' : ''}`}
              onClick={() => onUpdateSettings({ checkForUpdates: !settings.checkForUpdates })}
            >
              <span></span>
            </button>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <h3>YouTube Music</h3>

        <div className="setting-row youtube-account-row">
          <div className="youtube-account-info">
            <strong>Account</strong>
            <p>{youtubeAccountLabel}</p>
          </div>
          {isYtAuthenticated ? (
            <button
              type="button"
              className="setting-action setting-youtube-account-action danger"
              onClick={onLogoutYoutubeMusic}
              disabled={isYoutubeAccountLoading}
            >
              Logout
            </button>
          ) : (
            <button
              type="button"
              className="setting-action setting-youtube-account-action"
              onClick={onLoginYoutubeMusic}
            >
              Login
            </button>
          )}
        </div>

        <div className="setting-row">
          <div>
            <strong>Reload playlist data</strong>
            <p>{isYtAuthenticated ? 'Reload all playlists, cover images, and cached tracks.' : 'Sign in to reload your YouTube Music playlists.'}</p>
          </div>
          <button
            className="setting-action setting-reload-action"
            onClick={onReloadYoutubeMusicData}
            disabled={isPlaylistRefreshing || !isYtAuthenticated}
          >
            {isPlaylistRefreshing ? 'Reloading...' : 'Reload'}
          </button>
        </div>
      </div>

      <div className="settings-card">
        <h3>Auto Launch</h3>

        <div className="setting-row">
          <div>
            <strong>Launch delay</strong>
            <p>Set a delay before launching the next program.</p>
          </div>
          <select
            className="setting-select"
            value={settings.launchDelay}
            onChange={(e) => onUpdateSettings({ launchDelay: e.target.value as LaunchDelay })}
          >
            <option>1 second</option>
            <option>2 seconds</option>
            <option>3 seconds</option>
            <option>5 seconds</option>
          </select>
        </div>

        <div className="setting-row">
          <div>
            <strong>Launch behavior</strong>
            <p>Choose how programs are launched.</p>
          </div>
          <select
            className="setting-select"
            value={settings.launchBehavior}
            onChange={(e) => onUpdateSettings({ launchBehavior: e.target.value as LaunchBehavior })}
          >
            <option>Launch in order</option>
            <option>Launch all at once</option>
          </select>
        </div>

        <div className="setting-row">
          <div>
            <strong>Stop launching on error</strong>
            <p>Stop the sequence if a program fails to launch.</p>
          </div>
          <button
            className={`toggle ${settings.stopLaunchingOnError ? 'on' : ''}`}
            onClick={() => onUpdateSettings({ stopLaunchingOnError: !settings.stopLaunchingOnError })}
          >
            <span></span>
          </button>
        </div>
      </div>

      <div className="settings-card">
        <h3>Appearance</h3>

        <div className="setting-row">
          <div>
            <strong>Theme</strong>
            <p>Choose the application theme.</p>
          </div>
          <select
            className="setting-select"
            value={settings.theme}
            onChange={(e) => onUpdateSettings({ theme: e.target.value as AppSettings['theme'] })}
          >
            <option>Light</option>
            <option>Dark</option>
            <option>System</option>
            <option>Custom Wallpaper</option>
          </select>
        </div>

        {settings.theme === 'Custom Wallpaper' && (
          <div className="setting-row wallpaper-setting-row">
            <div>
              <strong>Custom wallpaper</strong>
              <p>{settings.customWallpaperName || 'Choose an image to use as the application background.'}</p>
            </div>
            <div className="wallpaper-actions">
              {settings.customWallpaper && (
                <span
                  className="wallpaper-preview"
                  style={{ backgroundImage: `url("${settings.customWallpaper}")` }}
                  aria-hidden="true"
                />
              )}
              <input
                ref={wallpaperInputRef}
                className="wallpaper-input"
                type="file"
                accept="image/*"
                onChange={handleWallpaperChange}
              />
              <button
                type="button"
                className="setting-action setting-wallpaper-action"
                onClick={() => wallpaperInputRef.current?.click()}
              >
                {settings.customWallpaper ? 'Change' : 'Choose'}
              </button>
              {settings.customWallpaper && (
                <button
                  type="button"
                  className="setting-action setting-wallpaper-clear"
                  onClick={() => onUpdateSettings({ customWallpaper: null, customWallpaperName: null })}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        )}

        <div className="setting-row">
          <div>
            <strong>Accent color</strong>
            <p>Choose the accent color for the application.</p>
          </div>
          <div className="accent-list">
            {(['purple', 'blue', 'green', 'orange', 'red', 'gray'] as AccentColor[]).map((color) => (
              <button
                key={color}
                className={`accent-dot ${color} ${settings.accentColor === color ? 'active' : ''}`}
                onClick={() => onUpdateSettings({ accentColor: color })}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="settings-footer">MN WORKSPACE v{appVersion}</div>
    </section>
  )
}
