import { AnimatePresence, motion } from 'framer-motion'
import { type CSSProperties, useEffect, useRef, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import logoPurple from './assets/logo-purple.png'
import logoBlue from './assets/logo-blue.png'
import logoGreen from './assets/logo-green.png'
import logoOrange from './assets/logo-orange.png'
import logoRed from './assets/logo-red.png'
import logoGray from './assets/logo-gray.png'

import rocketPurple from './assets/rocket-purple.png'
import rocketBlue from './assets/rocket-blue.png'
import rocketGreen from './assets/rocket-green.png'
import rocketOrange from './assets/rocket-orange.png'
import rocketRed from './assets/rocket-red.png'
import rocketGray from './assets/rocket-gray.png'
import rocketActive from './assets/rocket-active.png'

import dashboardPurple from './assets/dashboard-purple.png'
import dashboardBlue from './assets/dashboard-blue.png'
import dashboardGreen from './assets/dashboard-green.png'
import dashboardOrange from './assets/dashboard-orange.png'
import dashboardRed from './assets/dashboard-red.png'
import dashboardGray from './assets/dashboard-gray.png'
import dashboardWhite from './assets/dashboard-white.png'

import programsPurple from './assets/programs-purple.png'
import programsBlue from './assets/programs-blue.png'
import programsGreen from './assets/programs-green.png'
import programsOrange from './assets/programs-orange.png'
import programsRed from './assets/programs-red.png'
import programsGray from './assets/programs-gray.png'
import programsWhite from './assets/programs-white.png'

import settingsPurple from './assets/settings-purple.png'
import settingsBlue from './assets/settings-blue.png'
import settingsGreen from './assets/settings-green.png'
import settingsOrange from './assets/settings-orange.png'
import settingsRed from './assets/settings-red.png'
import settingsGray from './assets/settings-gray.png'
import settingsWhite from './assets/settings-white.png'

import timePurple from './assets/time-purple.png'
import timeBlue from './assets/time-blue.png'
import timeGreen from './assets/time-green.png'
import timeOrange from './assets/time-orange.png'
import timeRed from './assets/time-red.png'
import timeGray from './assets/time-gray.png'
import timeWhite from './assets/time-white.png'

import presetPurple from './assets/preset-purple.png'
import presetBlue from './assets/preset-blue.png'
import presetGreen from './assets/preset-green.png'
import presetOrange from './assets/preset-orange.png'
import presetRed from './assets/preset-red.png'
import presetGray from './assets/preset-gray.png'
import presetWhite from './assets/preset-white.png'

import speakerPurple from './assets/speaker-purple.png'
import speakerBlue from './assets/speaker-blue.png'
import speakerGreen from './assets/speaker-green.png'
import speakerOrange from './assets/speaker-orange.png'
import speakerRed from './assets/speaker-red.png'
import speakerGray from './assets/speaker-gray.png'
import speakerWhite from './assets/speaker-white.png'

import headphonePurple from './assets/headphone-purple.png'
import headphoneBlue from './assets/headphone-blue.png'
import headphoneGreen from './assets/headphone-green.png'
import headphoneOrange from './assets/headphone-orange.png'
import headphoneRed from './assets/headphone-red.png'
import headphoneGray from './assets/headphone-gray.png'
import headphoneWhite from './assets/headphone-white.png'

import hmonitorPurple from './assets/hmonitor-purple.png'
import hmonitorBlue from './assets/hmonitor-blue.png'
import hmonitorGreen from './assets/hmonitor-green.png'
import hmonitorOrange from './assets/hmonitor-orange.png'
import hmonitorRed from './assets/hmonitor-red.png'
import hmonitorGray from './assets/hmonitor-gray.png'
import hmonitorWhite from './assets/hmonitor-white.png'

import vmonitorPurple from './assets/vmonitor-purple.png'
import vmonitorBlue from './assets/vmonitor-blue.png'
import vmonitorGreen from './assets/vmonitor-green.png'
import vmonitorOrange from './assets/vmonitor-orange.png'
import vmonitorRed from './assets/vmonitor-red.png'
import vmonitorGray from './assets/vmonitor-gray.png'
import vmonitorWhite from './assets/vmonitor-white.png'

import checkPurple from './assets/check-purple.png'
import checkBlue from './assets/check-blue.png'
import checkGreen from './assets/check-green.png'
import checkOrange from './assets/check-orange.png'
import checkRed from './assets/check-red.png'
import checkGray from './assets/check-gray.png'
import checkWhite from './assets/check-white.png'

import './App.css'

type Page = 'home' | 'dashboard' | 'programs' | 'settings'
type ProgramType = 'Program' | 'Folder' | 'URL'
type LaunchDelay = '1 second' | '2 seconds' | '3 seconds' | '5 seconds'
type LaunchBehavior = 'Launch in order' | 'Launch all at once'
type Theme = 'Light' | 'Dark' | 'System'
type ResolvedTheme = 'light' | 'dark'
type AccentColor = 'purple' | 'blue' | 'green' | 'orange' | 'red' | 'gray'
type LaunchStatus = 'waiting' | 'launching' | 'completed' | 'failed' | 'cancelled'
type AudioDevice = 'speaker' | 'headphone'
type MonitorOrientation = 'horizontal' | 'vertical'

type ProgramItem = {
  id: string
  name: string
  path: string
  type: ProgramType
  iconClass: string
  icon: string
  iconImage?: string | null
  enabled: boolean
  presets?: number[]
}

type AppSettings = {
  startWithWindows: boolean
  minimizeToTray: boolean
  checkForUpdates: boolean
  launchDelay: LaunchDelay
  launchBehavior: LaunchBehavior
  stopLaunchingOnError: boolean
  theme: Theme
  accentColor: AccentColor
}

const initialPrograms: ProgramItem[] = [
  {
    id: 'photoshop',
    name: 'Adobe Photoshop 2024',
    path: 'C:\\Program Files\\Adobe\\Adobe Photoshop 2024\\Photoshop.exe',
    type: 'Program',
    iconClass: 'ps',
    icon: 'Ps',
    iconImage: null,
    enabled: true,
  },
  {
    id: 'chrome',
    name: 'Google Chrome',
    path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    type: 'Program',
    iconClass: 'chrome',
    icon: '🌐',
    iconImage: null,
    enabled: true,
  },
  {
    id: 'work-folder',
    name: 'Work Folder',
    path: 'D:\\MN Workspace',
    type: 'Folder',
    iconClass: 'folder',
    icon: '📁',
    iconImage: null,
    enabled: true,
  },
  {
    id: 'youtube-music',
    name: 'YouTube Music',
    path: 'https://music.youtube.com',
    type: 'URL',
    iconClass: 'music',
    icon: '▶',
    iconImage: null,
    enabled: true,
  },
]

const defaultSettings: AppSettings = {
  startWithWindows: false,
  minimizeToTray: false,
  checkForUpdates: true,
  launchDelay: '1 second',
  launchBehavior: 'Launch in order',
  stopLaunchingOnError: false,
  theme: 'Light',
  accentColor: 'purple',
}

const accentColorMap: Record<AccentColor, string> = {
  purple: '#705bff',
  blue: '#0b8ee8',
  green: '#18c77a',
  orange: '#ff8a1f',
  red: '#ff5151',
  gray: '#9aa0b8',
}

const accentRingMap: Record<AccentColor, string> = {
  purple: 'rgba(112, 91, 255, 0.28)',
  blue: 'rgba(11, 142, 232, 0.28)',
  green: 'rgba(24, 199, 122, 0.28)',
  orange: 'rgba(255, 138, 31, 0.28)',
  red: 'rgba(255, 81, 81, 0.28)',
  gray: 'rgba(154, 160, 184, 0.32)',
}

const logoMap: Record<AccentColor, string> = {
  purple: logoPurple,
  blue: logoBlue,
  green: logoGreen,
  orange: logoOrange,
  red: logoRed,
  gray: logoGray,
}

const rocketMap: Record<AccentColor, string> = {
  purple: rocketPurple,
  blue: rocketBlue,
  green: rocketGreen,
  orange: rocketOrange,
  red: rocketRed,
  gray: rocketGray,
}

const iconMap = {
  dashboard: {
    purple: dashboardPurple,
    blue: dashboardBlue,
    green: dashboardGreen,
    orange: dashboardOrange,
    red: dashboardRed,
    gray: dashboardGray,
    white: dashboardWhite,
  },
  programs: {
    purple: programsPurple,
    blue: programsBlue,
    green: programsGreen,
    orange: programsOrange,
    red: programsRed,
    gray: programsGray,
    white: programsWhite,
  },
  settings: {
    purple: settingsPurple,
    blue: settingsBlue,
    green: settingsGreen,
    orange: settingsOrange,
    red: settingsRed,
    gray: settingsGray,
    white: settingsWhite,
  },
  time: {
    purple: timePurple,
    blue: timeBlue,
    green: timeGreen,
    orange: timeOrange,
    red: timeRed,
    gray: timeGray,
    white: timeWhite,
  },
  preset: {
    purple: presetPurple,
    blue: presetBlue,
    green: presetGreen,
    orange: presetOrange,
    red: presetRed,
    gray: presetGray,
    white: presetWhite,
  },
  speaker: {
    purple: speakerPurple,
    blue: speakerBlue,
    green: speakerGreen,
    orange: speakerOrange,
    red: speakerRed,
    gray: speakerGray,
    white: speakerWhite,
  },

  headphone: {
    purple: headphonePurple,
    blue: headphoneBlue,
    green: headphoneGreen,
    orange: headphoneOrange,
    red: headphoneRed,
    gray: headphoneGray,
    white: headphoneWhite,
  },

  hmonitor: {
    purple: hmonitorPurple,
    blue: hmonitorBlue,
    green: hmonitorGreen,
    orange: hmonitorOrange,
    red: hmonitorRed,
    gray: hmonitorGray,
    white: hmonitorWhite,
  },

  vmonitor: {
    purple: vmonitorPurple,
    blue: vmonitorBlue,
    green: vmonitorGreen,
    orange: vmonitorOrange,
    red: vmonitorRed,
    gray: vmonitorGray,
    white: vmonitorWhite,
  },

  check: {
    purple: checkPurple,
    blue: checkBlue,
    green: checkGreen,
    orange: checkOrange,
    red: checkRed,
    gray: checkGray,
    white: checkWhite,
  },

} as const



function getProgramIcon(type: ProgramType) {
  if (type === 'Folder') {
    return { icon: '📁', iconClass: 'folder' }
  }

  if (type === 'URL') {
    return { icon: '🌐', iconClass: 'chrome' }
  }

  return { icon: 'App', iconClass: 'ps' }
}

function getNameFromPath(filePath: string) {
  const fileName = filePath.split('\\').pop() ?? filePath
  return fileName.replace(/\.[^/.]+$/, '')
}

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random()}`
}

function getProgramPresets(program: ProgramItem) {
  if (Array.isArray(program.presets) && program.presets.length > 0) {
    return program.presets
  }

  return [1]
}

function isProgramList(value: unknown): value is ProgramItem[] {
  if (!Array.isArray(value)) return false

  return value.every((item) => {
    if (!item || typeof item !== 'object') return false

    const program = item as ProgramItem

    return (
      typeof program.id === 'string' &&
      typeof program.name === 'string' &&
      typeof program.path === 'string' &&
      typeof program.type === 'string' &&
      typeof program.iconClass === 'string' &&
      typeof program.icon === 'string' &&
      typeof program.enabled === 'boolean'
    )
  })
}

function isSettings(value: unknown): value is AppSettings {
  if (!value || typeof value !== 'object') return false

  const settings = value as AppSettings

  return (
    typeof settings.startWithWindows === 'boolean' &&
    typeof settings.minimizeToTray === 'boolean' &&
    typeof settings.checkForUpdates === 'boolean' &&
    typeof settings.launchDelay === 'string' &&
    typeof settings.launchBehavior === 'string' &&
    typeof settings.stopLaunchingOnError === 'boolean' &&
    typeof settings.theme === 'string' &&
    typeof settings.accentColor === 'string'
  )
}

function ProgramIcon({ program }: { program: ProgramItem }) {
  if (program.iconImage) {
    return (
      <img
        src={program.iconImage}
        alt=""
        className="program-real-icon"
      />
    )
  }

  return <div className={`icon ${program.iconClass}`}>{program.icon}</div>
}

type SortableProgramRowProps = {
  program: ProgramItem
  isMenuOpen: boolean
  onToggle: (id: string) => void
  onMenuToggle: (id: string) => void
  onDelete: (id: string) => void
}

function SortableProgramRow({
  program,
  isMenuOpen,
  onToggle,
  onMenuToggle,
  onDelete,
}: SortableProgramRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: program.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      className={`program-list-row ${isDragging ? 'dragging' : ''}`}
      style={style}
    >
      <button className="drag-handle" {...attributes} {...listeners}>
        ⠿
      </button>

      <ProgramIcon program={program} />

      <div className="program-info">
        <h3>{program.name}</h3>
        <p>{program.path}</p>
      </div>

      <button
        className={`toggle ${program.enabled ? 'on' : ''}`}
        onClick={() => onToggle(program.id)}
      >
        <span></span>
      </button>

      <div className="row-menu-wrap">
        <button className="more-button" onClick={() => onMenuToggle(program.id)}>
          •••
        </button>

        {isMenuOpen && (
          <div className="row-menu">
            <button onClick={() => onDelete(program.id)}>Delete</button>
          </div>
        )}
      </div>
    </div>
  )
}

function App() {
  const [activePage, setActivePage] = useState<Page>('home')
  const [selectedPreset, setSelectedPreset] = useState(1)
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<AudioDevice>('speaker')
  const [selectedMonitorOrientation, setSelectedMonitorOrientation] =
    useState<MonitorOrientation>('horizontal')
  const [programs, setPrograms] = useState<ProgramItem[]>(initialPrograms)
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [launchStatuses, setLaunchStatuses] = useState<Record<string, LaunchStatus>>({})
  const [isLaunching, setIsLaunching] = useState(false)
  const cancelLaunchRef = useRef(false)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>('light')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appVersion, setAppVersion] = useState('')

  const [isProgramsLoaded, setIsProgramsLoaded] = useState(false)
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false)

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const [newProgramName, setNewProgramName] = useState('')
  const [newProgramType, setNewProgramType] = useState<ProgramType>('Program')
  const [newProgramPath, setNewProgramPath] = useState('')
  const [newProgramEnabled, setNewProgramEnabled] = useState(true)
  const [newProgramIconImage, setNewProgramIconImage] = useState<string | null>(null)

  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false)
  const [updateModalType, setUpdateModalType] = useState<'available' | 'downloading' | 'ready' | 'latest' | 'error' | null>(null)
  const [updateProgress, setUpdateProgress] = useState(0)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  )

  const presetPrograms = programs.filter((program) =>
    getProgramPresets(program).includes(selectedPreset),
  )
  const enabledPrograms = presetPrograms.filter((program) => program.enabled)
  const enabledProgramCount = enabledPrograms.length

  const currentTimeParts = currentDate
    .toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
    .split(' ')

  const [hours, minutes, seconds] = currentTimeParts[0].split(':')

  const currentTimeText =
    `${hours} : ${minutes} : ${seconds}`
  const currentMeridiemText = currentTimeParts[1]

  const currentDateText = currentDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const currentWeekdayText = currentDate.toLocaleDateString('en-US', {
    weekday: 'short',
  })

  const activeTheme: ResolvedTheme =
    settings.theme === 'System'
      ? systemTheme
      : settings.theme.toLowerCase() as ResolvedTheme

  const appStyle = {
    '--accent-color': accentColorMap[settings.accentColor],
    '--accent-ring': accentRingMap[settings.accentColor],
  } as CSSProperties

  const getThemeIcon = (
    iconName: keyof typeof iconMap,
    isActive = true,
  ) => {
    if (activeTheme === 'dark') {
      return iconMap[iconName].white
    }

    return isActive
      ? iconMap[iconName][settings.accentColor]
      : iconMap[iconName].gray
  }

  const updateSettings = (partialSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...partialSettings,
    }))
  }

  const resetAddProgramForm = () => {
    setNewProgramName('')
    setNewProgramType('Program')
    setNewProgramPath('')
    setNewProgramEnabled(true)
    setNewProgramIconImage(null)
  }

  const closeAddModal = () => {
    setIsAddModalOpen(false)
    resetAddProgramForm()
  }

  const handleBrowse = async () => {
    try {
      if (newProgramType === 'URL') {
        return
      }

      const selectedPath =
        newProgramType === 'Folder'
          ? await window.mnAPI.selectFolder()
          : await window.mnAPI.selectProgram()

      if (!selectedPath) {
        return
      }

      setNewProgramPath(selectedPath)

      if (!newProgramName.trim()) {
        setNewProgramName(getNameFromPath(selectedPath))
      }

      if (newProgramType === 'Program') {
        const iconImage = await window.mnAPI.getFileIcon(selectedPath)
        setNewProgramIconImage(iconImage)
      } else {
        setNewProgramIconImage(null)
      }
    } catch (error) {
      console.error('Browse failed:', error)
    }
  }

  const handleAddProgram = () => {
    if (!newProgramName.trim() || !newProgramPath.trim()) {
      return
    }

    const iconData = getProgramIcon(newProgramType)

    const newProgram: ProgramItem = {
      id: createId(),
      name: newProgramName.trim(),
      path: newProgramPath.trim(),
      type: newProgramType,
      iconClass: iconData.iconClass,
      icon: iconData.icon,
      iconImage: newProgramIconImage,
      enabled: newProgramEnabled,
      presets: [selectedPreset],
    }

    setPrograms((prev) => [...prev, newProgram])
    closeAddModal()
  }

  const handleToggleProgram = (id: string) => {
    setPrograms((prev) =>
      prev.map((program) =>
        program.id === id
          ? { ...program, enabled: !program.enabled }
          : program,
      ),
    )
  }

  const handleDeleteProgram = (id: string) => {
    setPrograms((prev) => prev.filter((program) => program.id !== id))
    setOpenMenuId(null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    setPrograms((prev) => {
      const oldIndex = prev.findIndex((program) => program.id === active.id)
      const newIndex = prev.findIndex((program) => program.id === over.id)

      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  const getLaunchDelayMs = () => {
    if (settings.launchDelay === '1 second') return 1000
    if (settings.launchDelay === '2 seconds') return 2000
    if (settings.launchDelay === '3 seconds') return 3000
    if (settings.launchDelay === '5 seconds') return 5000

    return 1000
  }

  const wait = (ms: number) =>
    new Promise((resolve) => {
      window.setTimeout(resolve, ms)
    })

  const resetStatusesAfterDelay = async () => {
    await wait(2000)

    setLaunchStatuses(
      enabledPrograms.reduce<Record<string, LaunchStatus>>(
        (result, program) => ({
          ...result,
          [program.id]: 'waiting',
        }),
        {},
      ),
    )
  }

  const handleLaunchSingleProgram = async (program: ProgramItem) => {
    const currentStatus = launchStatuses[program.id] ?? 'waiting'

    if (isLaunching || currentStatus !== 'waiting') {
      return
    }

    setLaunchStatuses((prev) => ({
      ...prev,
      [program.id]: 'launching',
    }))

    const result = await window.mnAPI.launchProgram({
      path: program.path,
      type: program.type,
    })

    await wait(1500)

    setLaunchStatuses((prev) => ({
      ...prev,
      [program.id]: result.success ? 'completed' : 'failed',
    }))

    await wait(2000)

    setLaunchStatuses((prev) => ({
      ...prev,
      [program.id]: 'waiting',
    }))
  }

  const handleLaunchPrograms = async () => {
    if (isLaunching) {
      cancelLaunchRef.current = true
      return
    }

    if (enabledPrograms.length === 0) {
      return
    }

    cancelLaunchRef.current = false
    setIsLaunching(true)

    const initialStatuses = enabledPrograms.reduce<Record<string, LaunchStatus>>(
      (result, program) => ({
        ...result,
        [program.id]: 'waiting',
      }),
      {},
    )

    setLaunchStatuses(initialStatuses)

    if (settings.launchBehavior === 'Launch all at once') {
      setLaunchStatuses((prev) => {
        const nextStatuses = { ...prev }

        enabledPrograms.forEach((program) => {
          nextStatuses[program.id] = 'launching'
        })

        return nextStatuses
      })

      const launchResults = await Promise.all(
        enabledPrograms.map(async (program) => {
          const result = await window.mnAPI.launchProgram({
            path: program.path,
            type: program.type,
          })

          return {
            program,
            result,
          }
        }),
      )

      await wait(1500)

      if (cancelLaunchRef.current) {
        setLaunchStatuses((prev) => {
          const nextStatuses = { ...prev }

          enabledPrograms.forEach((program) => {
            if (nextStatuses[program.id] === 'launching') {
              nextStatuses[program.id] = 'cancelled'
            }
          })

          return nextStatuses
        })

        setIsLaunching(false)
        await resetStatusesAfterDelay()
        return
      }

      setLaunchStatuses((prev) => {
        const nextStatuses = { ...prev }

        launchResults.forEach(({ program, result }) => {
          nextStatuses[program.id] = result.success ? 'completed' : 'failed'
        })

        return nextStatuses
      })

      setIsLaunching(false)
      await resetStatusesAfterDelay()
      return
    }

    const delayMs = getLaunchDelayMs()

    for (const program of enabledPrograms) {
      if (cancelLaunchRef.current) {
        setLaunchStatuses((prev) => ({
          ...prev,
          [program.id]: 'cancelled',
        }))

        break
      }

      setLaunchStatuses((prev) => ({
        ...prev,
        [program.id]: 'launching',
      }))

      const result = await window.mnAPI.launchProgram({
        path: program.path,
        type: program.type,
      })

      await wait(1500)

      if (cancelLaunchRef.current) {
        setLaunchStatuses((prev) => ({
          ...prev,
          [program.id]: 'cancelled',
        }))

        break
      }

      setLaunchStatuses((prev) => ({
        ...prev,
        [program.id]: result.success ? 'completed' : 'failed',
      }))

      if (!result.success && settings.stopLaunchingOnError) {
        break
      }

      await wait(delayMs)
    }

    setIsLaunching(false)
    await resetStatusesAfterDelay()
  }

  const handleToggleStartWithWindows = async () => {
    const nextValue = !settings.startWithWindows

    updateSettings({
      startWithWindows: nextValue,
    })

    const appliedValue = await window.mnAPI.setStartWithWindows(nextValue)

    updateSettings({
      startWithWindows: appliedValue,
    })
  }

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdates(true)
    setUpdateProgress(0)

    const hasUpdate = await window.mnAPI.checkForUpdates()

    if (!hasUpdate) {
      setUpdateModalType('latest')
    }

    window.setTimeout(() => {
      setIsCheckingUpdates(false)
    }, 2000)
  }

  const handleStartUpdateDownload = async () => {
    setUpdateModalType('downloading')
    setUpdateProgress(1)

    try {
      const result = await window.mnAPI.downloadUpdate()

      if (!result) {
        setUpdateProgress(0)
        setUpdateModalType('error')
      }
    } catch (error) {
      console.error('Update download failed:', error)
      setUpdateProgress(0)
      setUpdateModalType('error')
    }
  }

  const handleSelectAudioDevice = async (device: AudioDevice) => {
    setSelectedAudioDevice(device)

    const result = await window.mnAPI.setAudioDevice(device)

    if (!result.success) {
      console.error('Failed to set audio device:', result.error || result.stderr)
    }
  }

  const handleSelectMonitorOrientation = async (
    orientation: MonitorOrientation,
  ) => {
    setSelectedMonitorOrientation(orientation)

    const result = await window.mnAPI.setMonitorOrientation(orientation)

    if (!result.success) {
      console.error('Failed to set monitor orientation:', result.error || result.stderr)
    }
  }

  useEffect(() => {
    window.mnAPI.getAppVersion().then((version) => {
      setAppVersion(version)
    })
  }, [])

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setCurrentDate(new Date())
    }, 1000)

    return () => {
      window.clearInterval(timerId)
    }
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    setSystemTheme(mediaQuery.matches ? 'dark' : 'light')

    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }, [])

  useEffect(() => {
    const loadPrograms = async () => {
      try {
        const savedPrograms = await window.mnAPI.loadPrograms()

        if (isProgramList(savedPrograms)) {
          setPrograms(savedPrograms)
        }
      } catch (error) {
        console.error('Failed to load programs:', error)
      } finally {
        setIsProgramsLoaded(true)
      }
    }

    loadPrograms()
  }, [])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await window.mnAPI.loadSettings()

        if (isSettings(savedSettings)) {
          setSettings(savedSettings)
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      } finally {
        setIsSettingsLoaded(true)
      }
    }

    loadSettings()
  }, [])

  useEffect(() => {
    if (!isProgramsLoaded) return

    window.mnAPI.savePrograms(programs).catch((error) => {
      console.error('Failed to save programs:', error)
    })
  }, [programs, isProgramsLoaded])

  useEffect(() => {
    if (!isSettingsLoaded) return

    window.mnAPI.saveSettings(settings).catch((error) => {
      console.error('Failed to save settings:', error)
    })
  }, [settings, isSettingsLoaded])

  useEffect(() => {
    if (!isAddModalOpen) return

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAddModal()
      }
    }

    window.addEventListener('keydown', handleEsc)

    return () => {
      window.removeEventListener('keydown', handleEsc)
    }
  }, [isAddModalOpen])

  useEffect(() => {
    const removeUpdateAvailableListener = window.mnAPI.onUpdateAvailable(() => {
      window.setTimeout(() => {
        setUpdateModalType('available')
      }, 850)
    })

    const removeUpdateProgressListener = window.mnAPI.onUpdateProgress((progress) => {
      const percent = Math.max(1, Math.min(99, Math.round(progress.percent)))

      setUpdateProgress(percent)
    })

    const removeUpdateDownloadedListener = window.mnAPI.onUpdateDownloaded(() => {
      setUpdateProgress(100)

      window.setTimeout(() => {
        setUpdateModalType('ready')
      }, 500)
    })

    return () => {
      removeUpdateAvailableListener()
      removeUpdateProgressListener()
      removeUpdateDownloadedListener()
    }
  }, []) 
  
  return (
    <div
      className="app"
      data-theme={activeTheme}
      data-accent={settings.accentColor}
      style={appStyle}
    >
      <div className="custom-titlebar">
        <div className="custom-titlebar-controls">
          <button
            type="button"
            className="titlebar-minimize"
            onClick={() => window.mnAPI.minimizeWindow()}
          ></button>

          <button
            type="button"
            onClick={() => window.mnAPI.closeWindow()}
          >
            ×
          </button>
        </div>
      </div>

      <aside className="sidebar">
        <button
          type="button"
          className={`brand ${activePage === 'home' ? 'active' : ''}`}
          onClick={() => setActivePage('home')}
        >
          <img
            src={logoMap[settings.accentColor]}
            alt="MN Logo"
            className="brand-logo"
          />
        </button>

        <nav className="menu">
          <button
            className={`menu-item ${activePage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActivePage('dashboard')}
          >
            <img
              src={getThemeIcon('dashboard', activePage === 'dashboard')}
              alt=""
              className="menu-icon"
            />
            Dashboard
          </button>

          <button
            className={`menu-item ${activePage === 'programs' ? 'active' : ''}`}
            onClick={() => setActivePage('programs')}
          >
            <img
              src={getThemeIcon('programs', activePage === 'programs')}
              alt=""
              className="menu-icon"
            />
            Programs
          </button>

          <button
            className={`menu-item ${activePage === 'settings' ? 'active' : ''}`}
            onClick={() => setActivePage('settings')}
          >
            <img
              src={getThemeIcon('settings', activePage === 'settings')}
              alt=""
              className="menu-icon"
            />
            Settings
          </button>
        </nav>
      </aside>

      <main className="content" onClick={() => setOpenMenuId(null)}>
        {activePage === 'home' && (
          <section className="home-page">
            <div className="home-card">
              <div className="home-preset-section">
                <p className="dashboard-preset-title dashboard-section-title">
                  <img
                    src={getThemeIcon('preset')}
                    alt=""
                    className="dashboard-title-icon"
                  />
                  Current Preset
                </p>

                <div
                  className="home-preset-track"
                  style={
                    {
                      '--selected-preset-index': selectedPreset - 1,
                    } as CSSProperties
                  }
                >
                  <span className="home-preset-active-dot"></span>

                  {[1, 2, 3, 4].map((presetNumber) => (
                    <button
                      key={presetNumber}
                      className={`home-preset-dot ${
                        selectedPreset === presetNumber ? 'active' : ''
                      }`}
                      onClick={() => setSelectedPreset(presetNumber)}
                    >
                      <span></span>
                      <b>{String(presetNumber).padStart(2, '0')}</b>
                    </button>
                  ))}
                </div>

                <button
                  className={`home-launch-button ${isLaunching ? 'launching' : ''}`}
                  onClick={handleLaunchPrograms}
                  disabled={enabledProgramCount === 0}
                >
                  <img
                    src={
                      isLaunching
                        ? rocketActive
                        : rocketMap[settings.accentColor]
                    }
                    alt=""
                    className="home-launch-icon"
                  />
                </button>
              </div>

              <div className="home-divider"></div>

              <div className="home-device-section">
                <div className="home-device-group">
                  <p className="home-device-title home-device-title-audio">
                    <img
                      src={getThemeIcon('speaker')}
                      alt=""
                      className="home-device-title-icon"
                    />
                    Audio
                  </p>

                  <div className="home-device-buttons">
                    <button
                      className={`home-device-button ${
                        selectedAudioDevice === 'speaker' ? 'active' : ''
                      }`}
                      onClick={() => handleSelectAudioDevice('speaker')}
                    >
                      <img
                        src={getThemeIcon(
                          'speaker',
                          selectedAudioDevice === 'speaker',
                        )}
                        alt=""
                        className="home-device-icon"
                      />
                    </button>

                    <button
                      className={`home-device-button ${
                        selectedAudioDevice === 'headphone' ? 'active' : ''
                      }`}
                      onClick={() => handleSelectAudioDevice('headphone')}
                    >
                      <img
                        src={getThemeIcon(
                          'headphone',
                          selectedAudioDevice === 'headphone',
                        )}
                        alt=""
                        className="home-device-icon"
                      />
                    </button>
                  </div>
                </div>

                <div className="home-device-split"></div>

                <div className="home-device-group">
                  <p className="home-device-title">
                    <img
                      src={getThemeIcon('hmonitor')}
                      alt=""
                      className="home-device-title-icon"
                    />
                    Monitor
                  </p>

                  <div className="home-device-buttons">
                    <button
                      className={`home-device-button ${
                        selectedMonitorOrientation === 'horizontal' ? 'active' : ''
                      }`}
                      onClick={() => handleSelectMonitorOrientation('horizontal')}
                    >
                      <img
                        src={getThemeIcon(
                          'hmonitor',
                          selectedMonitorOrientation === 'horizontal',
                        )}
                        alt=""
                        className="home-device-icon"
                      />
                    </button>

                    <button
                      className={`home-device-button ${
                        selectedMonitorOrientation === 'vertical' ? 'active' : ''
                      }`}
                      onClick={() => handleSelectMonitorOrientation('vertical')}
                    >
                      <img
                        src={getThemeIcon(
                          'vmonitor',
                          selectedMonitorOrientation === 'vertical',
                        )}
                        alt=""
                        className="home-device-icon"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activePage === 'dashboard' && (
          <>
            <section className="top-card">
              <div className="dashboard-time">
                <p className="dashboard-section-title">
                  <img
                    src={getThemeIcon('time')}
                    alt=""
                    className="dashboard-title-icon"
                  />
                  Current Time
                </p>

                <h1>
                  {currentTimeText}
                  <em>{currentMeridiemText}</em>
                </h1>

                <span>
                  {currentDateText}
                  <i></i>
                  {currentWeekdayText}
                </span>
              </div>

              <div className="dashboard-preset">
                <p className="dashboard-preset-title dashboard-section-title">
                  <img
                    src={getThemeIcon('preset')}
                    alt=""
                    className="dashboard-title-icon"
                  />
                  Current Preset
                </p>

                <div
                  className="dashboard-preset-track"
                  style={
                    {
                      '--selected-preset-index': selectedPreset - 1,
                    } as CSSProperties
                  }
                >
                  <span className="dashboard-preset-active-dot"></span>

                  {[1, 2, 3, 4].map((presetNumber) => (
                    <button
                      key={presetNumber}
                      className={`dashboard-preset-dot ${
                        selectedPreset === presetNumber ? 'active' : ''
                      }`}
                      onClick={() => setSelectedPreset(presetNumber)}
                    >
                      <span></span>
                      <b>{String(presetNumber).padStart(2, '0')}</b>
                    </button>
                  ))}
                </div>
              </div>

              <button
                className={`launch-button ${isLaunching ? 'launching' : ''}`}
                onClick={handleLaunchPrograms}
                disabled={enabledProgramCount === 0}
              >
                <img
                  src={
                    isLaunching
                      ? rocketActive
                      : rocketMap[settings.accentColor]
                  }
                  alt=""
                  className="launch-icon"
                />
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
                      initial={{
                        opacity: 0,
                        y: 18,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      exit={{
                        opacity: 0,
                        y: -18,
                      }}
                      transition={{
                        duration: 0.24,
                        delay: index * 0.035,
                        ease: [0.2, 0.9, 0.3, 1],
                      }}
                    >
                      <div
                        className={`program ${
                          status === 'completed'
                            ? 'done'
                            : status === 'launching'
                              ? 'running'
                              : status === 'failed'
                                ? 'failed'
                                : status === 'cancelled'
                                  ? 'cancelled'
                                  : 'waiting'}
                        }`}
                      >
                        <button
                          className="program-status-button"
                          onClick={() => handleLaunchSingleProgram(program)}
                          disabled={status !== 'waiting' || isLaunching}
                        />

                        <ProgramIcon program={program} />
                        <div>
                          <h3>{program.name}</h3>
                          <p>
                            {status === 'completed'
                              ? 'Completed'
                              : status === 'launching'
                                ? 'Launching...'
                                : status === 'failed'
                                  ? 'failed'
                                  : status === 'cancelled'
                                    ? 'Cancelled'
                                    : 'waiting'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </section>
          </>
        )}

        {activePage === 'programs' && (
          <section className="programs-page">
            <div className="page-header">
              <div>
                <h1>Programs</h1>
                <p>Add or remove programs to customize your MN WORKSPACE.</p>
              </div>

              <button
                className="add-program-button"
                onClick={() => setIsAddModalOpen(true)}
              >
                ＋ Add Program
              </button>
            </div>

            <div className="program-list-card" onClick={(event) => event.stopPropagation()}>
              <div className="program-list-header">
                <div className="preset-header">
                  <span className="preset-title">Preset</span>

                  <div
                    className="preset-tabs"
                    style={
                      {
                        '--selected-preset-index': selectedPreset - 1,
                      } as CSSProperties
                    }
                  >
                    <span className="preset-active-dot"></span>

                    {[1, 2, 3, 4].map((presetNumber) => (
                      <div className="preset-tab-wrap" key={presetNumber}>
                        <button
                          className={`preset-tab ${
                            selectedPreset === presetNumber ? 'active' : ''
                          }`}
                          onClick={() => setSelectedPreset(presetNumber)}
                        >
                          {String(presetNumber).padStart(2, '0')}
                        </button>

                        {presetNumber !== 4 && (
                          <span className="preset-tab-divider"></span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="program-list-meta">
                  <strong>Program List ({presetPrograms.length})</strong>
                  <span>⠿ Drag to reorder</span>
                </div>
              </div>

              <DndContext
                key={selectedPreset}
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={presetPrograms.map((program) => program.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <AnimatePresence mode="wait">
                    {presetPrograms.map((program, index) => (
                      <motion.div
                        key={`${selectedPreset}-${program.id}`}
                        className="program-list-motion-row"
                        initial={{
                          opacity: 0,
                          y: 18,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        exit={{
                          opacity: 0,
                          y: -18,
                        }}
                        transition={{
                          duration: 0.28,
                          delay: index * 0.045,
                          ease: [0.2, 0.9, 0.3, 1],
                        }}
                      >
                        <SortableProgramRow
                          program={program}
                          isMenuOpen={openMenuId === program.id}
                          onToggle={handleToggleProgram}
                          onMenuToggle={(id) =>
                            setOpenMenuId((prev) => (prev === id ? null : id))
                          }
                          onDelete={handleDeleteProgram}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </SortableContext>
              </DndContext>
            </div>

            <div className="save-note">ⓘ Changes are saved automatically.</div>
          </section>
        )}

        {activePage === 'settings' && (
          <section className="settings-page">
            <div className="settings-header">
              <h1>Settings</h1>
              <p>Configure workspace auto-launch and application preferences.</p>
            </div>

            <div className="settings-card">
              <h3>General</h3>

              <div className="setting-row">
                <div>
                  <strong>Start with Windows</strong>
                  <p>Launch MN WORKSPACE automatically when Windows starts.</p>
                </div>
                <button
                  className={`toggle ${settings.startWithWindows ? 'on' : ''}`}
                  onClick={handleToggleStartWithWindows}
                >
                  <span></span>
                </button>
              </div>

              <div className="setting-row">
                <div>
                  <strong>Minimize to system tray</strong>
                  <p>Minimize application to system tray instead of taskbar.</p>
                </div>
                <button
                  className={`toggle ${settings.minimizeToTray ? 'on' : ''}`}
                  onClick={() =>
                    updateSettings({
                      minimizeToTray: !settings.minimizeToTray,
                    })
                  }
                >
                  <span></span>
                </button>
              </div>

              <div className="setting-row">
                <div>
                  <strong>Check for updates</strong>
                  <p>Automatically check for updates on startup.</p>
                </div>

                <div className="setting-update-actions">
                  <button
                    className={`setting-icon-action ${
                      isCheckingUpdates ? 'checking' : ''
                    }`}
                    onClick={handleCheckForUpdates}
                    title="Check for updates"
                  >
                    <img
                      src={
                        isCheckingUpdates
                          ? iconMap.check[settings.accentColor]
                          : activeTheme === 'dark'
                            ? iconMap.check.white
                            : iconMap.check.gray
                      }
                      alt=""
                    />
                  </button>

                  <button
                    className={`toggle ${settings.checkForUpdates ? 'on' : ''}`}
                    onClick={() =>
                      updateSettings({
                        checkForUpdates: !settings.checkForUpdates,
                      })
                    }
                  >
                    <span></span>
                  </button>
                </div>
              </div>
            </div>

            <div className="settings-card">
              <h3>Auto Launch</h3>

              <div className="setting-row">
                <div>
                  <strong>Launch delay</strong>
                  <p>Set a delay before launching the next program.</p>
                </div>

                <select
                  className="setting-select"
                  value={settings.launchDelay}
                  onChange={(event) =>
                    updateSettings({
                      launchDelay: event.target.value as LaunchDelay,
                    })
                  }
                >
                  <option>1 second</option>
                  <option>2 seconds</option>
                  <option>3 seconds</option>
                  <option>5 seconds</option>
                </select>
              </div>

              <div className="setting-row">
                <div>
                  <strong>Launch behavior</strong>
                  <p>Choose how programs are launched.</p>
                </div>

                <select
                  className="setting-select"
                  value={settings.launchBehavior}
                  onChange={(event) =>
                    updateSettings({
                      launchBehavior: event.target.value as LaunchBehavior,
                    })
                  }
                >
                  <option>Launch in order</option>
                  <option>Launch all at once</option>
                </select>
              </div>

              <div className="setting-row">
                <div>
                  <strong>Stop launching on error</strong>
                  <p>Stop the sequence if a program fails to launch.</p>
                </div>

                <button
                  className={`toggle ${settings.stopLaunchingOnError ? 'on' : ''}`}
                  onClick={() =>
                    updateSettings({
                      stopLaunchingOnError: !settings.stopLaunchingOnError,
                    })
                  }
                >
                  <span></span>
                </button>
              </div>
            </div>

            <div className="settings-card">
              <h3>Appearance</h3>

              <div className="setting-row">
                <div>
                  <strong>Theme</strong>
                  <p>Choose the application theme.</p>
                </div>

                <select
                  className="setting-select"
                  value={settings.theme}
                  onChange={(event) =>
                    updateSettings({
                      theme: event.target.value as Theme,
                    })
                  }
                >
                  <option>Light</option>
                  <option>Dark</option>
                  <option>System</option>
                </select>
              </div>

              <div className="setting-row">
                <div>
                  <strong>Accent color</strong>
                  <p>Choose the accent color for the application.</p>
                </div>

                <div className="accent-list">
                  {(
                    [
                      'purple',
                      'blue',
                      'green',
                      'orange',
                      'red',
                      'gray',
                    ] as AccentColor[]
                  ).map((color) => (
                    <button
                      key={color}
                      className={`accent-dot ${color} ${
                        settings.accentColor === color ? 'active' : ''
                      }`}
                      onClick={() =>
                        updateSettings({
                          accentColor: color,
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="settings-footer">
              MN WORKSPACE v{appVersion}
            </div>
          </section>
        )}
        {updateModalType && (
          <div className="modal-overlay">
            <div className="update-modal">
              <div className="update-modal-icon">
                <img
                  src={iconMap.check[settings.accentColor]}
                  alt=""
                />
              </div>

              <h2>
                {updateModalType === 'available' && 'Update Available'}
                {updateModalType === 'downloading' && 'Downloading Update'}
                {updateModalType === 'ready' && 'Update Ready'}
                {updateModalType === 'latest' && 'Already Up to Date'}
                {updateModalType === 'error' && 'Update Failed'}
              </h2>

              <p>
                {updateModalType === 'available' &&
                  'A new version of MN WORKSPACE is ready.'}

                {updateModalType === 'downloading' &&
                  'Please wait while the update is being downloaded.'}

                {updateModalType === 'ready' &&
                  'The update is ready to install.'}

                {updateModalType === 'latest' &&
                  'You are already using the latest version.'}

                {updateModalType === 'error' &&
                  'The update could not be downloaded.'}
              </p>

              <div className="update-modal-version">
                {updateModalType === 'available' && (
                  <>
                    <span>Current v{appVersion}</span>
                    <b>→</b>
                    <span>New version</span>
                  </>
                )}

                {updateModalType === 'downloading' && (
                  <div className="update-progress-wrap">
                    <div className="update-progress-info">
                      <span>Downloading update</span>
                      <b>{updateProgress}%</b>
                    </div>

                    <div className="update-progress-bar">
                      <span
                        style={{
                          width: `${updateProgress}%`,
                        }}
                      ></span>
                    </div>
                  </div>
                )}

                {updateModalType === 'ready' && (
                  <>
                    <span>MN WORKSPACE v{appVersion}</span>
                    <b>→</b>
                    <span>Restart required</span>
                  </>
                )}

                {updateModalType === 'latest' && (
                  <>
                    <span>MN WORKSPACE v{appVersion}</span>
                  </>
                )}

                {updateModalType === 'error' && (
                  <>
                    <span>Download failed</span>
                  </>
                )}
              </div>

              {updateModalType !== 'downloading' && (
                <div className="update-modal-actions">
                  {updateModalType !== 'latest' && (
                    <button
                      className="modal-cancel-button"
                      onClick={() => setUpdateModalType(null)}
                    >
                      Later
                    </button>
                  )}

                  <button
                    className="modal-add-button"
                    onClick={() =>
                      updateModalType === 'available'
                        ? handleStartUpdateDownload()
                        : updateModalType === 'ready'
                          ? window.mnAPI.installUpdate()
                          : setUpdateModalType(null)
                    }
                  >
                    {updateModalType === 'available'
                      ? 'Update'
                      : updateModalType === 'ready'
                        ? 'Restart'
                        : 'OK'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {isAddModalOpen && (
          <div className="modal-overlay">
            <div className="add-modal">
              <div className="modal-header">
                <div>
                  <h2>Add Program</h2>
                  <p>Add a program, folder, or URL to your workspace launch list.</p>
                </div>

                <button className="modal-close-button" onClick={closeAddModal}>
                  ×
                </button>
              </div>

              <div className="modal-form">
                <label>
                  Program Name
                  <input
                    type="text"
                    placeholder="Program"
                    value={newProgramName}
                    onChange={(event) => setNewProgramName(event.target.value)}
                  />
                </label>

                <label>
                  Type
                  <select
                    value={newProgramType}
                    onChange={(event) => {
                      const selectedType = event.target.value as ProgramType
                      setNewProgramType(selectedType)

                      if (selectedType === 'URL') {
                        setNewProgramPath('')
                        setNewProgramIconImage(null)
                      }
                    }}
                  >
                    <option>Program</option>
                    <option>Folder</option>
                    <option>URL</option>
                  </select>
                </label>

                <label>
                  Path or URL
                  <div className="path-row">
                    <input
                      type="text"
                      placeholder={
                        newProgramType === 'URL'
                          ? 'https://music.youtube.com'
                          : 'C:\\Program Files\\...'
                      }
                      value={newProgramPath}
                      onChange={(event) => {
                        setNewProgramPath(event.target.value)

                        if (newProgramType !== 'Program') {
                          setNewProgramIconImage(null)
                        }
                      }}
                    />

                    {newProgramType !== 'URL' && (
                      <button
                        type="button"
                        onClick={handleBrowse}
                      >
                        Browse
                      </button>
                    )}
                  </div>
                </label>

                <div className="modal-toggle-row">
                  <div>
                    <strong>Enabled</strong>
                    <p>Include this item when launching workspace.</p>
                  </div>

                  <button
                    className={`toggle ${newProgramEnabled ? 'on' : ''}`}
                    onClick={() => setNewProgramEnabled((prev) => !prev)}
                  >
                    <span></span>
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button className="modal-cancel-button" onClick={closeAddModal}>
                  Cancel
                </button>

                <button className="modal-add-button" onClick={handleAddProgram}>
                  Add Program
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App