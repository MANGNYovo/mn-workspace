import { app, BrowserWindow, dialog, ipcMain, shell, Tray, Menu } from 'electron'
import { autoUpdater } from 'electron-updater'
import { execFile } from 'node:child_process'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import dotenv from 'dotenv'
import { google } from 'googleapis'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

// 개발: 프로젝트 루트, 빌드: exe 옆(.env가 extraFiles로 포함됨)
const envPaths = [
  path.join(process.env.APP_ROOT, '.env'),              // 개발환경 (프로젝트 루트)
  path.join(path.dirname(app.getPath('exe')), '.env'),  // 빌드된 앱 (exe 옆)
]

for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath })
  if (!result.error) break
}

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null
let tray: Tray | null = null
let minimizeToTray = false
let isQuitting = false
let startedAtLogin = app.getLoginItemSettings().wasOpenedAtLogin

autoUpdater.autoDownload = false

// YouTube embed autoplay/audio가 설치 빌드에서도 사용자 제스처 없이 동작하도록 고정
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

// ─── YouTube Data API v3 ────────────────────────────────────────────────────

const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID?.trim() ?? ''
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET?.trim() ?? ''
const YOUTUBE_REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'
const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
]

function getYoutubeTokenPath() {
  return path.join(app.getPath('userData'), 'youtube-token.json')
}

function getPlaylistCachePath() {
  return path.join(app.getPath('userData'), 'playlist-cache.json')
}

function getPlaylistCoverMapPath() {
  return path.join(app.getPath('userData'), 'playlist-cover-map.json')
}

function getPlaylistCoverDirPath() {
  return path.join(app.getPath('userData'), 'playlist-covers')
}

function sanitizePlaylistCoverFileName(playlistId: string) {
  return playlistId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) || 'playlist-cover'
}

function getPlaylistCoverMimeType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase()

  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg'
  if (extension === '.webp') return 'image/webp'

  return 'image/png'
}

async function createPlaylistCoverDataUrl(filePath: string) {
  const data = await fs.readFile(filePath)
  const mimeType = getPlaylistCoverMimeType(filePath)

  return `data:${mimeType};base64,${data.toString('base64')}`
}


// ─── Production renderer server ──────────────────────────────────────────────
// dev는 Vite dev server(http://localhost)라 YouTube iframe postMessage/audio가 정상인데,
// 설치 빌드는 file:// 로 열리면 YouTube iframe API와 origin 처리가 불안정해질 수 있다.
// 그래서 빌드된 dist를 127.0.0.1 임시 HTTP origin으로 서빙한다.
let rendererStaticServer: Server | null = null
let rendererStaticServerUrl = ''

const rendererMimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function createRendererFilePath(requestUrl: string) {
  const url = new URL(requestUrl, 'http://127.0.0.1')
  const decodedPathname = decodeURIComponent(url.pathname)
  const relativePathname = decodedPathname === '/' ? 'index.html' : decodedPathname.replace(/^\/+/, '')
  const requestedFilePath = path.join(RENDERER_DIST, relativePathname)
  const relativeToRendererDist = path.relative(RENDERER_DIST, requestedFilePath)

  if (relativeToRendererDist.startsWith('..') || path.isAbsolute(relativeToRendererDist)) {
    return path.join(RENDERER_DIST, 'index.html')
  }

  return requestedFilePath
}

