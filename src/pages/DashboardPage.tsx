import { type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ProgramItem, LaunchStatus, AccentColor } from '../types'
import { rocketMap, iconMap } from '../constants'
import { ProgramIcon } from '../components'
import rocketActive from '../assets/rocket-active.png'

type Props = {
  currentTimeText: string
  currentMeridiemText: string
  currentDateText: string
  currentWeekdayText: string
  selectedPreset: number
  isLaunching: boolean
  enabledProgramCount: number
  enabledPrograms: ProgramItem[]
  launchStatuses: Record<string, LaunchStatus>
  accentColor: AccentColor
  onSetSelectedPreset: (preset: number) => void
  onLaunchPrograms: () => void
  onLaunchSingleProgram: (program: ProgramItem) => void
  getThemeIcon: (name: keyof typeof iconMap, isActive?: boolean) => string
}

export function DashboardPage({
  currentTimeText, currentMeridiemText, currentDateText, currentWeekdayText,
  selectedPreset, isLaunching, enabledProgramCount, enabledPrograms, launchStatuses, accentColor,
  onSetSelectedPreset, onLaunchPrograms, onLaunchSingleProgram, getThemeIcon,
}: Props) {
  return (
    <>
      <section className="top-card">
        <div className="dashboard-time">
          <p className="dashboard-section-title">
            <img src={getThemeIcon('time')} alt="" className="dashboard-title-icon" />
            Current Time
          </p>
          <h1>{currentTimeText}<em>{currentMeridiemText}</em></h1>
          <span>{currentDateText}<i></i>{currentWeekdayText}</span>
        </div>

        <div className="dashboard-preset">
          <p className="dashboard-preset-title dashboard-section-title">
            <img src={getThemeIcon('preset')} alt="" className="dashboard-title-icon" />
            Current Preset
          </p>
          <div className="dashboard-preset-track" style={{ '--selected-preset-index': selectedPreset - 1 } as CSSProperties}>
            <span className="dashboard-preset-active-dot"></span>
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                className={`dashboard-preset-dot ${selectedPreset === n ? 'active' : ''}`}
                onClick={() => onSetSelectedPreset(n)}
              >
                <span></span>
                <b>{String(n).padStart(2, '0')}</b>
              </button>
            ))}
          </div>
        </div>

        <button
          className={`launch-button ${isLaunching ? 'launching' : ''}`}
          onClick={onLaunchPrograms}
          disabled={enabledProgramCount === 0}
        >
          <img src={isLaunching ? rocketActive : rocketMap[accentColor]} alt="" className="launch-icon" />
        </button>
      </section>

      <section className="timeline-card">
        <AnimatePresence mode="wait">
          {enabledPrograms.map((program, index) => {
            const status = launchStatuses[program.id] ?? 'waiting'
            return (
              <motion.div
                key={`${selectedPreset}-${program.id}`}
                className="timeline-motion-row"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.24, delay: index * 0.035, ease: [0.2, 0.9, 0.3, 1] }}
              >
                <div className={`program ${
                  status === 'completed' ? 'done' :
                  status === 'launching' ? 'running' :
                  status === 'failed' ? 'failed' :
                  status === 'cancelled' ? 'cancelled' : 'waiting'
                }`}>
                  <button
                    className="program-status-button"
                    onClick={() => onLaunchSingleProgram(program)}
                    disabled={status !== 'waiting' || isLaunching}
                  />
                  <ProgramIcon program={program} />
                  <div>
                    <h3>{program.name}</h3>
                    <p>
                      {status === 'completed' ? 'Completed' :
                       status === 'launching' ? 'Launching...' :
                       status === 'failed' ? 'failed' :
                       status === 'cancelled' ? 'Cancelled' : 'waiting'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </section>
    </>
  )
}
