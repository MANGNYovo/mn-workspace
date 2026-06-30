import { useEffect, useRef, type RefObject } from 'react'
import { monthNames } from '../constants'

const DIARY_WHEEL_ITEM_HEIGHT = 60

type Props = {
  diaryPickerMonthIndex: number
  diaryPickerYear: number
  diaryPickerMinYear: number
  diaryPickerMaxYear: number
  diaryMonthWheelRef: RefObject<HTMLDivElement>
  diaryYearWheelRef: RefObject<HTMLDivElement>
  onClose: () => void
  onMonthScroll: () => void
  onYearScroll: () => void
  onConfirm: () => void
}

export function DiaryPickerModal({
  diaryPickerMonthIndex, diaryPickerYear, diaryPickerMinYear, diaryPickerMaxYear,
  diaryMonthWheelRef, diaryYearWheelRef,
  onClose, onMonthScroll, onYearScroll, onConfirm,
}: Props) {
  const diaryWheelSelectRef = useRef<HTMLButtonElement | null>(null)
  const diaryPickerYearOptions = Array.from(
    { length: diaryPickerMaxYear - diaryPickerMinYear + 1 },
    (_, i) => diaryPickerMinYear + i,
  )

  useEffect(() => {
    const wheelSelect = diaryWheelSelectRef.current
    if (!wheelSelect) return

    const handleWheel = (event: WheelEvent) => {
      const amount = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
      if (Math.abs(amount) < 4) return

      event.preventDefault()
      const direction = amount > 0 ? 1 : -1
      const pickerElement = wheelSelect.parentElement
      const columnWidth = pickerElement ? pickerElement.clientWidth / 2 : 0
      const targetColumn = event.offsetX < columnWidth
        ? diaryMonthWheelRef.current
        : diaryYearWheelRef.current

      targetColumn?.scrollBy({
        top: direction * DIARY_WHEEL_ITEM_HEIGHT,
        behavior: 'auto',
      })
    }

    wheelSelect.addEventListener('wheel', handleWheel, { passive: false })
    return () => wheelSelect.removeEventListener('wheel', handleWheel)
  }, [diaryMonthWheelRef, diaryYearWheelRef])

  return (
    <div className="modal-overlay">
      <div className="diary-picker-modal">
        <button className="diary-modal-close" onClick={onClose}>×</button>

        <div className="diary-wheel-picker">
          <div ref={diaryMonthWheelRef} className="diary-wheel-column" onScroll={onMonthScroll}>
            {monthNames.map((monthName, monthIndex) => {
              const distance = Math.min(Math.abs(monthIndex - diaryPickerMonthIndex), 3)
              return (
                <div
                  key={monthName}
                  className={`diary-wheel-item diary-wheel-distance-${distance} ${monthIndex === diaryPickerMonthIndex ? 'active' : ''}`}
                >
                  {monthName}
                </div>
              )
            })}
          </div>

          <div ref={diaryYearWheelRef} className="diary-wheel-column" onScroll={onYearScroll}>
            {diaryPickerYearOptions.map((year) => {
              const distance = Math.min(Math.abs(year - diaryPickerYear), 3)
              return (
                <div
                  key={year}
                  className={`diary-wheel-item diary-wheel-distance-${distance} ${year === diaryPickerYear ? 'active' : ''}`}
                >
                  {year}
                </div>
              )
            })}
          </div>

          <button
            ref={diaryWheelSelectRef}
            className="diary-wheel-select"
            onClick={onConfirm}
          />
        </div>
      </div>
    </div>
  )
}
