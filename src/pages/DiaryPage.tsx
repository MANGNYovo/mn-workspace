import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { CalendarSchedule, DiaryEntry } from '../types'
import { formatDateKey, formatDiaryMonthTitle, isSameDate, isCurrentMonth, getDiaryCalendarDays, calendarWeekdays } from '../constants'
import writeIcon from '../assets/write.png'
import { TodoDueDatePickerModal } from '../modals/TodoDueDatePickerModal'
import { ScheduleTimePickerModal } from '../modals/ScheduleTimePickerModal'

const scheduleColorClass = (color?: CalendarSchedule['color']) => `schedule-${color ?? 'red'}`

const formatPanelDate = (date: Date) => `${formatDiaryMonthTitle(date)} ${date.getDate()}`

const parseScheduleInputPreview = (value: string) => {
  const trimmed = value.trim()
  const match = trimmed.match(/^(\d{1,2}:\d{2})\s+(.+)$/)
  if (!match) return { time: '', title: trimmed }
  return { time: match[1], title: match[2].trim() }
}

const formatEditDateLabel = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return 'Select date'
  const date = new Date(year, month - 1, day)
  return `${formatDiaryMonthTitle(date)} ${date.getDate()}, ${date.getFullYear()}`
}

const formatEditTimeLabel = (time?: string) => time || 'Select time'

const formatTwoDigit = (value: number) => String(value).padStart(2, '0')

const parseEditTime = (time?: string) => {
  const match = time?.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return { hour: 9, minute: 0 }

  return {
    hour: Math.max(0, Math.min(23, Number(match[1]))),
    minute: Math.max(0, Math.min(59, Number(match[2]))),
  }
}

type ScheduleEditDraft = {
  id: string
  title: string
  date: string
  time: string
}

type Props = {
  currentDate: Date
  diaryDisplayDate: Date
  diaryEntries: Record<string, DiaryEntry>
  todayDiaryEntry: DiaryEntry | undefined
  calendarSchedules: Record<string, CalendarSchedule[]>
  selectedScheduleDate: Date
  scheduleInput: string
  scheduleTimeInput: string
  onSetScheduleInput: (value: string) => void
  onOpenScheduleTimePicker: () => void
  onAddSchedule: () => void
  onUpdateSchedule: (scheduleId: string, updates: Partial<Pick<CalendarSchedule, 'title' | 'date' | 'time'>>) => void
  onDeleteSchedule: (scheduleId: string) => void
  onSetActivePage: (page: 'writeDiary') => void
  onOpenTodoPage: () => void
  onMoveDiaryMonth: (offset: number) => void
  onOpenDiaryPickerWithDate: () => void
  onSetDiaryDisplayDate: (date: Date) => void
  onSelectScheduleDate: (date: Date) => void
  onOpenDiaryDate: (date: Date) => void
}

