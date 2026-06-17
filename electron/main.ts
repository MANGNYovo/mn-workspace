import { app, BrowserWindow, dialog, ipcMain, shell, Tray, Menu } from 'electron'
import { autoUpdater } from 'electron-updater'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

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

autoUpdater.autoDownload = false

function getProgramsFilePath() {
  return path.join(app.getPath('userData'), 'programs.json')
}

function getSettingsFilePath() {
  return path.join(app.getPath('userData'), 'settings.json')
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
    // 2번 모니터 가로 상태
    positionX = -1920
    positionY = -120
  } else {
    // 2번 모니터 세로 상태
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

$result = [DisplayHelper2]::ChangeDisplaySettingsEx("\\.\DISPLAY2", [ref]$dm, [IntPtr]::Zero, 0, [IntPtr]::Zero)
Write-Host "결과: $result"

if ($result -ne 0) {
  exit 1
}
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
    },
  })

  win.once('ready-to-show', () => {
    win?.show()

    setTimeout(() => {
      autoUpdater.checkForUpdates()
    }, 10000)
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
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
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
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
  try {
    const filePath = getProgramsFilePath()
    const data = await fs.readFile(filePath, 'utf-8')

    return JSON.parse(data)
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      console.error('Failed to load programs:', error)
    }

    return null
  }
})

ipcMain.handle('programs:save', async (_event, programs: unknown) => {
  try {
    const filePath = getProgramsFilePath()
    const data = JSON.stringify(programs, null, 2)

    await fs.writeFile(filePath, data, 'utf-8')

    return true
  } catch (error) {
    console.error('Failed to save programs:', error)
    return false
  }
})

ipcMain.handle('settings:load', async () => {
  try {
    const filePath = getSettingsFilePath()
    const data = await fs.readFile(filePath, 'utf-8')

    return JSON.parse(data)
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      console.error('Failed to load settings:', error)
    }

    return null
  }
})

ipcMain.handle('settings:save', async (_event, settings: any) => {
  try {
    minimizeToTray = Boolean(settings?.minimizeToTray)

    const filePath = getSettingsFilePath()
    const data = JSON.stringify(settings, null, 2)

    await fs.writeFile(filePath, data, 'utf-8')

    if (minimizeToTray) {
      createTray()
    }

    return true
  } catch (error) {
    console.error('Failed to save settings:', error)
    return false
  }
})

ipcMain.handle('settings:set-start-with-windows', async (_event, enabled: boolean) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: process.execPath,
    })

    return app.getLoginItemSettings().openAtLogin
  } catch (error) {
    console.error('Failed to set start with Windows:', error)
    return false
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

    return Boolean(result?.updateInfo?.version)
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
  autoUpdater.quitAndInstall()

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