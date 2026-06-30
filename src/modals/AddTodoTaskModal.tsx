import { useState } from 'react'
import type { TodoPriority, TodoTask } from '../types'
import { formatDiaryMonthTitle } from '../constants'
import { TodoDueDatePickerModal } from './TodoDueDatePickerModal'

type TodoTaskDraft = Omit<TodoTask, 'id' | 'createdAt' | 'updatedAt' | 'completed' | 'completedAt'>

type Props = {
  currentDate: Date
  initialTask?: TodoTask
  onClose: () => void
  onAddTask: (task: TodoTaskDraft) => void
  onUpdateTask?: (taskId: string, updates: Partial<Omit<TodoTask, 'id' | 'createdAt' | 'updatedAt'>>) => void
}

const formatDueDateLabel = (dateKey?: string) => {
  if (!dateKey) return 'Select due date'
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return `${formatDiaryMonthTitle(date)} ${date.getDate()}, ${date.getFullYear()}`
}

export function AddTodoTaskModal({ currentDate, initialTask, onClose, onAddTask, onUpdateTask }: Props) {
  const isEditMode = Boolean(initialTask)
  const [title, setTitle] = useState(initialTask?.title ?? '')
  const [description, setDescription] = useState(initialTask?.description ?? '')
  const [dueDate, setDueDate] = useState<string | undefined>(initialTask?.dueDate)
  const [priority, setPriority] = useState<TodoPriority>(initialTask?.priority ?? 'medium')
  const [reminderEnabled, setReminderEnabled] = useState(initialTask?.reminderEnabled ?? false)
  const [isDueDatePickerOpen, setIsDueDatePickerOpen] = useState(false)

  const canSubmit = title.trim().length > 0

  const submit = () => {
    if (!canSubmit) return

    if (initialTask && onUpdateTask) {
      onUpdateTask(initialTask.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate,
        priority,
        reminderEnabled,
      })
      return
    }

    onAddTask({
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate,
      priority,
      reminderEnabled,
    })
  }

  return (
    <>
      <div className="modal-overlay">
        <div className="todo-add-modal">
          <button className="diary-modal-close" onClick={onClose}>×</button>
          <h2>{isEditMode ? 'Edit Task' : 'Add Task'}</h2>

          <label className="todo-modal-field">
            <span>☷ Task Title</span>
            <input
              value={title}
              placeholder="Enter task title..."
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') submit() }}
            />
          </label>

          <label className="todo-modal-field">
            <span>▤ Description</span>
            <textarea
              value={description}
              placeholder="Add a description..."
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>

          <div className="todo-modal-field">
            <span>□ Due Date</span>
            <button type="button" className={`todo-due-date-button ${dueDate ? 'selected' : ''}`} onClick={() => setIsDueDatePickerOpen(true)}>
              {formatDueDateLabel(dueDate)}
              <span>□</span>
            </button>
          </div>

          <div className="todo-modal-field">
            <span>⚐ Priority</span>
            <div className="todo-priority-options">
              {(['high', 'medium', 'low'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`todo-priority-option ${item} ${priority === item ? 'active' : ''}`}
                  onClick={() => setPriority(item)}
                >
                  {item[0].toUpperCase() + item.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="todo-reminder-row" onClick={() => setReminderEnabled((prev) => !prev)}>
            <span>♢</span>
            <div>
              <strong>Reminder</strong>
              <small>Send a desktop notification on the due date</small>
            </div>
            <i className={reminderEnabled ? 'active' : ''} />
          </button>

          <div className="todo-modal-actions">
            <button type="button" className="todo-cancel-button" onClick={onClose}>Cancel</button>
            <button type="button" className="todo-submit-button" disabled={!canSubmit} onClick={submit}>
              {isEditMode ? 'Save Task' : 'Add Task'}
            </button>
          </div>
        </div>
      </div>

      {isDueDatePickerOpen && (
        <TodoDueDatePickerModal
          currentDate={currentDate}
          selectedDateKey={dueDate}
          onClose={() => setIsDueDatePickerOpen(false)}
          onClear={() => { setDueDate(undefined); setIsDueDatePickerOpen(false) }}
          onSelectDate={(dateKey) => { setDueDate(dateKey); setIsDueDatePickerOpen(false) }}
        />
      )}
    </>
  )
}
