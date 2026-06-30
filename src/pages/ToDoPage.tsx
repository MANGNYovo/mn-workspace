import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { CalendarSchedule, TodoFilter, TodoTask } from '../types'
import { formatDiaryMonthTitle, formatDateKey } from '../constants'
import gridIcon from '../assets/grid-gray.png'
import timeIcon from '../assets/time-gray.png'

type Props = {
  currentDate: Date
  tasks: TodoTask[]
  todaySchedules?: CalendarSchedule[]
  filter: TodoFilter
  onSetFilter: (filter: TodoFilter) => void
  onOpenAddTask: () => void
  onToggleTask: (taskId: string) => void
  onEditTask: (task: TodoTask) => void
  onDeleteTask: (taskId: string) => void
}

const filterItems: Array<{ id: TodoFilter; label: string; icon: string; iconType?: 'image' }> = [
  { id: 'all', label: 'All', icon: gridIcon, iconType: 'image' },
  { id: 'today', label: 'Today', icon: '☼' },
  { id: 'upcoming', label: 'Upcoming', icon: timeIcon, iconType: 'image' },
  { id: 'completed', label: 'Completed', icon: '○' },
]

const priorityLabel = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
} as const

const formatDueDate = (dateKey?: string) => {
  if (!dateKey) return 'No due date'
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return `Due ${formatDiaryMonthTitle(date).slice(0, 3)} ${date.getDate()}`
}

export function ToDoPage({
  currentDate,
  tasks,
  todaySchedules = [],
  filter,
  onSetFilter,
  onOpenAddTask,
  onToggleTask,
  onEditTask,
  onDeleteTask,
}: Props) {
  const todayKey = formatDateKey(currentDate)
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((task) => task.completed).length
  const remainingTasks = Math.max(0, totalTasks - completedTasks)
  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const safeTodaySchedules = Array.isArray(todaySchedules) ? todaySchedules : []
  const sortedTodaySchedules = [...safeTodaySchedules].sort((a, b) => {
    if (a.time && b.time) return a.time.localeCompare(b.time)
    if (a.time) return -1
    if (b.time) return 1
    return a.createdAt.localeCompare(b.createdAt)
  })

  const visibleTasks = tasks.filter((task) => {
    if (filter === 'completed') return task.completed
    if (filter === 'today') return task.dueDate === todayKey
    if (filter === 'upcoming') {
      if (!task.dueDate) return false
      const today = new Date(`${todayKey}T00:00:00`)
      const due = new Date(`${task.dueDate}T00:00:00`)
      const diff = Math.round((due.getTime() - today.getTime()) / 86400000)
      return diff >= 0 && diff <= 2
    }
    return true
  })

  const [openTaskMenuId, setOpenTaskMenuId] = useState<string | null>(null)
  const taskMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!openTaskMenuId) return

    const closeMenu = (event: PointerEvent) => {
      if (!taskMenuRef.current) return
      if (taskMenuRef.current.contains(event.target as Node)) return
      setOpenTaskMenuId(null)
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenTaskMenuId(null)
    }

    document.addEventListener('pointerdown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('pointerdown', closeMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [openTaskMenuId])

  return (
    <section className="todo-page">
      <div className="todo-card">
        <header className="todo-header">
          <div>
            <h1>To-Do List</h1>
            <p>Keep track of your daily tasks and reminders.</p>
          </div>
        </header>

        <div className="todo-content-grid">
          <div className="todo-filter-action-row">
            <div className="todo-filter-tabs" role="tablist" aria-label="To-do filters">
              {filterItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`todo-filter-tab ${filter === item.id ? 'active' : ''}`}
                  onClick={() => onSetFilter(item.id)}
                >
                  {item.iconType === 'image' ? (
                    <img src={item.icon} alt="" className="todo-filter-icon-image" />
                  ) : (
                    <span>{item.icon}</span>
                  )}
                  {item.label}
                </button>
              ))}
            </div>

            <button type="button" className="todo-add-task-button" onClick={onOpenAddTask}>
              <span>＋</span>
              Add Task
            </button>
          </div>

          <div className="todo-main-panel">
            <div className="todo-task-list">
              {visibleTasks.length === 0 ? (
                <div className="todo-empty-state">
                  <strong>No tasks</strong>
                  <span>Add a task or change the filter.</span>
                </div>
              ) : visibleTasks.map((task) => (
                <article key={task.id} className={`todo-task-item ${task.completed ? 'completed' : ''}`}>
                  <button
                    type="button"
                    className="todo-task-check"
                    aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                    onClick={() => onToggleTask(task.id)}
                  />

                  <div className="todo-task-text">
                    <strong>{task.title}</strong>
                    {task.description && <span>{task.description}</span>}
                  </div>

                  <div className="todo-task-meta">
                    <span className="todo-task-due">□ {formatDueDate(task.dueDate)}</span>
                    <span className={`todo-priority-pill ${task.priority}`}>{priorityLabel[task.priority]}</span>
                    <div
                      className="todo-task-action-menu"
                      ref={openTaskMenuId === task.id ? taskMenuRef : undefined}
                    >
                      <button
                        type="button"
                        className={`todo-task-more ${openTaskMenuId === task.id ? 'active' : ''}`}
                        aria-label="Task options"
                        aria-expanded={openTaskMenuId === task.id}
                        onClick={(event) => {
                          event.stopPropagation()
                          setOpenTaskMenuId((prev) => prev === task.id ? null : task.id)
                        }}
                      >
                        ···
                      </button>

                      {openTaskMenuId === task.id && (
                        <div className="todo-task-menu-popover" role="menu">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenTaskMenuId(null)
                              onEditTask(task)
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="danger"
                            onClick={() => {
                              setOpenTaskMenuId(null)
                              onDeleteTask(task.id)
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="todo-completion-line">{completedTasks} of {totalTasks} tasks completed</div>
          </div>

          <aside className="todo-summary-panel">
            <div className="todo-summary-card today">
              <h2>Today</h2>
              <div className="todo-progress-ring" style={{ '--todo-progress': `${completionPercent}%` } as CSSProperties}>
                <strong>
                  <em>{completedTasks}</em>
                  <small>/{totalTasks}</small>
                </strong>
                <span>Completed</span>
              </div>

              <div className="todo-summary-stats">
                <div><span>○ Total Tasks</span><strong>{totalTasks}</strong></div>
                <div><span>○ Completed</span><strong>{completedTasks}</strong></div>
                <div><span>◷ Remaining</span><strong>{remainingTasks}</strong></div>
              </div>

              <div className="todo-summary-note-card todo-today-schedule-card">
                <strong>Today Schedule</strong>
                {sortedTodaySchedules.length > 0 ? (
                  <div className="todo-today-schedule-list">
                    {sortedTodaySchedules.map((schedule) => (
                      <div key={schedule.id} className="todo-today-schedule-item">
                        {schedule.time && <time className="todo-today-schedule-time">{schedule.time}</time>}
                        <span className="todo-today-schedule-title">{schedule.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No schedule</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}
