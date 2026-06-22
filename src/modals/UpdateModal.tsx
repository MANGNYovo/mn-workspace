import type { AccentColor } from '../types'
import { iconMap } from '../constants'

type UpdateModalType = 'available' | 'downloading' | 'ready' | 'latest' | 'error'

type Props = {
  updateModalType: UpdateModalType
  updateProgress: number
  appVersion: string
  accentColor: AccentColor
  onClose: () => void
  onStartDownload: () => void
  onInstall: () => void
}

export function UpdateModal({
  updateModalType, updateProgress, appVersion, accentColor,
  onClose, onStartDownload, onInstall,
}: Props) {
  return (
    <div className="modal-overlay">
      <div className="update-modal">
        <div className="update-modal-icon">
          <img src={iconMap.check[accentColor]} alt="" />
        </div>

        <h2>
          {updateModalType === 'available' && 'Update Available'}
          {updateModalType === 'downloading' && 'Downloading Update'}
          {updateModalType === 'ready' && 'Update Ready'}
          {updateModalType === 'latest' && 'Already Up to Date'}
          {updateModalType === 'error' && 'Update Failed'}
        </h2>

        <p>
          {updateModalType === 'available' && 'A new version of MN WORKSPACE is ready.'}
          {updateModalType === 'downloading' && 'Please wait while the update is being downloaded.'}
          {updateModalType === 'ready' && 'The update is ready to install.'}
          {updateModalType === 'latest' && 'You are already using the latest version.'}
          {updateModalType === 'error' && 'The update could not be downloaded.'}
        </p>

        <div className="update-modal-version">
          {updateModalType === 'available' && (
            <><span>Current v{appVersion}</span><b>→</b><span>New version</span></>
          )}
          {updateModalType === 'downloading' && (
            <div className="update-progress-wrap">
              <div className="update-progress-info">
                <span>Downloading update</span>
                <b>{updateProgress}%</b>
              </div>
              <div className="update-progress-bar">
                <span style={{ width: `${updateProgress}%` }}></span>
              </div>
            </div>
          )}
          {updateModalType === 'ready' && (
            <><span>MN WORKSPACE v{appVersion}</span><b>→</b><span>Restart required</span></>
          )}
          {updateModalType === 'latest' && <span>MN WORKSPACE v{appVersion}</span>}
          {updateModalType === 'error' && <span>Download failed</span>}
        </div>

        {updateModalType !== 'downloading' && (
          <div className="update-modal-actions">
            {updateModalType !== 'latest' && updateModalType !== 'ready' && (
              <button className="modal-cancel-button" onClick={onClose}>Later</button>
            )}
            <button
              className="modal-add-button"
              onClick={() => {
                if (updateModalType === 'available') onStartDownload()
                else if (updateModalType === 'ready') onInstall()
                else onClose()
              }}
            >
              {updateModalType === 'available' ? 'Update' : updateModalType === 'ready' ? 'Restart' : 'OK'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