function sendRendererFile(response: ServerResponse, filePath: string, data: Buffer) {
  const mimeType = rendererMimeTypes[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
  response.writeHead(200, {
    'Content-Type': mimeType,
    'Cache-Control': 'no-cache',
  })
  response.end(data)
}

async function handleRendererRequest(request: IncomingMessage, response: ServerResponse) {
  let filePath = createRendererFilePath(request.url ?? '/')

  try {
    const data = await fs.readFile(filePath)
    sendRendererFile(response, filePath, data)
  } catch {
    try {
      filePath = path.join(RENDERER_DIST, 'index.html')
      const data = await fs.readFile(filePath)
      sendRendererFile(response, filePath, data)
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end('Not found')
    }
  }
}

function getRendererStaticServerUrl() {
  return new Promise<string>((resolve, reject) => {
    if (rendererStaticServerUrl) {
      resolve(rendererStaticServerUrl)
      return
    }

    rendererStaticServer = createServer((request, response) => {
      void handleRendererRequest(request, response)
    })

    rendererStaticServer.once('error', reject)
    rendererStaticServer.listen(0, '127.0.0.1', () => {
      const address = rendererStaticServer?.address()

      if (!address || typeof address === 'string') {
        reject(new Error('Failed to start renderer static server.'))
        return
      }

      rendererStaticServerUrl = `http://127.0.0.1:${address.port}/index.html`
      resolve(rendererStaticServerUrl)
    })
  })
}

async function loadPlaylistCoverMap() {
  try {
    const data = await fs.readFile(getPlaylistCoverMapPath(), 'utf-8')
    const parsed = JSON.parse(data)

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }

    return parsed as Record<string, string>
  } catch {
    return {}
  }
}

async function savePlaylistCoverMap(coverMap: Record<string, string>) {
  await fs.writeFile(
    getPlaylistCoverMapPath(),
    JSON.stringify(coverMap, null, 2),
    'utf-8',
  )
}

async function createPlaylistCoverDataUrlMap() {
  const coverMap = await loadPlaylistCoverMap()
  const result: Record<string, string> = {}

  for (const [playlistId, filePath] of Object.entries(coverMap)) {
    try {
      await fs.access(filePath)
      result[playlistId] = await createPlaylistCoverDataUrl(filePath)
    } catch {
      // 파일이 사라진 경우 무시
    }
  }

  return result
}

function createOAuthClient() {
  if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET) {
    throw new Error('Missing YouTube OAuth credentials. Check your .env file.')
  }

  return new google.auth.OAuth2(
    YOUTUBE_CLIENT_ID,
    YOUTUBE_CLIENT_SECRET,
    YOUTUBE_REDIRECT_URI,
  )
}

async function loadYoutubeToken() {
  try {
    const data = await fs.readFile(getYoutubeTokenPath(), 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

async function saveYoutubeToken(token: object) {
  await fs.writeFile(getYoutubeTokenPath(), JSON.stringify(token, null, 2), 'utf-8')
}

async function getAuthenticatedClient() {
  const oauth2Client = createOAuthClient()
  const token = await loadYoutubeToken()

  if (!token) return null

  oauth2Client.setCredentials(token)

  // 토큰 갱신 시 자동 저장
  oauth2Client.on('tokens', async (newTokens) => {
    const merged = { ...token, ...newTokens }
    await saveYoutubeToken(merged)
    oauth2Client.setCredentials(merged)
  })

  return oauth2Client
}

// ───────────────────────────────────────────────────────────────────────────

function getProgramsFilePath() {
  return path.join(app.getPath('userData'), 'programs.json')
}

function getSettingsFilePath() {
  return path.join(app.getPath('userData'), 'settings.json')
}

function getDiariesFilePath() {
  return path.join(app.getPath('userData'), 'diaries.json')
}

function getLikedTracksFilePath() {
  return path.join(app.getPath('userData'), 'liked-tracks.json')
}

async function readJsonFile(filePath: string) {
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    const trimmedData = data.trim()

    if (!trimmedData) {
      return null
    }

    return JSON.parse(trimmedData)
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      console.error(`Failed to read JSON file: ${filePath}`, error)
    }

    return null
  }
}

const jsonWriteQueues = new Map<string, Promise<void>>()

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function isTemporaryFileAccessError(error: unknown) {
  const code = (error as { code?: string })?.code

  return code === 'EPERM' || code === 'EACCES' || code === 'EBUSY'
}

async function replaceFileWithRetry(tempFilePath: string, filePath: string) {
  let lastError: unknown = null

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await fs.rename(tempFilePath, filePath)
      return
    } catch (error) {
      if (!isTemporaryFileAccessError(error)) {
        throw error
      }

      lastError = error
      await wait(80 * (attempt + 1))
    }
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await fs.copyFile(tempFilePath, filePath)
      await fs.unlink(tempFilePath).catch(() => undefined)
      return
    } catch (error) {
      if (!isTemporaryFileAccessError(error)) {
        throw error
      }

      lastError = error
      await wait(80 * (attempt + 1))
    }
  }

  throw lastError
}

