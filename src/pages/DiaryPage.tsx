import type { DiaryEntry } from '../types'
import { formatDateKey, formatDiaryMonthTitle, isSameDate, isCurrentMonth, getDiaryCalendarDays, calendarWeekdays } from '../constants'
import writeIcon from '../assets/write.png'

type Props = {
  currentDate: Date
  diaryDisplayDate: Date
  diaryEntries: Record<string, DiaryEntry>
  todayDiaryEntry: DiaryEntry | undefined
  onSetActivePage: (page: 'writeDiary') => void
  onMoveDiaryMonth: (offset: number) => void
  onOpenDiaryPickerWithDate: () => void
  onSetDiaryDisplayDate: (date: Date) => void
  onOpenDiaryDate: (date: Date) => void
}

export function DiaryPage({
  currentDate, diaryDisplayDate, diaryEntries, todayDiaryEntry,
  onSetActivePage, onMoveDiaryMonth, onOpenDiaryPickerWithDate,
  onSetDiaryDisplayDate, onOpenDiaryDate,
}: Props) {
  const diaryCalendarDays = getDiaryCalendarDays(diaryDisplayDate)

  return (
    <section className="diary-page">
      <div className="diary-card">
        <div className="diary-header">
          <div>
            <h1>Diary</h1>
            <p>Write down your thoughts in 300 characters every day.</p>
          </div>
          <button className="diary-write-button" onClick={() => onSetActivePage('writeDiary')}>
            <img src={writeIcon} alt="" className="diary-button-icon" />
            {todayDiaryEntry ? 'Edit Diary' : 'Write Diary'}
          </button>
        </div>

        <div className="diary-calendar-header">
          <div className="diary-month-control">
            <button onClick={() => onMoveDiaryMonth(-1)}>‹</button>
            <button className="diary-current-month" onClick={onOpenDiaryPickerWithDate}>
              <strong>{formatDiaryMonthTitle(diaryDisplayDate)}</strong>
              <span>{diaryDisplayDate.getFullYear()}</span>
            </button>
            <button onClick={() => onMoveDiaryMonth(1)}>›</button>
          </div>
          <button
            className="diary-today-button"
            onClick={() => onSetDiaryDisplayDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1))}
          >
            Today
          </button>
        </div>

        <div className="diary-weekdays">
          {calendarWeekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
        </div>

        <div className="diary-calendar-grid">
          {diaryCalendarDays.map((date) => {
            const dateKey = formatDateKey(date)
            const hasDiary = Boolean(diaryEntries[dateKey])
            const isToday = isSameDate(date, currentDate)
            const isMuted = !isCurrentMonth(date, diaryDisplayDate)
            return (
              <button
                key={dateKey}
                className={`diary-day ${isToday ? 'today' : ''} ${isMuted ? 'muted' : ''}`}
                onClick={() => onOpenDiaryDate(date)}
              >
                <span>{date.getDate()}</span>
                {hasDiary && <i></i>}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
