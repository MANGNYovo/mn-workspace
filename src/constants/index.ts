import type {
  AccentColor, ProgramItem, ProgramType, HomeMusicPlaylist, PlaylistTrack, DiaryEntry, AppSettings,
  PlaylistCoverOverrideMap, ResolvedTheme,
} from '../types'

// ─── 이미지 imports ───────────────────────────────────────────────────────────

import logoPurple from '../assets/logo-purple.png'
import logoBlue from '../assets/logo-blue.png'
import logoGreen from '../assets/logo-green.png'
import logoOrange from '../assets/logo-orange.png'
import logoRed from '../assets/logo-red.png'
import logoGray from '../assets/logo-gray.png'

import rocketPurple from '../assets/rocket-purple.png'
import rocketBlue from '../assets/rocket-blue.png'
import rocketGreen from '../assets/rocket-green.png'
import rocketOrange from '../assets/rocket-orange.png'
import rocketRed from '../assets/rocket-red.png'
import rocketGray from '../assets/rocket-gray.png'

import dashboardPurple from '../assets/dashboard-purple.png'
import dashboardBlue from '../assets/dashboard-blue.png'
import dashboardGreen from '../assets/dashboard-green.png'
import dashboardOrange from '../assets/dashboard-orange.png'
import dashboardRed from '../assets/dashboard-red.png'
import dashboardGray from '../assets/dashboard-gray.png'
import dashboardWhite from '../assets/dashboard-white.png'

import programsPurple from '../assets/programs-purple.png'
import programsBlue from '../assets/programs-blue.png'
import programsGreen from '../assets/programs-green.png'
import programsOrange from '../assets/programs-orange.png'
import programsRed from '../assets/programs-red.png'
import programsGray from '../assets/programs-gray.png'
import programsWhite from '../assets/programs-white.png'

import settingsPurple from '../assets/settings-purple.png'
import settingsBlue from '../assets/settings-blue.png'
import settingsGreen from '../assets/settings-green.png'
import settingsOrange from '../assets/settings-orange.png'
import settingsRed from '../assets/settings-red.png'
import settingsGray from '../assets/settings-gray.png'
import settingsWhite from '../assets/settings-white.png'

import timePurple from '../assets/time-purple.png'
import timeBlue from '../assets/time-blue.png'
import timeGreen from '../assets/time-green.png'
import timeOrange from '../assets/time-orange.png'
import timeRed from '../assets/time-red.png'
import timeGray from '../assets/time-gray.png'
import timeWhite from '../assets/time-white.png'

import presetPurple from '../assets/preset-purple.png'
import presetBlue from '../assets/preset-blue.png'
import presetGreen from '../assets/preset-green.png'
import presetOrange from '../assets/preset-orange.png'
import presetRed from '../assets/preset-red.png'
import presetGray from '../assets/preset-gray.png'
import presetWhite from '../assets/preset-white.png'

import speakerPurple from '../assets/speaker-purple.png'
import speakerBlue from '../assets/speaker-blue.png'
import speakerGreen from '../assets/speaker-green.png'
import speakerOrange from '../assets/speaker-orange.png'
import speakerRed from '../assets/speaker-red.png'
import speakerGray from '../assets/speaker-gray.png'
import speakerWhite from '../assets/speaker-white.png'

import headphonePurple from '../assets/headphone-purple.png'
import headphoneBlue from '../assets/headphone-blue.png'
import headphoneGreen from '../assets/headphone-green.png'
import headphoneOrange from '../assets/headphone-orange.png'
import headphoneRed from '../assets/headphone-red.png'
import headphoneGray from '../assets/headphone-gray.png'
import headphoneWhite from '../assets/headphone-white.png'

import hmonitorPurple from '../assets/hmonitor-purple.png'
import hmonitorBlue from '../assets/hmonitor-blue.png'
import hmonitorGreen from '../assets/hmonitor-green.png'
import hmonitorOrange from '../assets/hmonitor-orange.png'
import hmonitorRed from '../assets/hmonitor-red.png'
import hmonitorGray from '../assets/hmonitor-gray.png'
import hmonitorWhite from '../assets/hmonitor-white.png'

import vmonitorPurple from '../assets/vmonitor-purple.png'
import vmonitorBlue from '../assets/vmonitor-blue.png'
import vmonitorGreen from '../assets/vmonitor-green.png'
import vmonitorOrange from '../assets/vmonitor-orange.png'
import vmonitorRed from '../assets/vmonitor-red.png'
import vmonitorGray from '../assets/vmonitor-gray.png'
import vmonitorWhite from '../assets/vmonitor-white.png'