async function writeJsonFileDirect(filePath: string, value: unknown) {
  const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.${Math.random()
    .toString(36)
    .slice(2)}.tmp`
  const data = JSON.stringify(value, null, 2)

  await fs.mkdir(path.dirname(filePath), { recursive: true })

  try {
    await fs.writeFile(tempFilePath, data, 'utf-8')
    await replaceFileWithRetry(tempFilePath, filePath)
  } catch (error) {
    try {
      await fs.unlink(tempFilePath)
    } catch {
      // 임시 파일이 이미 없으면 무시
    }

    throw error
  }
}

async function writeJsonFile(filePath: string, value: unknown) {
  const previousWrite = jsonWriteQueues.get(filePath) ?? Promise.resolve()

  const nextWrite = previousWrite
    .catch(() => undefined)
    .then(() => writeJsonFileDirect(filePath, value))

  jsonWriteQueues.set(filePath, nextWrite)

  try {
    await nextWrite
  } finally {
    if (jsonWriteQueues.get(filePath) === nextWrite) {
      jsonWriteQueues.delete(filePath)
    }
  }
}

function runPowerShell(command: string) {
  return new Promise<{
    success: boolean
    stdout: string
    stderr: string
    error?: string
  }>((resolve) => {
    execFile(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        command,
      ],
      {
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        resolve({
          success: !error,
          stdout,
          stderr,
          error: error ? String(error) : undefined,
        })
      },
    )
  })
}

function getMonitorCommand(orientation: 'horizontal' | 'vertical') {
  const isHorizontal = orientation === 'horizontal'

  const displayOrientation = isHorizontal ? 0 : 1
  const width = isHorizontal ? 1920 : 1080
  const height = isHorizontal ? 1080 : 1920

  let positionX: number
  let positionY: number

  if (isHorizontal) {
    positionX = -1920
    positionY = -120
  } else {
    positionX = -1080
    positionY = -580
  }

  return String.raw`
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class DisplayHelper2 {
    [DllImport("user32.dll", CharSet = CharSet.Ansi)]
    public static extern bool EnumDisplaySettings(string deviceName, int modeNum, ref DEVMODE2 devMode);
    [DllImport("user32.dll", CharSet = CharSet.Ansi)]
    public static extern int ChangeDisplaySettingsEx(string deviceName, ref DEVMODE2 devMode, IntPtr hwnd, int flags, IntPtr lParam);
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi, Pack = 1)]
    public struct DEVMODE2 {
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmDeviceName;
        public ushort dmSpecVersion;
        public ushort dmDriverVersion;
        public ushort dmSize;
        public ushort dmDriverExtra;
        public uint dmFields;
        public int dmPositionX;
        public int dmPositionY;
        public uint dmDisplayOrientation;
        public uint dmDisplayFixedOutput;
        public short dmColor;
        public short dmDuplex;
        public short dmYResolution;
        public short dmTTOption;
        public short dmCollate;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmFormName;
        public ushort dmLogPixels;
        public uint dmBitsPerPel;
        public uint dmPelsWidth;
        public uint dmPelsHeight;
        public uint dmDisplayFlags;
        public uint dmDisplayFrequency;
    }
}
'@

$dm = New-Object DisplayHelper2+DEVMODE2
$dm.dmSize = [System.Runtime.InteropServices.Marshal]::SizeOf($dm)
$ok = [DisplayHelper2]::EnumDisplaySettings("\\.\DISPLAY2", -1, [ref]$dm)

if (-not $ok) {
  Write-Host "DISPLAY2 설정 읽기 실패"
  exit 1
}

$dm.dmDisplayOrientation = ${displayOrientation}
$dm.dmPelsWidth = ${width}
$dm.dmPelsHeight = ${height}
$dm.dmPositionX = ${positionX}
$dm.dmPositionY = ${positionY}
$dm.dmFields = 0x001800A0