export function DiaryPage({
  currentDate, diaryDisplayDate, diaryEntries, todayDiaryEntry,
  calendarSchedules, selectedScheduleDate, scheduleInput, scheduleTimeInput,
  onSetScheduleInput, onOpenScheduleTimePicker, onAddSchedule, onUpdateSchedule, onDeleteSchedule,
  onSetActivePage, onOpenTodoPage, onMoveDiaryMonth, onOpenDiaryPickerWithDate,
  onSetDiaryDisplayDate, onSelectScheduleDate, onOpenDiaryDate,
}: Props) {
  const [editingSchedule, setEditingSchedule] = useState<ScheduleEditDraft | null>(null)
  const [openScheduleMenuId, setOpenScheduleMenuId] = useState<string | null>(null)
  const [isEditDatePickerOpen, setIsEditDatePickerOpen] = useState(false)
  const [isEditTimePickerOpen, setIsEditTimePickerOpen] = useState(false)
  const [editTimePickerHour, setEditTimePickerHour] = useState(9)
  const [editTimePickerMinute, setEditTimePickerMinute] = useState(0)
  const scheduleMenuRef = useRef<HTMLDivElement | null>(null)
  const diaryCalendarDays = getDiaryCalendarDays(diaryDisplayDate)
  const diaryCalendarWeekCount = Math.max(1, Math.ceil(diaryCalendarDays.length / 7))
  const selectedDateKey = formatDateKey(selectedScheduleDate)
  const selectedSchedules = [...(calendarSchedules[selectedDateKey] ?? [])]
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
  const selectedHasDiary = Boolean(diaryEntries[selectedDateKey])
  const preview = parseScheduleInputPreview(scheduleInput)

  useEffect(() => {
    if (!openScheduleMenuId) return

    const closeMenu = (event: PointerEvent) => {
      if (!scheduleMenuRef.current) return
      if (scheduleMenuRef.current.contains(event.target as Node)) return
      setOpenScheduleMenuId(null)
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenScheduleMenuId(null)
    }

    document.addEventListener('pointerdown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('pointerdown', closeMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [openScheduleMenuId])

  const startEditSchedule = (schedule: CalendarSchedule) => {
    setOpenScheduleMenuId(null)
    setEditingSchedule({
      id: schedule.id,
      title: schedule.title,
      date: schedule.date,
      time: schedule.time ?? '',
    })
  }

  const cancelEditSchedule = () => {
    setEditingSchedule(null)
    setIsEditDatePickerOpen(false)
    setIsEditTimePickerOpen(false)
  }

  const openEditTimePicker = () => {
    const parsedTime = parseEditTime(editingSchedule?.time)
    setEditTimePickerHour(parsedTime.hour)
    setEditTimePickerMinute(parsedTime.minute)
    setIsEditTimePickerOpen(true)
  }


  const saveEditSchedule = () => {
    if (!editingSchedule?.title.trim()) return

    onUpdateSchedule(editingSchedule.id, {
      title: editingSchedule.title.trim(),
      date: editingSchedule.date,
      time: editingSchedule.time || undefined,
    })
    setEditingSchedule(null)
  }

  return (
    <section className="diary-page has-schedule-panel">
      <div className="diary-card">
        <div className="diary-header">
          <div>
            <h1>Diary</h1>
            <p>Write down your thoughts in 300 characters every day.</p>
          </div>
          <div className="diary-header-actions">
            <button className="diary-todo-shortcut-button" onClick={onOpenTodoPage}>
              To-Do
            </button>
            <button className="diary-write-button" onClick={() => onSetActivePage('writeDiary')}>
              <img src={writeIcon} alt="" className="diary-button-icon" />
              {todayDiaryEntry ? 'Edit Diary' : 'Write Diary'}
            </button>
          </div>
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
            onClick={() => {
              const todayMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
              onSetDiaryDisplayDate(todayMonth)
              onSelectScheduleDate(currentDate)
            }}
          >
            Today
          </button>
        </div>

        <div className="diary-weekdays">
          {calendarWeekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
        </div>

        <div
          className="diary-calendar-grid"
          style={{ '--diary-week-count': diaryCalendarWeekCount } as CSSProperties}
        >
          {diaryCalendarDays.map((date) => {
            const dateKey = formatDateKey(date)
            const hasDiary = Boolean(diaryEntries[dateKey])
            const isToday = isSameDate(date, currentDate)
            const isSelected = isSameDate(date, selectedScheduleDate)
            const isMuted = !isCurrentMonth(date, diaryDisplayDate)
            const schedules = [...(calendarSchedules[dateKey] ?? [])]
              .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
              .slice(0, 2)
            const hiddenScheduleCount = Math.max(0, (calendarSchedules[dateKey]?.length ?? 0) - schedules.length)

            return (
              <button
                key={dateKey}
                className={`diary-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isMuted ? 'muted' : ''}`}
                onClick={() => onSelectScheduleDate(date)}
              >
                <div className="diary-day-topline">
                  <span className="diary-day-number">{date.getDate()}</span>
                  {hasDiary && (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label="Open diary"
                      title="Open diary"
                      className="diary-entry-dot"
                      onClick={(event) => {
                        event.stopPropagation()
                        onOpenDiaryDate(date)
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return
                        event.preventDefault()
                        event.stopPropagation()
                        onOpenDiaryDate(date)
                      }}
                    />
                  )}
                </div>

                {(schedules.length > 0 || hiddenScheduleCount > 0) && (
                  <div className="diary-day-schedules">
                    {schedules.map((schedule) => (
                      <span key={schedule.id} className={`diary-calendar-schedule ${scheduleColorClass(schedule.color)}`}>
                        <i />
                        <span>{schedule.title}</span>
                      </span>
                    ))}
                    {hiddenScheduleCount > 0 && (
                      <span className="diary-calendar-more">+{hiddenScheduleCount} more</span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <aside className="diary-schedule-panel" aria-label="Selected day schedule">
        <div className="diary-schedule-panel-header">
          <div>
            <h2>{formatPanelDate(selectedScheduleDate)}</h2>
            <p>{selectedScheduleDate.getFullYear()}</p>
          </div>
        </div>

        <div className="diary-schedule-input-row">
          <button
            type="button"
            className={`diary-schedule-time-button ${scheduleTimeInput ? 'has-time' : ''}`}
            aria-label="Select schedule time"
            onClick={onOpenScheduleTimePicker}
          >
            {scheduleTimeInput || 'Time'}
          </button>
          <input
            className="diary-schedule-title-input"
            value={scheduleInput}
            placeholder="Add a schedule..."
            onChange={(event) => onSetScheduleInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onAddSchedule()
            }}
          />
          <button
            type="button"
            className="diary-schedule-add-button"
            aria-label="Add schedule"
            disabled={!preview.title}
            onClick={onAddSchedule}
          >
            +
          </button>
        </div>

        <div className="diary-schedule-list">
          {selectedSchedules.length > 0 ? selectedSchedules.map((schedule) => (
            <div key={schedule.id} className="diary-schedule-item">
              <span className={`diary-schedule-dot ${scheduleColorClass(schedule.color)}`} />
              <div>
                {schedule.time && <time>{schedule.time}</time>}
                <strong>{schedule.title}</strong>
              </div>
              <div
                className="diary-schedule-actions"
                ref={openScheduleMenuId === schedule.id ? scheduleMenuRef : undefined}
              >
                <button
                  type="button"
                  className={`diary-schedule-more-button ${openScheduleMenuId === schedule.id ? 'active' : ''}`}
                  aria-label="Schedule options"
                  aria-expanded={openScheduleMenuId === schedule.id}
                  onClick={(event) => {
                    event.stopPropagation()
                    setOpenScheduleMenuId((prev) => prev === schedule.id ? null : schedule.id)
                  }}
                >
                  ···
                </button>

                {openScheduleMenuId === schedule.id && (
                  <div className="diary-schedule-menu-popover" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => startEditSchedule(schedule)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="danger"
                      onClick={() => {
                        setOpenScheduleMenuId(null)
                        onDeleteSchedule(schedule.id)
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          )) : (
            <div className="diary-schedule-empty">
              <strong>No schedule</strong>
              <span>Click a day and add a schedule.</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className={`diary-side-diary-button ${selectedHasDiary ? 'has-diary' : ''}`}
          disabled={!selectedHasDiary}
          onClick={() => onOpenDiaryDate(selectedScheduleDate)}
        >
          {selectedHasDiary ? 'View Diary' : 'No Diary'}
        </button>
      </aside>

      {editingSchedule && (
        <div className="modal-overlay" onClick={cancelEditSchedule}>
          <div
            className="diary-schedule-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Edit schedule"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="diary-schedule-edit-modal-header">
              <h3>Edit Schedule</h3>
              <button type="button" aria-label="Close edit modal" onClick={cancelEditSchedule}>×</button>
            </div>

            <div className="diary-schedule-edit-modal-fields">
              <label>
                <span>Date</span>
                <button
                  type="button"
                  className="diary-schedule-edit-picker-button"
                  onClick={() => setIsEditDatePickerOpen(true)}
                >
                  {formatEditDateLabel(editingSchedule.date)}
                </button>
              </label>

              <label>
                <span>Time</span>
                <button
                  type="button"
                  className={`diary-schedule-edit-picker-button ${editingSchedule.time ? 'selected' : ''}`}
                  onClick={openEditTimePicker}
                >
                  {formatEditTimeLabel(editingSchedule.time)}
                </button>
              </label>

              <label>
                <span>Title</span>
                <input
                  value={editingSchedule.title}
                  placeholder="Schedule title"
                  onChange={(event) => setEditingSchedule((prev) => prev ? { ...prev, title: event.target.value } : prev)}
                  onKeyDown={(event) => { if (event.key === 'Enter') saveEditSchedule() }}
                />
              </label>
            </div>

            <div className="diary-schedule-edit-modal-actions">
              <button type="button" className="modal-cancel-button" onClick={cancelEditSchedule}>Cancel</button>
              <button type="button" className="modal-add-button" onClick={saveEditSchedule}>Save</button>
            </div>
          </div>
        </div>
      )}

      {isEditDatePickerOpen && editingSchedule && (
        <TodoDueDatePickerModal
          currentDate={currentDate}
          selectedDateKey={editingSchedule.date}
          clearLabel="Cancel"
          onClose={() => setIsEditDatePickerOpen(false)}
          onClear={() => setIsEditDatePickerOpen(false)}
          onSelectDate={(dateKey) => {
            setEditingSchedule((prev) => prev ? { ...prev, date: dateKey } : prev)
            setIsEditDatePickerOpen(false)
          }}
        />
      )}

      {isEditTimePickerOpen && editingSchedule && (
        <ScheduleTimePickerModal
          scheduleTimePickerHour={editTimePickerHour}
          scheduleTimePickerMinute={editTimePickerMinute}
          onSetScheduleTimePickerHour={setEditTimePickerHour}
          onSetScheduleTimePickerMinute={setEditTimePickerMinute}
          onClose={() => setIsEditTimePickerOpen(false)}
          onClear={() => {
            setEditingSchedule((prev) => prev ? { ...prev, time: '' } : prev)
            setIsEditTimePickerOpen(false)
          }}
          onConfirm={() => {
            setEditingSchedule((prev) => prev ? { ...prev, time: `${formatTwoDigit(editTimePickerHour)}:${formatTwoDigit(editTimePickerMinute)}` } : prev)
            setIsEditTimePickerOpen(false)
          }}
        />
      )}
    </section>
  )
}