import checkPurple from '../assets/check-purple.png'
import checkBlue from '../assets/check-blue.png'
import checkGreen from '../assets/check-green.png'
import checkOrange from '../assets/check-orange.png'
import checkRed from '../assets/check-red.png'
import checkGray from '../assets/check-gray.png'
import checkWhite from '../assets/check-white.png'

import datePurple from '../assets/date-purple.png'
import dateBlue from '../assets/date-blue.png'
import dateGreen from '../assets/date-green.png'
import dateOrange from '../assets/date-orange.png'
import dateRed from '../assets/date-red.png'
import dateGray from '../assets/date-gray.png'
import dateWhite from '../assets/date-white.png'

import searchPurple from '../assets/search-purple.png'
import searchBlue from '../assets/search-blue.png'
import searchGreen from '../assets/search-green.png'
import searchOrange from '../assets/search-orange.png'
import searchRed from '../assets/search-red.png'
import searchGray from '../assets/search-gray.png'
import searchWhite from '../assets/search-white.png'

import listPurple from '../assets/list-purple.png'
import listBlue from '../assets/list-blue.png'
import listGreen from '../assets/list-green.png'
import listOrange from '../assets/list-orange.png'
import listRed from '../assets/list-red.png'
import listGray from '../assets/list-gray.png'
import listWhite from '../assets/list-white.png'

import gridPurple from '../assets/grid-purple.png'
import gridBlue from '../assets/grid-blue.png'
import gridGreen from '../assets/grid-green.png'
import gridOrange from '../assets/grid-orange.png'
import gridRed from '../assets/grid-red.png'
import gridGray from '../assets/grid-gray.png'
import gridWhite from '../assets/grid-white.png'

import playlistPurple from '../assets/playlist-purple.png'
import playlistBlue from '../assets/playlist-blue.png'
import playlistGreen from '../assets/playlist-green.png'
import playlistOrange from '../assets/playlist-orange.png'
import playlistRed from '../assets/playlist-red.png'
import playlistGray from '../assets/playlist-gray.png'
import playlistWhite from '../assets/playlist-white.png'

import shufflePurple from '../assets/shuffle-purple.png'
import shuffleBlue from '../assets/shuffle-blue.png'
import shuffleGreen from '../assets/shuffle-green.png'
import shuffleOrange from '../assets/shuffle-orange.png'
import shuffleRed from '../assets/shuffle-red.png'
import shuffleGray from '../assets/shuffle-gray.png'
import shuffleWhite from '../assets/shuffle-white.png'

import likedPurple from '../assets/liked-purple.png'
import likedBlue from '../assets/liked-blue.png'
import likedGreen from '../assets/liked-green.png'
import likedOrange from '../assets/liked-orange.png'
import likedRed from '../assets/liked-red.png'
import likedGray from '../assets/liked-gray.png'
import likedWhite from '../assets/liked-white.png'

import prelikedPurple from '../assets/preliked-purple.png'
import prelikedBlue from '../assets/preliked-blue.png'
import prelikedGreen from '../assets/preliked-green.png'
import prelikedOrange from '../assets/preliked-orange.png'
import prelikedRed from '../assets/preliked-red.png'
import prelikedGray from '../assets/preliked-gray.png'
import prelikedWhite from '../assets/preliked-white.png'

import startPurple from '../assets/start-purple.png'
import startBlue from '../assets/start-blue.png'
import startGreen from '../assets/start-green.png'
import startOrange from '../assets/start-orange.png'
import startRed from '../assets/start-red.png'
import startGray from '../assets/start-gray.png'
import startWhite from '../assets/start-white.png'

import pausePurple from '../assets/pause-purple.png'
import pauseBlue from '../assets/pause-blue.png'
import pauseGreen from '../assets/pause-green.png'
import pauseOrange from '../assets/pause-orange.png'
import pauseRed from '../assets/pause-red.png'
import pauseGray from '../assets/pause-gray.png'
import pauseWhite from '../assets/pause-white.png'

import maxPurple from '../assets/max-purple.png'
import maxBlue from '../assets/max-blue.png'
import maxGreen from '../assets/max-green.png'
import maxOrange from '../assets/max-orange.png'
import maxRed from '../assets/max-red.png'
import maxGray from '../assets/max-gray.png'
import maxWhite from '../assets/max-white.png'