$flags = 0x00000001
$result = [DisplayHelper2]::ChangeDisplaySettingsEx("\\.\DISPLAY2", [ref]$dm, [IntPtr]::Zero, $flags, [IntPtr]::Zero)
Write-Host "결과: $result"

if ($result -ne 0) {
  exit 1
}
`
}

function getCurrentMonitorCommand() {
  return String.raw`
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class DisplayHelper2 {
    [DllImport("user32.dll", CharSet = CharSet.Ansi)]
    public static extern bool EnumDisplaySettings(string deviceName, int modeNum, ref DEVMODE2 devMode);
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi, Pack = 1)]
    public struct DEVMODE2 {
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmDeviceName;
        public ushort dmSpecVersion;
        public ushort dmDriverVersion;
        public ushort dmSize;
        public ushort dmDriverExtra;
        public uint dmFields;
        public int dmPositionX;
        public int dmPositionY;
        public uint dmDisplayOrientation;
        public uint dmDisplayFixedOutput;
        public short dmColor;
        public short dmDuplex;
        public short dmYResolution;
        public short dmTTOption;
        public short dmCollate;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmFormName;
        public ushort dmLogPixels;
        public uint dmBitsPerPel;
        public uint dmPelsWidth;
        public uint dmPelsHeight;
        public uint dmDisplayFlags;
        public uint dmDisplayFrequency;
    }
}
'@

$dm = New-Object DisplayHelper2+DEVMODE2
$dm.dmSize = [System.Runtime.InteropServices.Marshal]::SizeOf($dm)
$ok = [DisplayHelper2]::EnumDisplaySettings("\\.\DISPLAY2", -1, [ref]$dm)

if (-not $ok) {
  Write-Host "DISPLAY2 설정 읽기 실패"
  exit 1
}

