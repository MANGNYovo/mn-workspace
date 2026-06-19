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

  import datePurple from './assets/date-purple.png'
  import dateBlue from './assets/date-blue.png'
  import dateGreen from './assets/date-green.png'
  import dateOrange from './assets/date-orange.png'
  import dateRed from './assets/date-red.png'
  import dateGray from './assets/date-gray.png'
  import dateWhite from './assets/date-white.png'

  import writeIcon from './assets/write.png'

  import saveIcon from './assets/save.png'

  import trashIcon from './assets/trash.png'

  import './App.css'

  type Page = 'home' | 'dashboard' | 'programs' | 'diary' | 'writeDiary' | 'settings'
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

    date: {
      purple: datePurple,
      blue: dateBlue,
      green: dateGreen,
      orange: dateOrange,
      red: dateRed,
      gray: dateGray,
      white: dateWhite,
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

  type DiaryEntry = {
    date: string
    content: string
    createdAt: string
    updatedAt: string
  }

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const calendarWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const initialDiaryEntries: Record<string, DiaryEntry> = {}

  function formatDateKey(date: Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  function getWriteDiaryTitleParts(date: Date) {
    return {
      monthDay: `${monthNames[date.getMonth()]} ${date.getDate()}`,
      year: date.getFullYear(),
    }
  }

  function formatDiaryMonthTitle(date: Date) {
    return `${monthNames[date.getMonth()]}`
  }

  function isSameDate(firstDate: Date, secondDate: Date) {
    return formatDateKey(firstDate) === formatDateKey(secondDate)
  }

  function createMonthDate(baseDate: Date, monthOffset: number) {
    return new Date(baseDate.getFullYear(), baseDate.getMonth() + monthOffset, 1)
  }

  function getDiaryCalendarDays(baseDate: Date) {
    const year = baseDate.getFullYear()
    const month = baseDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(year, month, 1 - firstDay.getDay())

    return Array.from({ length: 35 }, (_, index) => {
      const date = new Date(startDate)

      date.setDate(startDate.getDate() + index)

      return date
    })
  }

  function isCurrentMonth(date: Date, baseDate: Date) {
    return date.getFullYear() === baseDate.getFullYear() &&
      date.getMonth() === baseDate.getMonth()
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

  function isDiaryEntries(value: unknown): value is Record<string, DiaryEntry> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false

    return Object.values(value).every((item) => {
      if (!item || typeof item !== 'object') return false

      const diaryEntry = item as DiaryEntry

      return (
        typeof diaryEntry.date === 'string' &&
        typeof diaryEntry.content === 'string' &&
        typeof diaryEntry.createdAt === 'string' &&
        typeof diaryEntry.updatedAt === 'string'
      )
    })
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
    const [isDiariesLoaded, setIsDiariesLoaded] = useState(false)

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

    const [diaryEntries, setDiaryEntries] = useState<Record<string, DiaryEntry>>(initialDiaryEntries)
    const [diaryDisplayDate, setDiaryDisplayDate] = useState(new Date(2026, 5, 1))
    const [isDiaryPickerOpen, setIsDiaryPickerOpen] = useState(false)
    const [selectedDiaryDate, setSelectedDiaryDate] = useState<Date | null>(null)
    const [diaryText, setDiaryText] = useState('')
    const [isDeleteDiaryConfirmOpen, setIsDeleteDiaryConfirmOpen] = useState(false)
    const [isDiarySavedVisible, setIsDiarySavedVisible] = useState(false)
    const [isDiarySaveButtonPressed, setIsDiarySaveButtonPressed] = useState(false)
    const [diaryPickerMonthIndex, setDiaryPickerMonthIndex] = useState(diaryDisplayDate.getMonth())
    const [diaryPickerYear, setDiaryPickerYear] = useState(diaryDisplayDate.getFullYear())
    const diaryMonthWheelRef = useRef<HTMLDivElement | null>(null)
    const diaryYearWheelRef = useRef<HTMLDivElement | null>(null)

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

    const todayDateKey = formatDateKey(currentDate)
    const todayDiaryEntry = diaryEntries[todayDateKey]
    const selectedDiaryEntry = selectedDiaryDate
      ? diaryEntries[formatDateKey(selectedDiaryDate)]
      : null
    const diaryCalendarDays = getDiaryCalendarDays(diaryDisplayDate)
    const diaryPickerMonthOptions = monthNames.map((monthName, monthIndex) => ({
      monthName,
      monthIndex,
    }))
    const diaryPickerMinYear = currentDate.getFullYear() - 50
    const diaryPickerMaxYear = currentDate.getFullYear() + 50
    const diaryPickerYearOptions = Array.from(
      { length: diaryPickerMaxYear - diaryPickerMinYear + 1 },
      (_, index) => diaryPickerMinYear + index,
    )

    const handleOpenDiaryDate = (date: Date) => {
      const dateKey = formatDateKey(date)

      if (!diaryEntries[dateKey]) {
        return
      }

      setSelectedDiaryDate(date)
    }

    const handleDeleteDiary = () => {
      setIsDeleteDiaryConfirmOpen(true)
    }

    const handleConfirmDeleteDiary = () => {
      if (!selectedDiaryDate) {
        return
      }

      const dateKey = formatDateKey(selectedDiaryDate)

      setDiaryEntries((prev) => {
        const nextEntries = { ...prev }

        delete nextEntries[dateKey]

        return nextEntries
      })

      setIsDeleteDiaryConfirmOpen(false)
      setSelectedDiaryDate(null)
    }

    const handleMoveDiaryMonth = (monthOffset: number) => {
      setDiaryDisplayDate((prev) => createMonthDate(prev, monthOffset))
    }

    const handleDiaryMonthScroll = () => {
      const scrollElement = diaryMonthWheelRef.current

      if (!scrollElement) {
        return
      }

      const nextMonthIndex = Math.round(scrollElement.scrollTop / 60)

      setDiaryPickerMonthIndex(Math.max(0, Math.min(11, nextMonthIndex)))
    }

    const handleDiaryYearScroll = () => {
      const scrollElement = diaryYearWheelRef.current

      if (!scrollElement) {
        return
      }

      const nextYearIndex = Math.round(scrollElement.scrollTop / 60)
      const nextYear = diaryPickerMinYear + nextYearIndex

      setDiaryPickerYear(Math.max(diaryPickerMinYear, Math.min(diaryPickerMaxYear, nextYear)))
    }

    const handleSaveDiary = () => {
      const content = diaryText.trim()

      if (!content) {
        return
      }

      const now = new Date().toISOString()

      setDiaryEntries((prev) => ({
        ...prev,
        [todayDateKey]: {
          date: todayDateKey,
          content,
          createdAt: prev[todayDateKey]?.createdAt ?? now,
          updatedAt: now,
        },
      }))

      setIsDiarySaveButtonPressed(true)
      setIsDiarySavedVisible(true)

      window.setTimeout(() => {
        setIsDiarySaveButtonPressed(false)
      }, 280)

      window.setTimeout(() => {
        setIsDiarySavedVisible(false)
      }, 1400)
    }

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

    const refreshDeviceStates = async () => {
      try {
        const [audioDevice, monitorOrientation] = await Promise.all([
          window.mnAPI.getAudioDevice(),
          window.mnAPI.getMonitorOrientation(),
        ])

        if (audioDevice) {
          setSelectedAudioDevice(audioDevice)
        }

        if (monitorOrientation) {
          setSelectedMonitorOrientation(monitorOrientation)
        }
      } catch (error) {
        console.error('Failed to refresh device states:', error)
      }
    }

    const handleSelectAudioDevice = async (device: AudioDevice) => {
      const result = await window.mnAPI.setAudioDevice(device)

      if (!result.success) {
        console.error('Failed to set audio device:', result.error || result.stderr)
        return
      }

      await refreshDeviceStates()
    }

    const handleSelectMonitorOrientation = async (
      orientation: MonitorOrientation,
    ) => {
      const result = await window.mnAPI.setMonitorOrientation(orientation)

      if (!result.success) {
        console.error('Failed to set monitor orientation:', result.error || result.stderr)
        return
      }

      await refreshDeviceStates()
    }

    useEffect(() => {
      window.mnAPI.getAppVersion().then((version) => {
        setAppVersion(version)
      })
    }, [])

    useEffect(() => {
      if (activePage !== 'home') {
        return
      }

      const refresh = () => {
        refreshDeviceStates()
      }

      refresh()

      const timerId = window.setInterval(refresh, 1000)

      window.addEventListener('focus', refresh)
      document.addEventListener('visibilitychange', refresh)

      return () => {
        window.clearInterval(timerId)
        window.removeEventListener('focus', refresh)
        document.removeEventListener('visibilitychange', refresh)
      }
    }, [activePage])

    useEffect(() => {
      const updateCurrentDate = () => {
        setCurrentDate(new Date())
      }

      updateCurrentDate()

      const timerId = window.setInterval(updateCurrentDate, 1000)

      window.addEventListener('focus', updateCurrentDate)
      document.addEventListener('visibilitychange', updateCurrentDate)

      return () => {
        window.clearInterval(timerId)
        window.removeEventListener('focus', updateCurrentDate)
        document.removeEventListener('visibilitychange', updateCurrentDate)
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
      const loadDiaries = async () => {
        try {
          const savedDiaries = await window.mnAPI.loadDiaries()

          if (isDiaryEntries(savedDiaries)) {
            setDiaryEntries(savedDiaries)
          }
        } catch (error) {
          console.error('Failed to load diaries:', error)
        } finally {
          setIsDiariesLoaded(true)
        }
      }

      loadDiaries()
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
      if (!isDiariesLoaded) return

      window.mnAPI.saveDiaries(diaryEntries).catch((error) => {
        console.error('Failed to save diaries:', error)
      })
    }, [diaryEntries, isDiariesLoaded])

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

    useEffect(() => {
      if (activePage !== 'writeDiary') {
        return
      }

      setDiaryText(todayDiaryEntry?.content ?? '')
    }, [activePage, todayDateKey, todayDiaryEntry?.content])

    useEffect(() => {
      if (!isDiaryPickerOpen) {
        return
      }

      window.requestAnimationFrame(() => {
        diaryMonthWheelRef.current?.scrollTo({
          top: diaryPickerMonthIndex * 60,
        })

        diaryYearWheelRef.current?.scrollTo({
          top: (diaryPickerYear - diaryPickerMinYear) * 60,
        })
      })
    }, [isDiaryPickerOpen])

    useEffect(() => {
      const hasOpenModal =
        isDiaryPickerOpen ||
        Boolean(selectedDiaryDate) ||
        isDeleteDiaryConfirmOpen ||
        Boolean(updateModalType) ||
        isAddModalOpen

      if (!hasOpenModal) {
        return
      }

      const handleEsc = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') {
          return
        }

        if (isDeleteDiaryConfirmOpen) {
          setIsDeleteDiaryConfirmOpen(false)
          return
        }

        if (selectedDiaryDate) {
          setSelectedDiaryDate(null)
          return
        }

        if (isDiaryPickerOpen) {
          setIsDiaryPickerOpen(false)
          return
        }

        if (updateModalType) {
          setUpdateModalType(null)
          return
        }

        if (isAddModalOpen) {
          closeAddModal()
        }
      }

      window.addEventListener('keydown', handleEsc)

      return () => {
        window.removeEventListener('keydown', handleEsc)
      }
    }, [
      isDiaryPickerOpen,
      selectedDiaryDate,
      isDeleteDiaryConfirmOpen,
      updateModalType,
      isAddModalOpen,
    ])
    
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
              className={`menu-item ${
                activePage === 'diary' || activePage === 'writeDiary' ? 'active' : ''
              }`}
              onClick={() => setActivePage('diary')}
            >
              <img
                src={getThemeIcon('date', activePage === 'diary' || activePage === 'writeDiary')}
                alt=""
                className="menu-icon"
              />
              Diary
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

          {activePage === 'diary' && (
            <section className="diary-page">
              <div className="diary-card">
                <div className="diary-header">
                  <div>
                    <h1>Diary</h1>
                    <p>Write down your thoughts in 300 characters every day.</p>
                  </div>

                  <button
                    className="diary-write-button"
                    onClick={() => setActivePage('writeDiary')}
                  >
                    <img
                      src={writeIcon}
                      alt=""
                      className="diary-button-icon"
                    />
                    {todayDiaryEntry ? 'Edit Diary' : 'Write Diary'}
                  </button>
                </div>

                <div className="diary-calendar-header">
                  <div className="diary-month-control">
                    <button onClick={() => handleMoveDiaryMonth(-1)}>
                      ‹
                    </button>

                    <button
                      className="diary-current-month"
                      onClick={() => {
                        setDiaryPickerMonthIndex(diaryDisplayDate.getMonth())
                        setDiaryPickerYear(diaryDisplayDate.getFullYear())
                        setIsDiaryPickerOpen(true)
                      }}
                    >
                      <strong>{formatDiaryMonthTitle(diaryDisplayDate)}</strong>
                      <span>{diaryDisplayDate.getFullYear()}</span>
                    </button>

                    <button onClick={() => handleMoveDiaryMonth(1)}>
                      ›
                    </button>
                  </div>

                  <button
                    className="diary-today-button"
                    onClick={() => setDiaryDisplayDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1))}
                  >
                    Today
                  </button>
                </div>

                <div className="diary-weekdays">
                  {calendarWeekdays.map((weekday) => (
                    <span key={weekday}>{weekday}</span>
                  ))}
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
                        onClick={() => handleOpenDiaryDate(date)}
                      >
                        <span>{date.getDate()}</span>

                        {hasDiary && (
                          <i></i>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>
          )}

          {activePage === 'writeDiary' && (
            <section className="write-diary-page">
              <div className="write-diary-header">
                <h1>Write Diary</h1>
                <p>Write down your thoughts in 300 characters every day.</p>
              </div>

              <div className="write-diary-card">
                <div className="write-diary-top">
                  <button
                    className="write-diary-back-button"
                    onClick={() => setActivePage('diary')}
                  >
                    ‹ Back
                  </button>

                  <div className="write-diary-date">
                    <span>
                      <img
                        src={getThemeIcon('date')}
                        alt=""
                        className="diary-date-icon"
                      />
                    </span>
                    <div>
                      <h2>
                        {getWriteDiaryTitleParts(currentDate).monthDay}
                        <em>{getWriteDiaryTitleParts(currentDate).year}</em>
                      </h2>
                      <p>{weekdayNames[currentDate.getDay()]}</p>
                    </div>
                  </div>

                  <div className="write-diary-actions">
                    <button
                      className={`write-diary-save-button ${isDiarySaveButtonPressed ? 'pressed' : ''}`}
                      onClick={handleSaveDiary}
                      disabled={diaryText.trim().length === 0 || diaryText.length > 300}
                    >
                      <img
                        src={saveIcon}
                        alt=""
                        className="diary-button-icon"
                      />
                      Save
                    </button>
                  </div>
                </div>

                <textarea
                  className="write-diary-textarea"
                  placeholder="Start writing your diary..."
                  value={diaryText}
                  maxLength={300}
                  spellCheck={false}
                  onChange={(event) => setDiaryText(event.target.value)}
                />

                <div className="write-diary-bottom">
                  <span>{diaryText.length} / 300 characters</span>

                  {isDiarySavedVisible && (
                    <strong>
                      ● Saved
                    </strong>
                  )}
                </div>
              </div>
            </section>
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
          {isDiaryPickerOpen && (
            <div className="modal-overlay">
              <div className="diary-picker-modal">
                <button
                  className="diary-modal-close"
                  onClick={() => setIsDiaryPickerOpen(false)}
                >
                  ×
                </button>

                <div className="diary-wheel-picker">
                  <div
                    ref={diaryMonthWheelRef}
                    className="diary-wheel-column"
                    onScroll={handleDiaryMonthScroll}
                  >
                    {diaryPickerMonthOptions.map(({ monthName, monthIndex }) => {
                      const distance = Math.min(Math.abs(monthIndex - diaryPickerMonthIndex), 3)

                      return (
                        <div
                          key={monthName}
                          className={`diary-wheel-item diary-wheel-distance-${distance} ${
                            monthIndex === diaryPickerMonthIndex ? 'active' : ''
                          }`}
                        >
                          {monthName}
                        </div>
                      )
                    })}
                  </div>

                  <div
                    ref={diaryYearWheelRef}
                    className="diary-wheel-column"
                    onScroll={handleDiaryYearScroll}
                  >
                    {diaryPickerYearOptions.map((year) => {
                      const distance = Math.min(Math.abs(year - diaryPickerYear), 3)

                      return (
                        <div
                          key={year}
                          className={`diary-wheel-item diary-wheel-distance-${distance} ${
                            year === diaryPickerYear ? 'active' : ''
                          }`}
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
                      const columnWidth = pickerElement
                        ? pickerElement.clientWidth / 2
                        : 0

                      if (event.nativeEvent.offsetX < columnWidth) {
                        diaryMonthWheelRef.current?.scrollBy({
                          top: event.deltaY,
                          behavior: 'smooth',
                        })

                        return
                      }

                      diaryYearWheelRef.current?.scrollBy({
                        top: event.deltaY,
                        behavior: 'smooth',
                      })
                    }}
                    onClick={() => {
                      setDiaryDisplayDate(
                        new Date(diaryPickerYear, diaryPickerMonthIndex, 1),
                      )
                      setIsDiaryPickerOpen(false)
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {selectedDiaryDate && selectedDiaryEntry && (
            <div className="modal-overlay">
              <div className="diary-view-modal">
                <button
                  className="diary-modal-close"
                  onClick={() => setSelectedDiaryDate(null)}
                >
                  ×
                </button>

                <div className="diary-view-header">
                  <span>
                    <img
                      src={getThemeIcon('date')}
                      alt=""
                      className="diary-date-icon"
                    />
                  </span>

                  <div>
                    <h2>
                      {monthNames[selectedDiaryDate.getMonth()]} {selectedDiaryDate.getDate()}
                      <em>{selectedDiaryDate.getFullYear()}</em>
                    </h2>
                    <p>{weekdayNames[selectedDiaryDate.getDay()]}</p>
                  </div>
                </div>

                <div className="diary-view-content">
                  {selectedDiaryEntry.content.split('\n').map((line, index) => (
                    <p key={index}>{line || '\u00A0'}</p>
                  ))}
                </div>

                <div className="diary-view-footer">
                  <span>{selectedDiaryEntry.content.length} / 300</span>

                  <button onClick={handleDeleteDiary}>
                    <img
                      src={trashIcon}
                      alt=""
                      className="diary-trash-icon"
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {isDeleteDiaryConfirmOpen && (
            <div className="modal-overlay">
              <div className="diary-delete-confirm-modal">
                <h2>Delete Diary?</h2>
                <p>This diary will be permanently deleted.</p>

                <div className="diary-delete-confirm-actions">
                  <button
                    className="diary-delete-cancel-button"
                    onClick={() => setIsDeleteDiaryConfirmOpen(false)}
                  >
                    Cancel
                  </button>

                  <button
                    className="diary-delete-button"
                    onClick={handleConfirmDeleteDiary}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
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
                    {updateModalType !== 'latest' && updateModalType !== 'ready' && (
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