import darkPurple from '../assets/dark-purple.png'
import darkBlue from '../assets/dark-blue.png'
import darkGreen from '../assets/dark-green.png'
import darkOrange from '../assets/dark-orange.png'
import darkRed from '../assets/dark-red.png'
import darkGray from '../assets/dark-gray.png'
import darkWhite from '../assets/dark-white.png'

import lightPurple from '../assets/light-purple.png'
import lightBlue from '../assets/light-blue.png'
import lightGreen from '../assets/light-green.png'
import lightOrange from '../assets/light-orange.png'
import lightRed from '../assets/light-red.png'
import lightGray from '../assets/light-gray.png'
import lightWhite from '../assets/light-white.png'

export { default as writeIcon } from '../assets/write.png'
export { default as saveIcon } from '../assets/save.png'
export { default as trashIcon } from '../assets/trash.png'
export { default as youtubeMusicIcon } from '../assets/youtubemusic.png'
export { default as googleIcon } from '../assets/google.png'
export { default as rocketActive } from '../assets/rocket-active.png'

// ─── 색상 맵 ─────────────────────────────────────────────────────────────────

export const accentColorMap: Record<AccentColor, string> = {
  purple: '#705bff',
  blue: '#0b8ee8',
  green: '#18c77a',
  orange: '#ff8a1f',
  red: '#ff5151',
  gray: '#9aa0b8',
}

export const accentRingMap: Record<AccentColor, string> = {
  purple: 'rgba(112, 91, 255, 0.28)',
  blue: 'rgba(11, 142, 232, 0.28)',
  green: 'rgba(24, 199, 122, 0.28)',
  orange: 'rgba(255, 138, 31, 0.28)',
  red: 'rgba(255, 81, 81, 0.28)',
  gray: 'rgba(154, 160, 184, 0.32)',
}

export const logoMap: Record<AccentColor, string> = {
  purple: logoPurple,
  blue: logoBlue,
  green: logoGreen,
  orange: logoOrange,
  red: logoRed,
  gray: logoGray,
}

export const rocketMap: Record<AccentColor, string> = {
  purple: rocketPurple,
  blue: rocketBlue,
  green: rocketGreen,
  orange: rocketOrange,
  red: rocketRed,
  gray: rocketGray,
}

export const iconMap = {
  dashboard: { purple: dashboardPurple, blue: dashboardBlue, green: dashboardGreen, orange: dashboardOrange, red: dashboardRed, gray: dashboardGray, white: dashboardWhite },
  programs:  { purple: programsPurple,  blue: programsBlue,  green: programsGreen,  orange: programsOrange,  red: programsRed,  gray: programsGray,  white: programsWhite  },
  settings:  { purple: settingsPurple,  blue: settingsBlue,  green: settingsGreen,  orange: settingsOrange,  red: settingsRed,  gray: settingsGray,  white: settingsWhite  },
  time:      { purple: timePurple,      blue: timeBlue,      green: timeGreen,      orange: timeOrange,      red: timeRed,      gray: timeGray,      white: timeWhite      },
  preset:    { purple: presetPurple,    blue: presetBlue,    green: presetGreen,    orange: presetOrange,    red: presetRed,    gray: presetGray,    white: presetWhite    },
  speaker:   { purple: speakerPurple,   blue: speakerBlue,   green: speakerGreen,   orange: speakerOrange,   red: speakerRed,   gray: speakerGray,   white: speakerWhite   },
  headphone: { purple: headphonePurple, blue: headphoneBlue, green: headphoneGreen, orange: headphoneOrange, red: headphoneRed, gray: headphoneGray, white: headphoneWhite },
  hmonitor:  { purple: hmonitorPurple,  blue: hmonitorBlue,  green: hmonitorGreen,  orange: hmonitorOrange,  red: hmonitorRed,  gray: hmonitorGray,  white: hmonitorWhite  },
  vmonitor:  { purple: vmonitorPurple,  blue: vmonitorBlue,  green: vmonitorGreen,  orange: vmonitorOrange,  red: vmonitorRed,  gray: vmonitorGray,  white: vmonitorWhite  },
  check:     { purple: checkPurple,     blue: checkBlue,     green: checkGreen,     orange: checkOrange,     red: checkRed,     gray: checkGray,     white: checkWhite     },
  date:      { purple: datePurple,      blue: dateBlue,      green: dateGreen,      orange: dateOrange,      red: dateRed,      gray: dateGray,      white: dateWhite      },
} as const

