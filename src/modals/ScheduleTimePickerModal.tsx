import { useEffect, useRef, type UIEvent } from 'react'

const formatTwoDigit = (value: number) => String(value).padStart(2, '0')
const TIME_WHEEL_ITEM_HEIGHT = 56

type Props = {
  scheduleTimePickerHour: number
  scheduleTimePickerMinute: number
  onSetScheduleTimePickerHour: (value: number) => void
  onSetScheduleTimePickerMinute: (value: number) => void
  onClose: () => void
  onClear: () => void
  onConfirm: () => void
}

export function ScheduleTimePickerModal({
  scheduleTimePickerHour,
  scheduleTimePickerMinute,
  onSetScheduleTimePickerHour,
  onSetScheduleTimePickerMinute,
  onClose,
  onClear,
  onConfirm,
}: Props) {
  const hourListRef = useRef<HTMLDivElement | null>(null)
  const minuteListRef = useRef<HTMLDivElement | null>(null)
  const selectedHourRef = useRef(scheduleTimePickerHour)
  const selectedMinuteRef = useRef(scheduleTimePickerMinute)
  const isSyncingHourScrollRef = useRef(false)
  const isSyncingMinuteScrollRef = useRef(false)

  const hourOptions = Array.from({ length: 24 }, (_, index) => index)
  const minuteOptions = Array.from({ length: 60 }, (_, index) => index)

  const scrollToOption = (element: HTMLDivElement | null, value: number) => {
    if (!element) return
    element.scrollTop = value * TIME_WHEEL_ITEM_HEIGHT
  }

  useEffect(() => {
    selectedHourRef.current = scheduleTimePickerHour
  }, [scheduleTimePickerHour])

  useEffect(() => {
    selectedMinuteRef.current = scheduleTimePickerMinute
  }, [scheduleTimePickerMinute])

  useEffect(() => {
    scrollToOption(hourListRef.current, scheduleTimePickerHour)
    scrollToOption(minuteListRef.current, scheduleTimePickerMinute)
    // 처음 열 때만 현재 선택값을 중앙 선택 바에 맞춘다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleHourScroll = (event: UIEvent<HTMLDivElement>) => {
    if (isSyncingHourScrollRef.current) return

    const nextHour = Math.max(
      0,
      Math.min(23, Math.round(event.currentTarget.scrollTop / TIME_WHEEL_ITEM_HEIGHT)),
    )

    if (nextHour !== selectedHourRef.current) {
      selectedHourRef.current = nextHour
      onSetScheduleTimePickerHour(nextHour)
    }
  }

  const handleMinuteScroll = (event: UIEvent<HTMLDivElement>) => {
    if (isSyncingMinuteScrollRef.current) return

    const nextMinute = Math.max(
      0,
      Math.min(59, Math.round(event.currentTarget.scrollTop / TIME_WHEEL_ITEM_HEIGHT)),
    )

    if (nextMinute !== selectedMinuteRef.current) {
      selectedMinuteRef.current = nextMinute
      onSetScheduleTimePickerMinute(nextMinute)
    }
  }

  const selectHour = (hour: number) => {
    selectedHourRef.current = hour
    isSyncingHourScrollRef.current = true
    scrollToOption(hourListRef.current, hour)
    onSetScheduleTimePickerHour(hour)
    window.requestAnimationFrame(() => {
      isSyncingHourScrollRef.current = false
    })
  }

  const selectMinute = (minute: number) => {
    selectedMinuteRef.current = minute
    isSyncingMinuteScrollRef.current = true
    scrollToOption(minuteListRef.current, minute)
    onSetScheduleTimePickerMinute(minute)
    window.requestAnimationFrame(() => {
      isSyncingMinuteScrollRef.current = false
    })
  }

  useEffect(() => {
    const getWheelDirection = (event: WheelEvent) => {
      const amount = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
      if (Math.abs(amount) < 4) return 0
      return amount > 0 ? 1 : -1
    }

    const handleHourWheel = (event: WheelEvent) => {
      const direction = getWheelDirection(event)
      if (!direction) return
      event.preventDefault()
      selectHour(Math.max(0, Math.min(23, selectedHourRef.current + direction)))
    }

    const handleMinuteWheel = (event: WheelEvent) => {
      const direction = getWheelDirection(event)
      if (!direction) return
      event.preventDefault()
      selectMinute(Math.max(0, Math.min(59, selectedMinuteRef.current + direction)))
    }

    const hourList = hourListRef.current
    const minuteList = minuteListRef.current

    hourList?.addEventListener('wheel', handleHourWheel, { passive: false })
    minuteList?.addEventListener('wheel', handleMinuteWheel, { passive: false })

    return () => {
      hourList?.removeEventListener('wheel', handleHourWheel)
      minuteList?.removeEventListener('wheel', handleMinuteWheel)
    }
  }, [])

  return (
    <div className="modal-overlay">
      <div className="schedule-time-picker-modal">
        <button className="diary-modal-close" onClick={onClose}>×</button>

        <div className="schedule-time-picker-header">
          <span>Schedule Time</span>
          <strong>{formatTwoDigit(scheduleTimePickerHour)}:{formatTwoDigit(scheduleTimePickerMinute)}</strong>
        </div>

        <div className="schedule-time-wheel-picker">
          <div className="schedule-time-wheel-column" aria-label="Hour">
            <span className="schedule-time-column-label">Hour</span>
            <div
              ref={hourListRef}
              className="schedule-time-wheel-list"
              onScroll={handleHourScroll}
            >
              {hourOptions.map((hour) => (
                <button
                  key={hour}
                  type="button"
                  className={`schedule-time-wheel-item ${hour === scheduleTimePickerHour ? 'active' : ''}`}
                  onClick={() => selectHour(hour)}
                >
                  {formatTwoDigit(hour)}
                </button>
              ))}
            </div>
          </div>

          <div className="schedule-time-wheel-column" aria-label="Minute">
            <span className="schedule-time-column-label">Minute</span>
            <div
              ref={minuteListRef}
              className="schedule-time-wheel-list"
              onScroll={handleMinuteScroll}
            >
              {minuteOptions.map((minute) => (
                <button
                  key={minute}
                  type="button"
                  className={`schedule-time-wheel-item ${minute === scheduleTimePickerMinute ? 'active' : ''}`}
                  onClick={() => selectMinute(minute)}
                >
                  {formatTwoDigit(minute)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="schedule-time-picker-actions">
          <button type="button" className="schedule-time-clear-button" onClick={onClear}>
            No Time
          </button>
          <button type="button" className="schedule-time-confirm-button" onClick={onConfirm}>
            Set Time
          </button>
        </div>
      </div>
    </div>
  )
}
