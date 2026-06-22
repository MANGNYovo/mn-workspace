import { useRef } from 'react'
import { monthNames } from '../constants'

type Props = {
  diaryPickerMonthIndex: number
  diaryPickerYear: number
  diaryPickerMinYear: number
  diaryPickerMaxYear: number
  diaryMonthWheelRef: React.RefObject<HTMLDivElement>
  diaryYearWheelRef: React.RefObject<HTMLDivElement>
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
  const diaryPickerYearOptions = Array.from(
    { length: diaryPickerMaxYear - diaryPickerMinYear + 1 },
    (_, i) => diaryPickerMinYear + i,
  )

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
            className="diary-wheel-select"
            onWheel={(event) => {
              event.preventDefault()
              const pickerElement = event.currentTarget.parentElement
              const columnWidth = pickerElement ? pickerElement.clientWidth / 2 : 0
              if (event.nativeEvent.offsetX < columnWidth) {
                diaryMonthWheelRef.current?.scrollBy({ top: event.deltaY, behavior: 'smooth' })
              } else {
                diaryYearWheelRef.current?.scrollBy({ top: event.deltaY, behavior: 'smooth' })
              }
            }}
            onClick={onConfirm}
          />
        </div>
      </div>
    </div>
  )
}