export const musicControlIconMap = {
  search:   { purple: searchPurple,   blue: searchBlue,   green: searchGreen,   orange: searchOrange,   red: searchRed,   gray: searchGray,   white: searchWhite   },
  list:     { purple: listPurple,     blue: listBlue,     green: listGreen,     orange: listOrange,     red: listRed,     gray: listGray,     white: listWhite     },
  grid:     { purple: gridPurple,     blue: gridBlue,     green: gridGreen,     orange: gridOrange,     red: gridRed,     gray: gridGray,     white: gridWhite     },
  playlist: { purple: playlistPurple, blue: playlistBlue, green: playlistGreen, orange: playlistOrange, red: playlistRed, gray: playlistGray, white: playlistWhite },
  shuffle:  { purple: shufflePurple,  blue: shuffleBlue,  green: shuffleGreen,  orange: shuffleOrange,  red: shuffleRed,  gray: shuffleGray,  white: shuffleWhite  },
} as const

export const likedIconMap = {
  purple: likedPurple, blue: likedBlue, green: likedGreen,
  orange: likedOrange, red: likedRed, gray: likedGray, white: likedWhite,
} as const

export const prelikedIconMap = {
  purple: prelikedPurple, blue: prelikedBlue, green: prelikedGreen,
  orange: prelikedOrange, red: prelikedRed, gray: prelikedGray, white: prelikedWhite,
} as const

export const playbackIconMap = {
  start: { purple: startPurple, blue: startBlue, green: startGreen, orange: startOrange, red: startRed, gray: startGray, white: startWhite },
  pause: { purple: pausePurple, blue: pauseBlue, green: pauseGreen, orange: pauseOrange, red: pauseRed, gray: pauseGray, white: pauseWhite },
  max:   { purple: maxPurple,   blue: maxBlue,   green: maxGreen,   orange: maxOrange,   red: maxRed,   gray: maxGray,   white: maxWhite   },
} as const

export const themeIconMap = {
  dark:  { purple: darkPurple,  blue: darkBlue,  green: darkGreen,  orange: darkOrange,  red: darkRed,  gray: darkGray,  white: darkWhite  },
  light: { purple: lightPurple, blue: lightBlue, green: lightGreen, orange: lightOrange, red: lightRed, gray: lightGray, white: lightWhite },
} as const

// ─── 기본 데이터 ──────────────────────────────────────────────────────────────

export const fallbackHomeMusicPlaylists: HomeMusicPlaylist[] = [
  { id: 'focus',         name: 'Focus',         tracks: 24, mood: 'Work playlist',  duration: '2h 43m' },
  { id: 'morning-boost', name: 'Morning Boost',  tracks: 18, mood: 'Start the day',  duration: '1h 52m' },
  { id: 'chill-vibes',   name: 'Chill Vibes',    tracks: 31, mood: 'Relax mood',     duration: '3h 14m' },
  { id: 'deep-focus',    name: 'Deep Focus',     tracks: 42, mood: 'Long session',   duration: '4h 21m' },
  { id: 'night-drive',   name: 'Night Drive',    tracks: 26, mood: 'Night playlist', duration: '2h 36m' },
  { id: 'study-session', name: 'Study Session',  tracks: 30, mood: 'Study playlist', duration: '3h 02m' },
]

export const fallbackPlaylistTracks: PlaylistTrack[] = [
  { id: 'lofi-girl',       title: 'Lofi Girl',       artist: 'Lofi Hip Hop Radio',  duration: '2:31', coverClass: 'track-cover-purple'     },
  { id: 'snowfall',        title: 'Snowfall',         artist: '@neheart, reidenshi', duration: '3:12', coverClass: 'track-cover-sunset'     },
  { id: 'night-drive',     title: 'Night Drive',      artist: 'FM-84',               duration: '4:01', coverClass: 'track-cover-dark'       },
  { id: 'reflection',      title: 'Reflection',       artist: 'Idealism',            duration: '2:45', coverClass: 'track-cover-city'       },
  { id: 'remember',        title: 'Remember',         artist: 'Kina',                duration: '3:33', coverClass: 'track-cover-rain'       },
  { id: 'after-rain',      title: 'After Rain',       artist: 'Aso',                 duration: '3:05', coverClass: 'track-cover-after-rain' },
  { id: 'late-night-talks',title: 'Late Night Talks', artist: 'tombcumpz',           duration: '2:58', coverClass: 'track-cover-night'      },
  { id: 'daydream',        title: 'Daydream',         artist: 'jijjeremiah',         duration: '3:47', coverClass: 'track-cover-daydream'   },
  { id: 'soft-light',      title: 'Soft Light',       artist: 'Kupla',               duration: '2:36', coverClass: 'track-cover-forest'     },
  { id: 'city-lights',     title: 'City Lights',      artist: 'saib.',               duration: '3:21', coverClass: 'track-cover-city-light' },
]