Write-Host $dm.dmDisplayOrientation
`
}

function createTray() {
  if (tray) return

  tray = new Tray(path.join(process.env.VITE_PUBLIC, 'tray-icon.png'))

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open MN WORKSPACE',
      click: () => {
        win?.show()
        win?.focus()
      },
    },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setToolTip('MN WORKSPACE')
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    win?.show()
    win?.focus()
  })
}

function createWindow() {
  win = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 1100,
    minHeight: 700,
    center: true,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    icon: path.join(process.env.VITE_PUBLIC, 'tray-icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  })

  win.once('ready-to-show', () => {
    if (startedAtLogin) {
      createTray()
      win?.hide()
    } else {
      win?.show()
    }

    setTimeout(() => {
      autoUpdater.checkForUpdates()
    }, 10000)
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
    // 빌드된 앱에서 오디오가 뮤트되는 문제 방지
    if (win) win.webContents.audioMuted = false
  })

  win.on('close', (event) => {
    if (isQuitting || !minimizeToTray) {
      return
    }

    event.preventDefault()
    win?.hide()
    createTray()
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    void getRendererStaticServerUrl()
      .then((url) => win?.loadURL(url))
      .catch((error) => {
        console.error('Failed to load renderer through local server:', error)
        win?.loadFile(path.join(RENDERER_DIST, 'index.html'))
      })
  }
}

ipcMain.handle('app:get-version', () => {
  return app.getVersion()
})

ipcMain.handle('dialog:select-program', async () => {
  if (!win) return null

  const result = await dialog.showOpenDialog(win, {
    title: 'Select Program',
    properties: ['openFile'],
    filters: [
      {
        name: 'Programs and Shortcuts',
        extensions: ['exe', 'lnk', 'bat', 'cmd'],
      },
      {
        name: 'All Files',
        extensions: ['*'],
      },
    ],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  return result.filePaths[0]
})

ipcMain.handle('dialog:select-folder', async () => {
  if (!win) return null

  const result = await dialog.showOpenDialog(win, {
    title: 'Select Folder',
    properties: ['openDirectory'],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  return result.filePaths[0]
})

ipcMain.handle('file:get-icon', async (_event, filePath: string) => {
  try {
    if (!filePath) return null

    let iconTargetPath = filePath

    if (process.platform === 'win32' && filePath.toLowerCase().endsWith('.lnk')) {
      try {
        const shortcut = shell.readShortcutLink(filePath)

        if (shortcut.target) {
          iconTargetPath = shortcut.target
        }
      } catch (error) {
        console.error('Failed to read shortcut:', error)
      }
    }

    const icon = await app.getFileIcon(iconTargetPath, {
      size: 'large',
    })

    return icon.toDataURL()
  } catch (error) {
    console.error('Failed to get file icon:', error)
    return null
  }
})

ipcMain.handle('programs:load', async () => {
  return await readJsonFile(getProgramsFilePath())
})

ipcMain.handle('programs:save', async (_event, programs: unknown) => {
  try {
    await writeJsonFile(getProgramsFilePath(), programs)

    return true
  } catch (error) {
    console.error('Failed to save programs:', error)
    return false
  }
})

ipcMain.handle('settings:load', async () => {
  return await readJsonFile(getSettingsFilePath())
})

ipcMain.handle('settings:save', async (_event, settings: any) => {
  try {
    minimizeToTray = Boolean(settings?.minimizeToTray)

    await writeJsonFile(getSettingsFilePath(), settings)

    if (minimizeToTray) {
      createTray()
    }

    return true
  } catch (error) {
    console.error('Failed to save settings:', error)
    return false
  }
})

ipcMain.handle('diaries:load', async () => {
  return await readJsonFile(getDiariesFilePath())
})

ipcMain.handle('diaries:save', async (_event, diaries: unknown) => {
  try {
    await writeJsonFile(getDiariesFilePath(), diaries)

    return true
  } catch (error) {
    console.error('Failed to save diaries:', error)
    return false
  }
})

ipcMain.handle('liked-tracks:load', async () => {
  const likedTracks = await readJsonFile(getLikedTracksFilePath())

  return Array.isArray(likedTracks)
    ? likedTracks.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : []
})

ipcMain.handle('liked-tracks:save', async (_event, trackIds: unknown) => {
  try {
    const normalizedTrackIds = Array.isArray(trackIds)
      ? [...new Set(trackIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))]
      : []

    await writeJsonFile(getLikedTracksFilePath(), normalizedTrackIds)

    return true
  } catch (error) {
    console.error('Failed to save liked tracks:', error)
    return false
  }
})

// ─── YouTube IPC 핸들러 ────────────────────────────────────────────────────

// 인증 여부 확인
ipcMain.handle('youtube-music:is-authenticated', async () => {
  const token = await loadYoutubeToken()
  return Boolean(token)
})

// Google 로그인 창 열기 → 코드 입력 → 토큰 저장
ipcMain.handle('youtube-music:login', async () => {
  try {
    const oauth2Client = createOAuthClient()

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: YOUTUBE_SCOPES,
    })

    // 로그인 창 열기
    const authWin = new BrowserWindow({
      width: 500,
      height: 700,
      parent: win ?? undefined,
      modal: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    authWin.loadURL(authUrl)

    return await new Promise<boolean>((resolve) => {
      // redirect_uri가 oob라 코드를 title에서 감지
      authWin.webContents.on('did-navigate', async (_event, url) => {
        try {
          const urlObj = new URL(url)
          const code = urlObj.searchParams.get('code')

          if (code) {
            const { tokens } = await oauth2Client.getToken(code)
            await saveYoutubeToken(tokens)
            authWin.close()
            resolve(true)
          }
        } catch {
          // 무시
        }
      })

      // title에서 코드 감지 (oob 방식 fallback)
      authWin.webContents.on('page-title-updated', async (_event, title) => {
        const match = title.match(/code=([^&\s]+)/)

        if (match) {
          try {
            const { tokens } = await oauth2Client.getToken(match[1])
            await saveYoutubeToken(tokens)
            authWin.close()
            resolve(true)
          } catch {
            authWin.close()
            resolve(false)
          }
        }
      })

      authWin.on('closed', () => {
        resolve(false)
      })
    })
  } catch (error) {
    console.error('Failed to login:', error)
    return false
  }
})

// 현재 로그인 계정 정보
ipcMain.handle('youtube-music:get-account', async () => {
  try {
    const auth = await getAuthenticatedClient()
    if (!auth) return null

    try {
      const oauth2 = google.oauth2({ version: 'v2', auth })
      const response = await oauth2.userinfo.get()
      const user = response.data

      return {
        signedIn: true,
        email: user.email ?? null,
        name: user.name ?? null,
        picture: user.picture ?? null,
        channelTitle: null,
      }
    } catch (error) {
      console.warn('Failed to get Google account profile. Falling back to YouTube channel info:', error)
    }

    try {
      const youtube = google.youtube({ version: 'v3', auth })
      const response = await youtube.channels.list({
        part: ['snippet'],
        mine: true,
        maxResults: 1,
      })
      const channel = response.data.items?.[0]

      return {
        signedIn: true,
        email: null,
        name: channel?.snippet?.title ?? null,
        picture: channel?.snippet?.thumbnails?.default?.url ?? null,
        channelTitle: channel?.snippet?.title ?? null,
      }
    } catch (error) {
      console.warn('Failed to get YouTube channel info:', error)
    }

    return { signedIn: true, email: null, name: null, picture: null, channelTitle: null }
  } catch (error) {
    console.error('Failed to get YouTube account:', error)
    return null
  }
})

// 로그아웃
ipcMain.handle('youtube-music:logout', async () => {
  try {
    try { await fs.unlink(getYoutubeTokenPath()) } catch (error: any) { if (error?.code !== 'ENOENT') throw error }
    try { await fs.unlink(getPlaylistCachePath()) } catch {}
    return true
  } catch (error) {
    console.error('Failed to logout:', error)
    return false
  }
})

ipcMain.handle('youtube-music:load-track-cache', async () => {
  try {
    const data = await fs.readFile(getPlaylistCachePath(), 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
})

ipcMain.handle('youtube-music:save-track-cache', async (_event, cache: unknown) => {
  try {
    await fs.writeFile(getPlaylistCachePath(), JSON.stringify(cache), 'utf-8')
    return true
  } catch {
    return false
  }
})

ipcMain.handle('youtube-music:load-playlist-covers', async () => {
  return await createPlaylistCoverDataUrlMap()
})

ipcMain.handle('youtube-music:change-playlist-cover', async (_event, playlistId: string) => {
  try {
    if (!playlistId) return null

    const result = win
      ? await dialog.showOpenDialog(win, {
          title: 'Select Playlist Cover',
          properties: ['openFile'],
          filters: [
            {
              name: 'Images',
              extensions: ['png', 'jpg', 'jpeg', 'webp'],
            },
          ],
        })
      : await dialog.showOpenDialog({
          title: 'Select Playlist Cover',
          properties: ['openFile'],
          filters: [
            {
              name: 'Images',
              extensions: ['png', 'jpg', 'jpeg', 'webp'],
            },
          ],
        })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const selectedPath = result.filePaths[0]
    const rawExtension = path.extname(selectedPath).toLowerCase()
    const extension = ['.png', '.jpg', '.jpeg', '.webp'].includes(rawExtension)
      ? rawExtension
      : '.png'
    const safeFileName = sanitizePlaylistCoverFileName(playlistId)
    const coverDirPath = getPlaylistCoverDirPath()
    const targetPath = path.join(coverDirPath, `${safeFileName}${extension}`)

    await fs.mkdir(coverDirPath, { recursive: true })

    if (selectedPath !== targetPath) {
      await fs.copyFile(selectedPath, targetPath)
    }

    const coverMap = await loadPlaylistCoverMap()
    const previousPath = coverMap[playlistId]

    if (previousPath && previousPath !== targetPath) {
      try {
        await fs.unlink(previousPath)
      } catch {
        // 이전 커버 파일 삭제 실패는 무시
      }
    }

    coverMap[playlistId] = targetPath
    await savePlaylistCoverMap(coverMap)

    return await createPlaylistCoverDataUrl(targetPath)
  } catch (error) {
    console.error('Failed to change playlist cover:', error)
    return null
  }
})

// 플레이리스트 목록
ipcMain.handle('youtube-music:get-playlists', async () => {
  try {
    const auth = await getAuthenticatedClient()
    if (!auth) return null

    const youtube = google.youtube({ version: 'v3', auth })
    const response = await youtube.playlists.list({
      part: ['snippet', 'contentDetails'],
      mine: true,
      maxResults: 50,
    })

    return (response.data.items ?? []).map((item) => ({
      id: item.id ?? '',
      name: item.snippet?.title ?? '',
      tracks: item.contentDetails?.itemCount ?? 0,
      thumbnail: item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? '',
    }))
  } catch (error) {
    console.error('Failed to get playlists:', error)
    return null
  }
})

// 좋아요 표시한 음악
ipcMain.handle('youtube-music:get-liked-songs', async () => {
  try {
    const auth = await getAuthenticatedClient()
    if (!auth) return null

    const youtube = google.youtube({ version: 'v3', auth })
    const response = await youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      myRating: 'like',
      maxResults: 50,
    })

    return (response.data.items ?? []).map((item) => ({
      id: item.id ?? '',
      title: item.snippet?.title ?? '',
      artist: item.snippet?.channelTitle ?? '',
      duration: item.contentDetails?.duration ?? '',
      thumbnail: item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? '',
    }))
  } catch (error) {
    console.error('Failed to get liked songs:', error)
    return null
  }
})

// 특정 플레이리스트 트랙
ipcMain.handle('youtube-music:get-playlist-tracks', async (_event, playlistId: string) => {
  try {
    const auth = await getAuthenticatedClient()
    if (!auth) return null

    const youtube = google.youtube({ version: 'v3', auth })

    // 1. nextPageToken으로 전체 플레이리스트 아이템 가져오기
    const allItems: any[] = []
    let nextPageToken: string | undefined = undefined

    do {
      const response: any = await youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId,
        maxResults: 50,
        pageToken: nextPageToken,
      })
      allItems.push(...(response.data.items ?? []))
      nextPageToken = response.data.nextPageToken ?? undefined
    } while (nextPageToken)

    const videoIds = allItems
      .map((item: any) => item.contentDetails?.videoId ?? '')
      .filter(Boolean)

    // 2. videos.list로 duration 가져오기 (50개씩 배치)
    const durationMap: Record<string, string> = {}
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50)
      const videosResponse = await youtube.videos.list({
        part: ['contentDetails'],
        id: batch,
        maxResults: 50,
      })

      for (const video of videosResponse.data.items ?? []) {
        if (video.id && video.contentDetails?.duration) {
          const raw = video.contentDetails.duration
          const match = raw.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
          if (match) {
            const h = parseInt(match[1] ?? '0')
            const m = parseInt(match[2] ?? '0')
            const s = parseInt(match[3] ?? '0')
            const formatted = h > 0
              ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
              : `${m}:${String(s).padStart(2, '0')}`
            durationMap[video.id] = formatted
          }
        }
      }
    }

    return allItems.map((item: any) => {
      const videoId = item.contentDetails?.videoId ?? ''
      return {
        id: videoId,
        title: item.snippet?.title ?? '',
        artist: item.snippet?.videoOwnerChannelTitle ?? '',
        duration: durationMap[videoId] ?? '',
        thumbnail: item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? '',
      }
    })
  } catch (error) {
    console.error('Failed to get playlist tracks:', error)
    return null
  }
})

// ───────────────────────────────────────────────────────────────────────────

ipcMain.handle('settings:set-start-with-windows', async (_event, enabled: boolean) => {
  try {
    if (!app.isPackaged) {
      console.log('Development mode - skip auto start registration')
      return enabled
    }

    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: process.execPath,
      args: [],
    })

    return app.getLoginItemSettings().openAtLogin
  } catch (error) {
    console.error('Failed to set start with Windows:', error)
    return false
  }
})

ipcMain.handle('device:get-audio', async () => {
  try {
    const result = await runPowerShell(String.raw`
