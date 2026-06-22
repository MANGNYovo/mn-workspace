import type { DiaryEntry } from '../types'
import { monthNames, weekdayNames, iconMap } from '../constants'
import trashIcon from '../assets/trash.png'

type Props = {
  selectedDiaryDate: Date
  selectedDiaryEntry: DiaryEntry
  onClose: () => void
  onDelete: () => void
  getThemeIcon: (name: keyof typeof iconMap, isActive?: boolean) => string
}

export function DiaryViewModal({ selectedDiaryDate, selectedDiaryEntry, onClose, onDelete, getThemeIcon }: Props) {
  return (
    <div className="modal-overlay">
      <div className="diary-view-modal">
        <button className="diary-modal-close" onClick={onClose}>×</button>

        <div className="diary-view-header">
          <span>
            <img src={getThemeIcon('date')} alt="" className="diary-date-icon" />
          </span>
          <div>
            <h2>
              {monthNames[selectedDiaryDate.getMonth()]} {selectedDiaryDate.getDate()}
              <em>{selectedDiaryDate.getFullYear()}</em>
            </h2>
            <p>{weekdayNames[selectedDiaryDate.getDay()]}</p>
          </div>
        </div>

        <div className="diary-view-content">
          {selectedDiaryEntry.content.split('\n').map((line, index) => (
            <p key={index}>{line || '\u00A0'}</p>
          ))}
        </div>

        <div className="diary-view-footer">
          <span>{selectedDiaryEntry.content.length} / 300</span>
          <button onClick={onDelete}>
            <img src={trashIcon} alt="" className="diary-trash-icon" />
          </button>
        </div>
      </div>
    </div>
  )
}
