import { getWriteDiaryTitleParts, weekdayNames, iconMap } from '../constants'
import saveIcon from '../assets/save.png'

type Props = {
  currentDate: Date
  diaryText: string
  isDiarySaveButtonPressed: boolean
  isDiarySavedVisible: boolean
  onSetActivePage: (page: 'diary') => void
  onSetDiaryText: (text: string) => void
  onSaveDiary: () => void
  getThemeIcon: (name: keyof typeof iconMap, isActive?: boolean) => string
}

export function WriteDiaryPage({
  currentDate, diaryText, isDiarySaveButtonPressed, isDiarySavedVisible,
  onSetActivePage, onSetDiaryText, onSaveDiary, getThemeIcon,
}: Props) {
  const { monthDay, year } = getWriteDiaryTitleParts(currentDate)

  return (
    <section className="write-diary-page">
      <div className="write-diary-header">
        <h1>Write Diary</h1>
        <p>Write down your thoughts in 300 characters every day.</p>
      </div>

      <div className="write-diary-card">
        <div className="write-diary-top">
          <button className="write-diary-back-button" onClick={() => onSetActivePage('diary')}>
            ‹ Back
          </button>

          <div className="write-diary-date">
            <span>
              <img src={getThemeIcon('date')} alt="" className="diary-date-icon" />
            </span>
            <div>
              <h2>{monthDay}<em>{year}</em></h2>
              <p>{weekdayNames[currentDate.getDay()]}</p>
            </div>
          </div>

          <div className="write-diary-actions">
            <button
              className={`write-diary-save-button ${isDiarySaveButtonPressed ? 'pressed' : ''}`}
              onClick={onSaveDiary}
              disabled={diaryText.trim().length === 0 || diaryText.length > 300}
            >
              <img src={saveIcon} alt="" className="diary-button-icon" />
              Save
            </button>
          </div>
        </div>

        <textarea
          className="write-diary-textarea"
          placeholder="Start writing your diary..."
          value={diaryText}
          maxLength={300}
          spellCheck={false}
          onChange={(e) => onSetDiaryText(e.target.value)}
        />

        <div className="write-diary-bottom">
          <span>{diaryText.length} / 300 characters</span>
          {isDiarySavedVisible && <strong>● Saved</strong>}
        </div>
      </div>
    </section>
  )
}