$device = Get-AudioDevice -Playback | Where-Object { $_.Default -eq $true } | Select-Object -First 1

if (-not $device) {
  exit 1
}

$device | Select-Object Index, Name, Default | ConvertTo-Json -Compress
`)

    if (!result.success) {
      return null
    }

    const device = JSON.parse(result.stdout.trim())
    const index = Number(device.Index)
    const name = String(device.Name ?? '').toLowerCase()

    if (index === 2 || name.includes('speaker') || name.includes('스피커')) {
      return 'speaker'
    }

    if (
      index === 1 ||
      name.includes('headphone') ||
      name.includes('headset') ||
      name.includes('이어폰') ||
      name.includes('헤드셋')
    ) {
      return 'headphone'
    }

    return null
  } catch (error) {
    console.error('Failed to get audio device:', error)
    return null
  }
})

ipcMain.handle('device:set-audio', async (_event, device: 'speaker' | 'headphone') => {
  try {
    const command =
      device === 'speaker'
        ? 'Set-AudioDevice -Index 2'
        : 'Set-AudioDevice -Index 1'

    return await runPowerShell(command)
  } catch (error) {
    console.error('Failed to set audio device:', error)

    return {
      success: false,
      stdout: '',
      stderr: '',
      error: String(error),
    }
  }
})

ipcMain.handle('device:get-monitor', async () => {
  try {
    const result = await runPowerShell(getCurrentMonitorCommand())

    if (!result.success) {
      return null
    }

    const orientation = Number(result.stdout.trim())

    return orientation === 1 ? 'vertical' : 'horizontal'
  } catch (error) {
    console.error('Failed to get monitor orientation:', error)
    return null
  }
})

ipcMain.handle('device:set-monitor', async (_event, orientation: 'horizontal' | 'vertical') => {
  try {
    return await runPowerShell(getMonitorCommand(orientation))
  } catch (error) {
    console.error('Failed to set monitor orientation:', error)

    return {
      success: false,
      stdout: '',
      stderr: '',
      error: String(error),
    }
  }
})

ipcMain.handle('program:launch', async (_event, program: { path: string; type: string }) => {
  try {
    if (!program.path) {
      return {
        success: false,
        error: 'Path is empty',
      }
    }

    if (program.type === 'URL') {
      await shell.openExternal(program.path)

      return {
        success: true,
      }
    }

    const result = await shell.openPath(program.path)

    if (result) {
      return {
        success: false,
        error: result,
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('Failed to launch program:', error)

    return {
      success: false,
      error: String(error),
    }
  }
})

ipcMain.handle('window:minimize', async () => {
  win?.minimize()
})

ipcMain.handle('window:close', async () => {
  win?.close()
})

ipcMain.handle('updater:check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates()
    const latestVersion = result?.updateInfo?.version
    const currentVersion = app.getVersion()

    return Boolean(latestVersion && latestVersion !== currentVersion)
  } catch (error) {
    console.error('Failed to check for updates:', error)

    return false
  }
})

ipcMain.handle('updater:download-update', async () => {
  try {
    win?.webContents.send('updater:download-progress', {
      percent: 1,
    })

    await autoUpdater.downloadUpdate()

    return true
  } catch (error) {
    console.error('Failed to download update:', error)

    return false
  }
})

ipcMain.handle('updater:install-update', async () => {
  isQuitting = true

  if (tray) {
    tray.destroy()
    tray = null
  }

  autoUpdater.quitAndInstall(false, true)

  return true
})

autoUpdater.on('error', (error) => {
  console.error('Updater error:', error)
})

autoUpdater.on('update-available', (info) => {
  win?.webContents.send('updater:update-available', {
    version: info.version,
  })
})

autoUpdater.on('download-progress', (progress) => {
  win?.webContents.send('updater:download-progress', {
    percent: Math.round(progress.percent),
  })
})

autoUpdater.on('update-downloaded', (info) => {
  win?.webContents.send('updater:update-downloaded', {
    version: info.version,
  })
})

app.on('before-quit', () => {
  rendererStaticServer?.close()
  rendererStaticServer = null
  rendererStaticServerUrl = ''
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)