export const initialPrograms: ProgramItem[] = [
  { id: 'photoshop',     name: 'Adobe Photoshop 2024', path: 'C:\\Program Files\\Adobe\\Adobe Photoshop 2024\\Photoshop.exe', type: 'Program', iconClass: 'ps',     icon: 'Ps', iconImage: null, enabled: true },
  { id: 'chrome',        name: 'Google Chrome',        path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',    type: 'Program', iconClass: 'chrome', icon: '🌐', iconImage: null, enabled: true },
  { id: 'work-folder',   name: 'Work Folder',          path: 'D:\\MN Workspace',                                              type: 'Folder',  iconClass: 'folder', icon: '📁', iconImage: null, enabled: true },
  { id: 'youtube-music', name: 'YouTube Music',        path: 'https://music.youtube.com',                                     type: 'URL',     iconClass: 'music',  icon: '▶', iconImage: null, enabled: true },
]

export const defaultSettings: AppSettings = {
  startWithWindows: false,
  minimizeToTray: false,
  checkForUpdates: true,
  launchDelay: '1 second',
  launchBehavior: 'Launch in order',
  stopLaunchingOnError: false,
  theme: 'Light',
  customWallpaper: null,
  customWallpaperName: null,
  customWallpaperTheme: 'dark',
  customWallpaperHistory: [],
  accentColor: 'purple',
  musicVolume: 58,
  musicPlaylistOrder: [],
  playlistViewMode: 'list',
  floatingPlayerMode: 'expanded',
  floatingPlayerHidden: false,
  floatingPlayerPosition: null,
  lastTrack: null,
}

export const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const calendarWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const initialDiaryEntries: Record<string, DiaryEntry> = {}

// ─── 헬퍼 함수 ───────────────────────────────────────────────────────────────

export function getProgramIcon(type: ProgramType) {
  if (type === 'Folder') return { icon: '📁', iconClass: 'folder' }
  if (type === 'URL')    return { icon: '🌐', iconClass: 'chrome' }
  return { icon: 'App', iconClass: 'ps' }
}

export function getNameFromPath(filePath: string) {
  const fileName = filePath.split('\\').pop() ?? filePath
  return fileName.replace(/\.[^/.]+$/, '')
}

export function createId() {
  if (crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random()}`
}

export function getProgramPresets(program: ProgramItem) {
  if (Array.isArray(program.presets) && program.presets.length > 0) return program.presets
  return [1]
}

export function formatDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getWriteDiaryTitleParts(date: Date) {
  return {
    monthDay: `${monthNames[date.getMonth()]} ${date.getDate()}`,
    year: date.getFullYear(),
  }
}

export function formatDiaryMonthTitle(date: Date) {
  return monthNames[date.getMonth()]
}

export function isSameDate(a: Date, b: Date) {
  return formatDateKey(a) === formatDateKey(b)
}

export function createMonthDate(baseDate: Date, monthOffset: number) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth() + monthOffset, 1)
}

export function getDiaryCalendarDays(baseDate: Date) {
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const startDate = new Date(year, month, 1 - firstDay.getDay())
  return Array.from({ length: 35 }, (_, i) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    return date
  })
}

export function isCurrentMonth(date: Date, baseDate: Date) {
  return date.getFullYear() === baseDate.getFullYear() &&
    date.getMonth() === baseDate.getMonth()
}

export function parseDurationToSeconds(duration: string): number {
  const parts = duration.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

// ─── 타입 가드 ────────────────────────────────────────────────────────────────

export function isProgramList(value: unknown): value is ProgramItem[] {
  if (!Array.isArray(value)) return false
  return value.every((item) => {
    if (!item || typeof item !== 'object') return false
    const p = item as ProgramItem
    return typeof p.id === 'string' && typeof p.name === 'string' &&
      typeof p.path === 'string' && typeof p.type === 'string' &&
      typeof p.iconClass === 'string' && typeof p.icon === 'string' &&
      typeof p.enabled === 'boolean'
  })
}

export function isSettings(value: unknown): value is AppSettings {
  if (!value || typeof value !== 'object') return false
  const s = value as AppSettings
  return typeof s.startWithWindows === 'boolean' &&
    typeof s.minimizeToTray === 'boolean' &&
    typeof s.checkForUpdates === 'boolean' &&
    typeof s.launchDelay === 'string' &&
    typeof s.launchBehavior === 'string' &&
    typeof s.stopLaunchingOnError === 'boolean' &&
    typeof s.theme === 'string' &&
    (s.customWallpaper === undefined || s.customWallpaper === null || typeof s.customWallpaper === 'string') &&
    (s.customWallpaperName === undefined || s.customWallpaperName === null || typeof s.customWallpaperName === 'string') &&
    (s.customWallpaperTheme === undefined || s.customWallpaperTheme === 'light' || s.customWallpaperTheme === 'dark') &&
    (s.customWallpaperHistory === undefined || (Array.isArray(s.customWallpaperHistory) && s.customWallpaperHistory.every((item) => {
      if (!item || typeof item !== 'object') return false
      const w = item as { image?: unknown; name?: unknown; savedAt?: unknown }
      return typeof w.image === 'string' && typeof w.name === 'string' && typeof w.savedAt === 'string'
    }))) &&
    typeof s.accentColor === 'string'
}

export function isDiaryEntries(value: unknown): value is Record<string, DiaryEntry> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.values(value).every((item) => {
    if (!item || typeof item !== 'object') return false
    const d = item as DiaryEntry
    return typeof d.date === 'string' && typeof d.content === 'string' &&
      typeof d.createdAt === 'string' && typeof d.updatedAt === 'string'
  })
}

export function isHomeMusicPlaylistList(value: unknown): value is HomeMusicPlaylist[] {
  if (!Array.isArray(value)) return false
  return value.every((item) => {
    if (!item || typeof item !== 'object') return false
    const p = item as HomeMusicPlaylist
    return typeof p.id === 'string' && typeof p.name === 'string'
  })
}

export function applyHomeMusicPlaylistOrder(
  playlists: HomeMusicPlaylist[],
  savedOrder?: string[],
) {
  if (!Array.isArray(savedOrder) || savedOrder.length === 0) return playlists
  const orderMap = new Map(savedOrder.map((id, i) => [id, i]))
  return [...playlists].sort((a, b) => {
    const ai = orderMap.get(a.id)
    const bi = orderMap.get(b.id)
    if (ai === undefined && bi === undefined) return 0
    if (ai === undefined) return 1
    if (bi === undefined) return -1
    return ai - bi
  })
}

export function createFreshImageUrl(imageUrl?: string, reloadKey = Date.now()) {
  if (!imageUrl) return imageUrl
  const hashIndex = imageUrl.indexOf('#')
  const base = hashIndex >= 0 ? imageUrl.slice(0, hashIndex) : imageUrl
  const hash = hashIndex >= 0 ? imageUrl.slice(hashIndex) : ''
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}mnReload=${reloadKey}${hash}`
}

export function refreshHomeMusicPlaylistThumbnails(
  playlists: HomeMusicPlaylist[],
  reloadKey = Date.now(),
) {
  return playlists.map((p) => ({
    ...p,
    thumbnail: createFreshImageUrl(p.thumbnail, reloadKey),
  }))
}

export const hiddenHomeMusicPlaylistNames = ['공부']

export function filterHiddenHomeMusicPlaylists(playlists: HomeMusicPlaylist[]) {
  return playlists.filter(
    (p) => !hiddenHomeMusicPlaylistNames.includes(p.name.trim()),
  )
}

export function getPlaylistCoverForTheme(
  coverOverrides: PlaylistCoverOverrideMap,
  playlistId: string,
  theme: ResolvedTheme,
) {
  const coverOverride = coverOverrides[playlistId]

  if (!coverOverride) return undefined
  if (typeof coverOverride === 'string') return coverOverride

  return coverOverride[theme] ?? coverOverride.light ?? coverOverride.dark
}

export function applyHomeMusicPlaylistCoverOverrides(
  playlists: HomeMusicPlaylist[],
  coverOverrides: PlaylistCoverOverrideMap,
  theme: ResolvedTheme,
) {
  return playlists.map((p) => ({
    ...p,
    customThumbnail: getPlaylistCoverForTheme(coverOverrides, p.id, theme),
  }))
}
