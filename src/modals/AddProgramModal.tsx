import type { ProgramType } from '../types'

type Props = {
  newProgramName: string
  newProgramType: ProgramType
  newProgramPath: string
  newProgramEnabled: boolean
  onSetNewProgramName: (v: string) => void
  onSetNewProgramType: (v: ProgramType) => void
  onSetNewProgramPath: (v: string) => void
  onSetNewProgramIconImage: (v: string | null) => void
  onSetNewProgramEnabled: (v: boolean | ((prev: boolean) => boolean)) => void
  onClose: () => void
  onAdd: () => void
  onBrowse: () => void
}

export function AddProgramModal({
  newProgramName, newProgramType, newProgramPath, newProgramEnabled,
  onSetNewProgramName, onSetNewProgramType, onSetNewProgramPath,
  onSetNewProgramIconImage, onSetNewProgramEnabled,
  onClose, onAdd, onBrowse,
}: Props) {
  return (
    <div className="modal-overlay">
      <div className="add-modal">
        <div className="modal-header">
          <div>
            <h2>Add Program</h2>
            <p>Add a program, folder, or URL to your workspace launch list.</p>
          </div>
          <button className="modal-close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-form">
          <label>
            Program Name
            <input
              type="text"
              placeholder="Program"
              value={newProgramName}
              onChange={(e) => onSetNewProgramName(e.target.value)}
            />
          </label>

          <label>
            Type
            <select
              value={newProgramType}
              onChange={(e) => {
                const type = e.target.value as ProgramType
                onSetNewProgramType(type)
                if (type === 'URL') { onSetNewProgramPath(''); onSetNewProgramIconImage(null) }
              }}
            >
              <option>Program</option>
              <option>Folder</option>
              <option>URL</option>
            </select>
          </label>

          <label>
            Path or URL
            <div className="path-row">
              <input
                type="text"
                placeholder={newProgramType === 'URL' ? 'https://music.youtube.com' : 'C:\\Program Files\\...'}
                value={newProgramPath}
                onChange={(e) => {
                  onSetNewProgramPath(e.target.value)
                  if (newProgramType !== 'Program') onSetNewProgramIconImage(null)
                }}
              />
              {newProgramType !== 'URL' && (
                <button type="button" onClick={onBrowse}>Browse</button>
              )}
            </div>
          </label>

          <div className="modal-toggle-row">
            <div>
              <strong>Enabled</strong>
              <p>Include this item when launching workspace.</p>
            </div>
            <button
              className={`toggle ${newProgramEnabled ? 'on' : ''}`}
              onClick={() => onSetNewProgramEnabled((prev) => !prev)}
            >
              <span></span>
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button className="modal-cancel-button" onClick={onClose}>Cancel</button>
          <button className="modal-add-button" onClick={onAdd}>Add Program</button>
        </div>
      </div>
    </div>
  )
}
