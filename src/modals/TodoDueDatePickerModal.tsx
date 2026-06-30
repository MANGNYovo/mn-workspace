import type { CSSProperties } from 'react'
import { useState } from 'react'
import { calendarWeekdays, createMonthDate, formatDateKey, formatDiaryMonthTitle, getDiaryCalendarDays, isCurrentMonth, isSameDate } from '../constants'

type Props = {
  currentDate: Date
  selectedDateKey?: string
  onClose: () => void
  onClear: () => void
  onSelectDate: (dateKey: string) => void
  clearLabel?: string
}

const parseDateKey = (dateKey?: string) => {
  if (!dateKey) return null
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

export function TodoDueDatePickerModal({ currentDate, selectedDateKey, onClose, onClear, onSelectDate, clearLabel = 'No Due Date' }: Props) {
  const selectedDate = parseDateKey(selectedDateKey)
  const [displayDate, setDisplayDate] = useState(selectedDate ?? currentDate)
  const days = getDiaryCalendarDays(displayDate)

  return (
    <div className="modal-overlay todo-date-picker-overlay">
      <div className="todo-date-picker-modal">
        <button className="diary-modal-close" onClick={onClose}>×</button>

        <div className="todo-date-picker-header">
          <button type="button" onClick={() => setDisplayDate((prev) => createMonthDate(prev, -1))}>‹</button>
          <div>
            <strong>{formatDiaryMonthTitle(displayDate)}</strong>
            <span>{displayDate.getFullYear()}</span>
          </div>
          <button type="button" onClick={() => setDisplayDate((prev) => createMonthDate(prev, 1))}>›</button>
        </div>

        <div className="todo-date-weekdays">
          {calendarWeekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
        </div>

        <div className="todo-date-grid" style={{ '--todo-date-week-count': Math.ceil(days.length / 7) } as CSSProperties}>
          {days.map((date) => {
            const dateKey = formatDateKey(date)
            const selected = selectedDate ? isSameDate(date, selectedDate) : false
            const today = isSameDate(date, currentDate)
            const muted = !isCurrentMonth(date, displayDate)

            return (
              <button
                key={dateKey}
                type="button"
                className={`${selected ? 'selected' : ''} ${today ? 'today' : ''} ${muted ? 'muted' : ''}`}
                onClick={() => onSelectDate(dateKey)}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>

        <div className="todo-date-picker-actions">
          <button type="button" onClick={onClear}>{clearLabel}</button>
          <button type="button" onClick={() => setDisplayDate(currentDate)}>Today</button>
        </div>
      </div>
    </div>
  )
}
