import { app, BrowserWindow, dialog, ipcMain, shell, Tray, Menu, protocol, Notification, screen, nativeImage } from 'electron'
import { execFile, spawn } from 'node:child_process'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import dotenv from 'dotenv'
import OpenAI from 'openai'
import { google } from 'googleapis'
import electronUpdater from 'electron-updater'
import { MicrophoneController } from './microphone'
import type {
  AIChatAPIResult,
  AIChatHistoryPayload,
  AIChatRequestMessage,
  AIChatStoredMessage,
  AICommand,
  AICommandTargetHint,
  PlaylistCoverTheme,
  TodoPriority,
} from '../src/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const { autoUpdater } = electronUpdater

const CUSTOM_WALLPAPER_PROTOCOL = 'mn-wallpaper'

if (process.platform === 'win32') {
  app.setAppUserModelId('MN Workspace')
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: CUSTOM_WALLPAPER_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
])


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
let normalWindowBounds: Electron.Rectangle | null = null
let normalWindowWasMaximized = false
let isMinimalWindowMode = false
let tray: Tray | null = null
let audioOverlayWindow: BrowserWindow | null = null
let audioOverlayMoveTimer: NodeJS.Timeout | null = null
let audioOverlayTopmostTimer: NodeJS.Timeout | null = null
let audioOverlayFullscreenProcess: ReturnType<typeof spawn> | null = null
let audioOverlayFullscreenRestartTimer: NodeJS.Timeout | null = null
let audioOverlayScreenListenersRegistered = false
let audioOverlayEnabled = true
let audioOverlayHideInFullscreen = true
let audioOverlaySuppressedByFullscreen = false
let audioOverlayLastFullscreenState: boolean | null = null
let minimizeToTray = false
let isQuitting = false
let startedAtLogin = app.getLoginItemSettings().wasOpenedAtLogin

const AUDIO_OVERLAY_WIDTH = 122
const AUDIO_OVERLAY_HEIGHT = 42

const microphone = new MicrophoneController((state) => {
  if (audioOverlayWindow && !audioOverlayWindow.isDestroyed()) {
    audioOverlayWindow.webContents.send('device:microphone-changed', state)
  }
})

type AudioDevice = 'speaker' | 'headphone'
type AudioOverlayPosition = {
  x: number
  y: number
}

autoUpdater.autoDownload = false

// YouTube embed autoplay/audio가 설치 빌드에서도 사용자 제스처 없이 동작하도록 고정
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

// GIF wallpaper가 다른 창 뒤에 있을 때 Chromium이 렌더링을 낮추며 버벅이는 문제 완화
// CSS background-image 방식은 유지하고, Electron의 background throttling만 꺼둔다.
// 반드시 app.whenReady() 이전에 적용되어야 한다.
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion')

// ─── YouTube Data API v3 ────────────────────────────────────────────────────

const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID?.trim() ?? ''
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET?.trim() ?? ''
const YOUTUBE_REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'
const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
]

// ─── OpenAI Chat API ───────────────────────────────────────────────────────

const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim() ?? ''
const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini'

type AIChatContext = {
  currentDate?: unknown
  currentDateTime?: unknown
  selectedScheduleDate?: unknown
  schedules?: unknown
  todos?: unknown
}

type AIChatResponsePayload = AIChatAPIResult

type VocabularyMeaningCheckPayload = {
  word?: unknown
  correctMeaning?: unknown
  answer?: unknown
}

type VocabularyMeaningCheckResponse = {
  success: true
  isCorrect: boolean
} | {
  success: false
  error: string
}

let openAIClient: OpenAI | null = null

function getOpenAIClient() {
  if (!OPENAI_API_KEY) {
    throw new Error('missing-openai-api-key')
  }

  if (!openAIClient) {
    openAIClient = new OpenAI({
      apiKey: OPENAI_API_KEY,
    })
  }

  return openAIClient
}

function normalizeAIChatMessages(messages: unknown): AIChatRequestMessage[] {
  if (!Array.isArray(messages)) return []

  return messages
    .filter((message): message is AIChatRequestMessage => {
      if (!message || typeof message !== 'object') return false

      const role = (message as { role?: unknown }).role
      const content = (message as { content?: unknown }).content

      return (
        (role === 'user' || role === 'assistant') &&
        typeof content === 'string' &&
        content.trim().length > 0
      )
    })
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 4000),
    }))
    .slice(-10)
}

function normalizeAIChatStoredMessage(value: unknown): AIChatStoredMessage | null {
  if (!value || typeof value !== 'object') return null

  const item = value as Partial<AIChatStoredMessage>

  if (
    typeof item.id !== 'string' ||
    (item.sender !== 'user' && item.sender !== 'ai') ||
    typeof item.text !== 'string' ||
    typeof item.timestamp !== 'number'
  ) {
    return null
  }

  return {
    id: item.id,
    sender: item.sender,
    text: item.text,
    timestamp: item.timestamp,
  }
}

function normalizeAIChatHistoryPayload(payload: unknown): AIChatHistoryPayload {
  if (!payload || typeof payload !== 'object') return { messages: [] }

  const item = payload as Partial<AIChatHistoryPayload>

  return {
    messages: Array.isArray(item.messages)
      ? item.messages
        .map(normalizeAIChatStoredMessage)
        .filter((message): message is AIChatStoredMessage => Boolean(message))
      : [],
  }
}

function sanitizeAIMessageText(message: string) {
  return message
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function extractFirstJSONObjectText(rawText: string) {
  const text = rawText.trim()
  const start = text.indexOf('{')

  if (start < 0) return ''

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < text.length; index += 1) {
    const char = text[index]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === '{') {
      depth += 1
      continue
    }

    if (char === '}') {
      depth -= 1

      if (depth === 0) {
        return text.slice(start, index + 1)
      }
    }
  }

  return ''
}

function parseAIResponseJSON(rawText: string) {
  const trimmedText = rawText.trim()

  try {
    return JSON.parse(trimmedText) as {
      message?: unknown
      action?: unknown
      commands?: unknown
      missingFields?: unknown
    }
  } catch (error) {
    const firstJSONObjectText = extractFirstJSONObjectText(trimmedText)

    if (firstJSONObjectText && firstJSONObjectText !== trimmedText) {
      return JSON.parse(firstJSONObjectText) as {
        message?: unknown
        action?: unknown
        commands?: unknown
        missingFields?: unknown
      }
    }

    throw error
  }
}

function normalizeOptionalString(value: unknown) {
  if (value === null) return null
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || null
}

function normalizeBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined
}

function normalizePriority(value: unknown): TodoPriority | undefined {
  return value === 'high' || value === 'medium' || value === 'low' ? value : undefined
}

function normalizeTargetHint(value: unknown): AICommandTargetHint | undefined {
  return value === 'latest' || value === 'matched' || value === 'selected' || value === 'today' ? value : undefined
}

type AICalendarColor = 'red' | 'blue' | 'green' | 'orange' | 'purple' | 'gray'

function normalizeCalendarColor(value: unknown): AICalendarColor | undefined {
  return (value === 'red' || value === 'blue' || value === 'green' || value === 'orange' || value === 'purple' || value === 'gray')
    ? value
    : undefined
}

function normalizeAICommand(value: unknown): AICommand | null {
  if (!value || typeof value !== 'object') return null

  const command = value as { type?: unknown; payload?: unknown }
  const payload = command.payload && typeof command.payload === 'object'
    ? command.payload as Record<string, unknown>
    : {}

  if (command.type === 'calendar.create') {
    const title = normalizeOptionalString(payload.title)
    if (!title) return null

    return {
      type: 'calendar.create',
      payload: {
        title,
        date: normalizeOptionalString(payload.date) ?? null,
        time: normalizeOptionalString(payload.time),
        color: normalizeCalendarColor(payload.color),
      },
    }
  }

  if (command.type === 'calendar.update') {
    return {
      type: 'calendar.update',
      payload: {
        id: normalizeOptionalString(payload.id),
        targetId: normalizeOptionalString(payload.targetId),
        targetTitle: normalizeOptionalString(payload.targetTitle),
        targetDate: normalizeOptionalString(payload.targetDate),
        targetHint: normalizeTargetHint(payload.targetHint),
        title: normalizeOptionalString(payload.title),
        date: normalizeOptionalString(payload.date),
        time: normalizeOptionalString(payload.time),
        newTitle: normalizeOptionalString(payload.newTitle),
        newDate: normalizeOptionalString(payload.newDate),
        newTime: normalizeOptionalString(payload.newTime),
      },
    }
  }

  if (command.type === 'calendar.delete') {
    return {
      type: 'calendar.delete',
      payload: {
        id: normalizeOptionalString(payload.id),
        targetId: normalizeOptionalString(payload.targetId),
        targetTitle: normalizeOptionalString(payload.targetTitle),
        targetDate: normalizeOptionalString(payload.targetDate),
        targetHint: normalizeTargetHint(payload.targetHint),
        title: normalizeOptionalString(payload.title),
        date: normalizeOptionalString(payload.date),
      },
    }
  }

  if (command.type === 'todo.create') {
    const title = normalizeOptionalString(payload.title)
    if (!title) return null

    return {
      type: 'todo.create',
      payload: {
        title,
        description: normalizeOptionalString(payload.description),
        dueDate: normalizeOptionalString(payload.dueDate),
        priority: normalizePriority(payload.priority),
        reminderEnabled: normalizeBoolean(payload.reminderEnabled),
      },
    }
  }

  if (command.type === 'todo.update') {
    return {
      type: 'todo.update',
      payload: {
        id: normalizeOptionalString(payload.id),
        targetId: normalizeOptionalString(payload.targetId),
        targetTitle: normalizeOptionalString(payload.targetTitle),
        targetDueDate: normalizeOptionalString(payload.targetDueDate),
        targetHint: normalizeTargetHint(payload.targetHint),
        title: normalizeOptionalString(payload.title),
        newTitle: normalizeOptionalString(payload.newTitle),
        description: normalizeOptionalString(payload.description),
        dueDate: normalizeOptionalString(payload.dueDate),
        priority: normalizePriority(payload.priority),
        reminderEnabled: normalizeBoolean(payload.reminderEnabled),
        completed: normalizeBoolean(payload.completed),
      },
    }
  }

  if (command.type === 'todo.delete') {
    return {
      type: 'todo.delete',
      payload: {
        id: normalizeOptionalString(payload.id),
        targetId: normalizeOptionalString(payload.targetId),
        targetTitle: normalizeOptionalString(payload.targetTitle),
        targetDueDate: normalizeOptionalString(payload.targetDueDate),
        targetHint: normalizeTargetHint(payload.targetHint),
        title: normalizeOptionalString(payload.title),
        dueDate: normalizeOptionalString(payload.dueDate),
      },
    }
  }

  return null
}

function normalizeAICommands(value: unknown): AICommand[] {
  if (!Array.isArray(value)) return []

  return value
    .map(normalizeAICommand)
    .filter((command): command is AICommand => Boolean(command))
    .slice(0, 5)
}

function normalizeMissingFields(value: unknown) {
  if (!Array.isArray(value)) return undefined
  const fields = value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, 8)

  return fields.length > 0 ? fields : undefined
}

function normalizeAIAction(value: unknown): 'ask' | 'execute' | 'answer' | 'error' | undefined {
  if (value === 'ask' || value === 'execute' || value === 'answer' || value === 'error') return value
  return undefined
}

function parseAIResponsePayload(rawText: string): {
  message: string
  action?: 'ask' | 'execute' | 'answer' | 'error'
  commands?: AICommand[]
  missingFields?: string[]
} {
  const parsed = parseAIResponseJSON(rawText)
  const message = typeof parsed.message === 'string'
    ? sanitizeAIMessageText(parsed.message)
    : ''
  const commands = normalizeAICommands(parsed.commands)
  const missingFields = normalizeMissingFields(parsed.missingFields)

  return {
    message: message || '요청을 처리하지 못했습니다. 다시 한 번 말씀해 주세요.',
    action: normalizeAIAction(parsed.action) ?? (commands.length > 0 ? 'execute' : missingFields ? 'ask' : 'answer'),
    commands: commands.length > 0 ? commands : undefined,
    missingFields,
  }
}

function normalizeAIChatContext(context: unknown): AIChatContext {
  if (!context || typeof context !== 'object') return {}

  const item = context as AIChatContext
  const normalizeSchedule = (value: unknown) => {
    if (!value || typeof value !== 'object') return null
    const schedule = value as Record<string, unknown>
    if (typeof schedule.id !== 'string' || typeof schedule.title !== 'string' || typeof schedule.date !== 'string') return null

    return {
      id: schedule.id,
      title: schedule.title,
      date: schedule.date,
      time: typeof schedule.time === 'string' ? schedule.time : undefined,
      createdAt: typeof schedule.createdAt === 'string' ? schedule.createdAt : '',
      updatedAt: typeof schedule.updatedAt === 'string' ? schedule.updatedAt : '',
    }
  }

  const normalizeTodo = (value: unknown) => {
    if (!value || typeof value !== 'object') return null
    const task = value as Record<string, unknown>
    if (typeof task.id !== 'string' || typeof task.title !== 'string') return null

    return {
      id: task.id,
      title: task.title,
      description: typeof task.description === 'string' ? task.description : undefined,
      dueDate: typeof task.dueDate === 'string' ? task.dueDate : undefined,
      priority: normalizePriority(task.priority) ?? 'medium',
      completed: typeof task.completed === 'boolean' ? task.completed : false,
      createdAt: typeof task.createdAt === 'string' ? task.createdAt : '',
      updatedAt: typeof task.updatedAt === 'string' ? task.updatedAt : '',
    }
  }

  return {
    currentDate: typeof item.currentDate === 'string' ? item.currentDate : undefined,
    currentDateTime: typeof item.currentDateTime === 'string' ? item.currentDateTime : undefined,
    selectedScheduleDate: typeof item.selectedScheduleDate === 'string' ? item.selectedScheduleDate : undefined,
    schedules: Array.isArray(item.schedules)
      ? item.schedules.map(normalizeSchedule).filter(Boolean).slice(-40)
      : undefined,
    todos: Array.isArray(item.todos)
      ? item.todos.map(normalizeTodo).filter(Boolean).slice(0, 40)
      : undefined,
  }
}

function createAIChatDeveloperPrompt(context: AIChatContext): string {
  const safeContext = normalizeAIChatContext(context)
  const contextText = JSON.stringify(safeContext)

  return [
    '너는 "노아"라는 이름의 일정과 할 일 관리 전용 업무 AI 비서다. 이름 외에는 캐릭터 연기, 감정 표현, 이미지 묘사, 잡담용 성격 설정이 없다.',
    '사용자가 쓴 언어와 같은 언어로 짧고 명확하게 답한다. 결과와 필요한 질문만 말하고 장황한 설명은 하지 않는다.',
    '지원 기능은 일정 추가/수정/삭제/조회와 할 일 추가/수정/삭제/조회다.',
    '일정이나 할 일을 조회하는 요청은 APP_CONTEXT의 schedules와 todos를 읽어서 바로 답한다. 조회 요청에는 commands를 만들지 않고 action:"answer"를 사용한다.',
    '일정/할 일 추가, 수정, 삭제 요청만 commands 배열로 앱에 전달한다. 실제 앱 조작을 했다고 가정하지 말고 commands에 정확히 표현한다.',
    '현재 날짜와 시간 기준은 Asia/Seoul이다. 상대 날짜는 APP_CONTEXT.currentDate/currentDateTime을 기준으로 ISO 날짜 YYYY-MM-DD로 해석한다.',
    '월이 생략된 "19일" 같은 표현은 현재 월의 해당 일이 아직 지나지 않았으면 현재 월, 이미 지났으면 다음 달로 해석한다.',
    '일정 생성 최소 조건은 title과 date다. time은 선택값이다. 제목과 날짜가 있으면 시간이 없어도 calendar.create를 만든다.',
    '할 일 생성 최소 조건은 title이다. dueDate, priority, reminderEnabled는 선택값이다. 제목이 있으면 바로 todo.create를 만든다.',
    '필수 정보가 부족할 때만 action:"ask"로 한 번에 필요한 정보만 질문하고 commands는 비운다. 선택값이 부족한 경우에는 되묻지 않는다.',
    '수정/삭제 요청은 APP_CONTEXT에서 가장 잘 맞는 항목을 고른다. id를 알 수 있으면 targetId 또는 id를 넣는다. "방금", "최근"은 targetHint:"latest"를 쓴다.',
    '일정 수정은 calendar.update를 사용한다. 변경값은 newTitle/newDate/newTime에 넣고, 찾을 조건은 targetId/targetTitle/targetDate/targetHint에 넣는다.',
    '일정 삭제는 calendar.delete를 사용한다. 항목을 특정할 수 없을 때만 action:"ask"로 어떤 일정을 삭제할지 묻는다.',
    '할 일 수정은 todo.update를 사용한다. 변경값은 newTitle/dueDate/priority/description/reminderEnabled/completed에 넣고, 찾을 조건은 targetId/targetTitle/targetDueDate/targetHint에 넣는다.',
    '할 일 삭제는 todo.delete를 사용한다. 항목을 특정할 수 없을 때만 action:"ask"로 어떤 할 일을 삭제할지 묻는다.',
    '조회 답변은 날짜와 시간이 있으면 보기 쉽게 정리한다. 일정이나 할 일이 없으면 없다고 명확하게 말한다.',
    '답변은 반드시 JSON 하나로만 출력한다. JSON 외 문장, 설명, 마크다운, 코드블록은 절대 출력하지 않는다.',
    '스키마: {"action":"ask|execute|answer|error","message":"사용자에게 보여줄 짧은 답변","commands":[{"type":"calendar.create|calendar.update|calendar.delete|todo.create|todo.update|todo.delete","payload":{}}],"missingFields":["필요한 필드"]}',
    '조회 요청 예시: {"action":"answer","message":"오늘 일정은 2개입니다.\n• 10:00 Team Meeting\n• 15:30 Dentist"}',
    'calendar.create payload 예시: {"title":"치과예약","date":"2026-07-19","time":null}',
    'calendar.update payload 예시: {"targetTitle":"치과예약","targetHint":"latest","newTime":"15:00"}',
    'calendar.delete payload 예시: {"targetTitle":"치과예약","targetHint":"matched"}',
    'todo.create payload 예시: {"title":"문제집 독해","dueDate":null,"priority":"medium","reminderEnabled":false}',
    'todo.update payload 예시: {"targetTitle":"문제집 독해","priority":"high"}',
    'todo.delete payload 예시: {"targetTitle":"문제집 독해","targetHint":"matched"}',
    `APP_CONTEXT=${contextText}`,
  ].join(' ')
}

// ─── AI Chat IPC 핸들러 ─────────────────────────────────────────────────────

ipcMain.handle('vocabulary:check-meaning', async (
  _event,
  payload: VocabularyMeaningCheckPayload,
): Promise<VocabularyMeaningCheckResponse> => {
  const word = typeof payload?.word === 'string' ? payload.word.trim().slice(0, 120) : ''
  const correctMeaning = typeof payload?.correctMeaning === 'string'
    ? payload.correctMeaning.trim().slice(0, 500)
    : ''
  const answer = typeof payload?.answer === 'string' ? payload.answer.trim().slice(0, 500) : ''

  if (!word || !correctMeaning || !answer) {
    return { success: false, error: 'invalid-vocabulary-answer' }
  }

  try {
    const client = getOpenAIClient()
    const response = await client.responses.create({
      model: OPENAI_MODEL,
      input: [
        {
          role: 'developer',
          content: [
            'You grade Korean answers in an English vocabulary test.',
            'Decide whether the user answer conveys the same core dictionary meaning as the expected Korean answer for the given English word.',
            'Judge the lexical head and core action, state, or quality rather than requiring the user to reproduce every word in the expected phrase.',
            'Accept natural Korean synonyms, equivalent paraphrases, harmless changes in particles or endings, omitted leading ~ particles, spacing differences, and minor typos that do not change the meaning.',
            'Optional intensity, emphasis, or explanatory manner words may be omitted when the English word still has the same core sense.',
            'Use the English word to decide whether an omitted modifier is merely explanatory or is essential to the word meaning.',
            'Positive example: englishWord="reject", expectedKoreanMeaning="~을 단호히 거절하다", userKoreanAnswer="거절하다" => true.',
            'Positive example: englishWord="notice", expectedKoreanMeaning="~을 알아채다", userKoreanAnswer="눈치채다" => true.',
            'Negative example: englishWord="reject", expectedKoreanMeaning="~을 단호히 거절하다", userKoreanAnswer="미루다" => false.',
            'Negative example: englishWord="whisper", expectedKoreanMeaning="조용히 말하다", userKoreanAnswer="말하다" => false because quietness is essential to whisper.',
            'When the expected answer lists multiple meanings separated by commas, slashes, semicolons, 또는, or 혹은, matching one complete listed sense is enough.',
            'Reject answers that are merely related, broader or narrower in a meaning-changing way, opposite, or for a different sense of the English word.',
            'When uncertain between true and false, prefer true only if a Korean dictionary could reasonably list the user answer as a meaning of that exact English word.',
            'Return only JSON in this exact shape: {"isCorrect": true} or {"isCorrect": false}.',
          ].join(' '),
        },
        {
          role: 'user',
          content: JSON.stringify({
            englishWord: word,
            expectedKoreanMeaning: correctMeaning,
            userKoreanAnswer: answer,
          }),
        },
      ],
      text: {
        format: {
          type: 'json_object',
        },
      },
      temperature: 0,
      max_output_tokens: 60,
    })

    const rawText = response.output_text?.trim() ?? ''
    const parsed = JSON.parse(rawText) as { isCorrect?: unknown }

    if (typeof parsed.isCorrect !== 'boolean') {
      return { success: false, error: 'invalid-vocabulary-check-response' }
    }

    return { success: true, isCorrect: parsed.isCorrect }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown-error'
    console.error('Vocabulary meaning check failed:', error)
    return { success: false, error: message || 'vocabulary-meaning-check-failed' }
  }
})

ipcMain.handle('ai-chat:load-history', async (): Promise<AIChatHistoryPayload> => {
  try {
    const history = await readJsonFile(getAIChatHistoryFilePath())
    return normalizeAIChatHistoryPayload(history)
  } catch (error) {
    console.error('Failed to load AI chat history:', error)
    return { messages: [] }
  }
})

ipcMain.handle('ai-chat:save-history', async (_event, payload: unknown): Promise<boolean> => {
  try {
    await writeJsonFile(getAIChatHistoryFilePath(), normalizeAIChatHistoryPayload(payload))
    return true
  } catch (error) {
    console.error('Failed to save AI chat history:', error)
    return false
  }
})

ipcMain.handle('ai-chat:clear-history', async (): Promise<boolean> => {
  try {
    await writeJsonFile(getAIChatHistoryFilePath(), { messages: [] })
    return true
  } catch (error) {
    console.error('Failed to clear AI chat history:', error)
    return false
  }
})

ipcMain.handle('ai-chat:send', async (_event, payload: { messages?: unknown; context?: unknown }): Promise<AIChatResponsePayload> => {
  try {
    const client = getOpenAIClient()
    const messages = normalizeAIChatMessages(payload?.messages)
    const context = normalizeAIChatContext(payload?.context)

    if (messages.length === 0) {
      return {
        success: false,
        error: 'empty-message',
      }
    }

    const response = await client.responses.create({
      model: OPENAI_MODEL,
      input: [
        {
          role: 'developer',
          content: createAIChatDeveloperPrompt(context),
        },
        ...messages,
      ],
      text: {
        format: {
          type: 'json_object',
        },
      },
      temperature: 0.2,
      max_output_tokens: 700,
    })

    const rawText = response.output_text?.trim() ?? ''
    return {
      success: true,
      ...parseAIResponsePayload(rawText),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown-error'
    console.error('AI chat request failed:', error)

    return {
      success: false,
      error: message || 'ai-chat-failed',
    }
  }
})

type PlaylistCoverEntry = string | Partial<Record<PlaylistCoverTheme, string>>
type PlaylistCoverPathMap = Record<string, PlaylistCoverEntry>

function normalizePlaylistCoverTheme(theme: unknown): PlaylistCoverTheme {
  return theme === 'light' ? 'light' : 'dark'
}

function normalizePlaylistCoverEntry(entry: PlaylistCoverEntry | undefined) {
  if (!entry) return {} as Partial<Record<PlaylistCoverTheme, string>>
  if (typeof entry === 'string') {
    return { light: entry, dark: entry }
  }

  return { ...entry }
}

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

function getCustomWallpaperDirPath() {
  return path.join(app.getPath('userData'), 'custom-wallpapers')
}

function sanitizeCustomWallpaperFileName(filePath: string) {
  const extension = path.extname(filePath).toLowerCase()
  const baseName = path.basename(filePath, extension)
    .replace(/[^a-zA-Z0-9가-힣._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80) || 'wallpaper'

  return `${Date.now()}-${baseName}${extension}`
}

function createCustomWallpaperUrl(fileName: string) {
  return `${CUSTOM_WALLPAPER_PROTOCOL}://local/${encodeURIComponent(fileName)}`
}

function getCustomWallpaperFilePathFromUrl(requestUrl: string) {
  const url = new URL(requestUrl)
  const fileName = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
  const wallpaperDir = getCustomWallpaperDirPath()
  const wallpaperPath = path.join(wallpaperDir, fileName)
  const relativeToWallpaperDir = path.relative(wallpaperDir, wallpaperPath)

  if (!fileName || relativeToWallpaperDir.startsWith('..') || path.isAbsolute(relativeToWallpaperDir)) {
    return null
  }

  return wallpaperPath
}

function isSupportedWallpaperFile(filePath: string) {
  return [
    '.jpg', '.jpeg', '.jfif', '.png', '.webp', '.gif', '.bmp', '.avif', '.apng', '.svg',
    '.mp4', '.webm',
  ].includes(path.extname(filePath).toLowerCase())
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
// YouTube iframe은 origin/referrer 영향을 크게 받는다.
// dev에서 정상 재생되던 환경과 최대한 동일하게 맞추기 위해
// 설치 빌드에서도 dist를 http://localhost:5173 고정 origin으로 서빙한다.
// 이 앱은 개인 사용 목적이므로 Vite dev server와 같은 origin을 우선 사용한다.
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
  const url = new URL(requestUrl, 'http://localhost:5173')
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

function listenRendererStaticServer(port: number, host: string) {
  return new Promise<string>((resolve, reject) => {
    rendererStaticServer = createServer((request, response) => {
      void handleRendererRequest(request, response)
    })

    rendererStaticServer.once('error', reject)
    rendererStaticServer.listen(port, host, () => {
      rendererStaticServer?.off('error', reject)
      rendererStaticServerUrl = `http://localhost:${port}/index.html`
      resolve(rendererStaticServerUrl)
    })
  })
}

async function getRendererStaticServerUrl() {
  if (rendererStaticServerUrl) {
    return rendererStaticServerUrl
  }

  try {
    // Vite dev server 기본 origin과 동일하게 고정한다.
    return await listenRendererStaticServer(5173, 'localhost')
  } catch (error) {
    console.error('Failed to bind renderer server to localhost:5173:', error)

    rendererStaticServer?.close()
    rendererStaticServer = null

    // 혹시 5173 포트가 이미 사용 중이면 앱이 아예 안 켜지는 것보다는
    // 이전 방식처럼 임시 포트로 열리게 한다. 단, 이 경우 YouTube 제한이 다시 생길 수 있다.
    return await new Promise<string>((resolve, reject) => {
      rendererStaticServer = createServer((request, response) => {
        void handleRendererRequest(request, response)
      })

      rendererStaticServer.once('error', reject)
      rendererStaticServer.listen(0, 'localhost', () => {
        rendererStaticServer?.off('error', reject)
        const address = rendererStaticServer?.address()

        if (!address || typeof address === 'string') {
          reject(new Error('Failed to start renderer static server.'))
          return
        }

        rendererStaticServerUrl = `http://localhost:${address.port}/index.html`
        resolve(rendererStaticServerUrl)
      })
    })
  }
}

async function loadPlaylistCoverMap(): Promise<PlaylistCoverPathMap> {
  try {
    const data = await fs.readFile(getPlaylistCoverMapPath(), 'utf-8')
    const parsed = JSON.parse(data)

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }

    return parsed as PlaylistCoverPathMap
  } catch {
    return {}
  }
}

async function savePlaylistCoverMap(coverMap: PlaylistCoverPathMap) {
  await fs.writeFile(
    getPlaylistCoverMapPath(),
    JSON.stringify(coverMap, null, 2),
    'utf-8',
  )
}

async function createPlaylistCoverDataUrlMap() {
  const coverMap = await loadPlaylistCoverMap()
  const result: Record<string, Partial<Record<PlaylistCoverTheme, string>>> = {}

  for (const [playlistId, coverEntry] of Object.entries(coverMap)) {
    const normalizedCoverEntry = normalizePlaylistCoverEntry(coverEntry)
    const resultEntry: Partial<Record<PlaylistCoverTheme, string>> = {}

    for (const theme of ['light', 'dark'] as PlaylistCoverTheme[]) {
      const filePath = normalizedCoverEntry[theme]
      if (!filePath) continue

      try {
        await fs.access(filePath)
        resultEntry[theme] = await createPlaylistCoverDataUrl(filePath)
      } catch {
        // 파일이 사라진 경우 무시
      }
    }

    if (resultEntry.light || resultEntry.dark) {
      result[playlistId] = resultEntry
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

function getCalendarSchedulesFilePath() {
  return path.join(app.getPath('userData'), 'calendar-schedules.json')
}

function getTodoTasksFilePath() {
  return path.join(app.getPath('userData'), 'todo-tasks.json')
}

function getVocabularyDirectoryPath() {
  return path.join(app.getPath('userData'), 'vocabulary')
}

const VOCABULARY_DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function getVocabularyFilePath(dateKey: string) {
  if (!VOCABULARY_DATE_KEY_PATTERN.test(dateKey)) {
    throw new Error('Invalid vocabulary date key')
  }

  return path.join(getVocabularyDirectoryPath(), `${dateKey}.json`)
}

function getLikedTracksFilePath() {
  return path.join(app.getPath('userData'), 'liked-tracks.json')
}

function getAIChatHistoryFilePath() {
  return path.join(app.getPath('userData'), 'ai-chat-history-noah.json')
}

function getNodeErrorCode(error: unknown) {
  return (error as { code?: string })?.code
}

async function readJsonFile(filePath: string) {
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    const trimmedData = data.trim()

    if (!trimmedData) {
      return null
    }

    return JSON.parse(trimmedData)
  } catch (error: unknown) {
    if (getNodeErrorCode(error) === 'ENOENT') return null

    console.error(`Failed to read JSON file: ${filePath}`, error)
    throw error
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
    try {
      await fs.copyFile(filePath, `${filePath}.bak`)
    } catch (error: unknown) {
      if (getNodeErrorCode(error) !== 'ENOENT') throw error
    }
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
        const exitCode = typeof (error as { code?: unknown } | null)?.code === 'number'
          ? (error as { code: number }).code
          : null
        const errorMessage = error
          ? stderr.trim() || stdout.trim() || `PowerShell exited with code ${exitCode ?? 'unknown'}`
          : undefined

        resolve({
          success: !error,
          stdout,
          stderr,
          error: errorMessage,
        })
      },
    )
  })
}

const monitorDisplayHelperDefinition = String.raw`
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
`

function getMonitorPowerShellPreamble() {
  return String.raw`
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @'
${monitorDisplayHelperDefinition}
'@

function New-DisplayMode {
  $mode = New-Object DisplayHelper2+DEVMODE2
  $mode.dmSize = [System.Runtime.InteropServices.Marshal]::SizeOf($mode)
  return $mode
}

function Get-SecondaryDisplayName {
  $secondaryScreen = [System.Windows.Forms.Screen]::AllScreens |
    Where-Object { -not $_.Primary } |
    Sort-Object { $_.Bounds.X }, { $_.Bounds.Y } |
    Select-Object -First 1

  if (-not $secondaryScreen) {
    return $null
  }

  $mode = New-DisplayMode

  if ([DisplayHelper2]::EnumDisplaySettings($secondaryScreen.DeviceName, -1, [ref]$mode)) {
    return $secondaryScreen.DeviceName
  }

  return $null
}
`
}

function getMonitorCommand(orientation: 'horizontal' | 'vertical') {
  const displayOrientation = orientation === 'horizontal' ? 0 : 1

  return String.raw`
${getMonitorPowerShellPreamble()}

$targetDisplayName = Get-SecondaryDisplayName

if (-not $targetDisplayName) {
  Write-Host "보조 모니터를 찾지 못했습니다."
  exit 1
}

$dm = New-DisplayMode
$ok = [DisplayHelper2]::EnumDisplaySettings($targetDisplayName, -1, [ref]$dm)

if (-not $ok) {
  Write-Host "$targetDisplayName 설정 읽기 실패"
  exit 1
}

$targetOrientation = [uint32]${displayOrientation}
$width = [uint32]$dm.dmPelsWidth
$height = [uint32]$dm.dmPelsHeight

if ($targetOrientation -eq 1 -and $width -gt $height) {
  $temp = $width
  $width = $height
  $height = $temp
}

if ($targetOrientation -eq 0 -and $width -lt $height) {
  $temp = $width
  $width = $height
  $height = $temp
}

$dm.dmDisplayOrientation = $targetOrientation
$dm.dmPelsWidth = $width
$dm.dmPelsHeight = $height

if ($targetOrientation -eq 1) {
  $dm.dmPositionX = -1080
  $dm.dmPositionY = -580
} else {
  $dm.dmPositionX = -1920
  $dm.dmPositionY = -120
}

# DM_DISPLAYORIENTATION + DM_POSITION + DM_PELSWIDTH + DM_PELSHEIGHT.
# The target display is the non-primary monitor, so this restores the fixed
# secondary-monitor position without rotating or moving the primary monitor.
$dm.dmFields = 0x001800A0

$flags = 0x00000001
$result = [DisplayHelper2]::ChangeDisplaySettingsEx($targetDisplayName, [ref]$dm, [IntPtr]::Zero, $flags, [IntPtr]::Zero)

Write-Host "$targetDisplayName 결과: $result"

if ($result -ne 0) {
  exit 1
}
`
}

function getCurrentMonitorCommand() {
  return String.raw`
${getMonitorPowerShellPreamble()}

$targetDisplayName = Get-SecondaryDisplayName

if (-not $targetDisplayName) {
  Write-Host "보조 모니터를 찾지 못했습니다."
  exit 1
}

$dm = New-DisplayMode
$ok = [DisplayHelper2]::EnumDisplaySettings($targetDisplayName, -1, [ref]$dm)

if (-not $ok) {
  Write-Host "$targetDisplayName 설정 읽기 실패"
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


function getAudioOverlayPositionFilePath() {
  return path.join(app.getPath('userData'), 'audio-overlay-position.json')
}

function isAudioOverlayPosition(value: unknown): value is AudioOverlayPosition {
  if (!value || typeof value !== 'object') return false

  const position = value as Partial<AudioOverlayPosition>

  return (
    typeof position.x === 'number' &&
    Number.isFinite(position.x) &&
    typeof position.y === 'number' &&
    Number.isFinite(position.y)
  )
}

function getDefaultAudioOverlayPosition() {
  const { workArea } = screen.getPrimaryDisplay()

  return {
    x: Math.round(workArea.x + workArea.width - AUDIO_OVERLAY_WIDTH - 14),
    y: Math.round(workArea.y + workArea.height - AUDIO_OVERLAY_HEIGHT - 12),
  }
}

function isAudioOverlayPositionVisible(position: AudioOverlayPosition) {
  const minimumVisibleSize = 24
  const overlayRight = position.x + AUDIO_OVERLAY_WIDTH
  const overlayBottom = position.y + AUDIO_OVERLAY_HEIGHT

  return screen.getAllDisplays().some(({ bounds }) => {
    const visibleWidth = Math.min(overlayRight, bounds.x + bounds.width) - Math.max(position.x, bounds.x)
    const visibleHeight = Math.min(overlayBottom, bounds.y + bounds.height) - Math.max(position.y, bounds.y)

    return visibleWidth >= minimumVisibleSize && visibleHeight >= minimumVisibleSize
  })
}

async function loadAudioOverlayPosition() {
  const savedPosition = await readJsonFile(getAudioOverlayPositionFilePath())

  if (isAudioOverlayPosition(savedPosition) && isAudioOverlayPositionVisible(savedPosition)) {
    return {
      x: Math.round(savedPosition.x),
      y: Math.round(savedPosition.y),
    }
  }

  return getDefaultAudioOverlayPosition()
}

function scheduleAudioOverlayPositionSave() {
  if (!audioOverlayWindow || audioOverlayWindow.isDestroyed()) return

  if (audioOverlayMoveTimer) {
    clearTimeout(audioOverlayMoveTimer)
  }

  audioOverlayMoveTimer = setTimeout(() => {
    audioOverlayMoveTimer = null

    if (!audioOverlayWindow || audioOverlayWindow.isDestroyed()) return

    const { x, y } = audioOverlayWindow.getBounds()
    void writeJsonFile(getAudioOverlayPositionFilePath(), { x, y }).catch((error) => {
      console.error('Failed to save audio overlay position:', error)
    })
  }, 220)
}

function keepAudioOverlayOnScreen() {
  if (!audioOverlayWindow || audioOverlayWindow.isDestroyed()) return

  const { x, y } = audioOverlayWindow.getBounds()

  if (!isAudioOverlayPositionVisible({ x, y })) {
    const defaultPosition = getDefaultAudioOverlayPosition()
    audioOverlayWindow.setPosition(defaultPosition.x, defaultPosition.y, false)
    scheduleAudioOverlayPositionSave()
  }
}

function registerAudioOverlayScreenListeners() {
  if (audioOverlayScreenListenersRegistered) return
  audioOverlayScreenListenersRegistered = true

  screen.on('display-added', keepAudioOverlayOnScreen)
  screen.on('display-removed', keepAudioOverlayOnScreen)
  screen.on('display-metrics-changed', keepAudioOverlayOnScreen)
}

function broadcastAudioDeviceChanged(device: AudioDevice) {
  BrowserWindow.getAllWindows().forEach((browserWindow) => {
    if (!browserWindow.isDestroyed()) {
      browserWindow.webContents.send('device:audio-changed', device)
    }
  })
}

function broadcastSettingsChanged(settings: unknown) {
  BrowserWindow.getAllWindows().forEach((browserWindow) => {
    if (!browserWindow.isDestroyed()) {
      browserWindow.webContents.send('settings:changed', settings)
    }
  })
}

function getAudioOverlayHtml() {
  return String.raw`<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Audio Switcher</title>
  <style>
    :root {
      color-scheme: dark;
      --accent: #9b7cff;
      --icon: rgba(255, 255, 255, 0.66);
      --icon-hover: rgba(255, 255, 255, 0.96);
    }

    :root[data-theme='light'] {
      color-scheme: light;
      --icon: rgba(58, 58, 70, 0.68);
      --icon-hover: rgba(58, 58, 70, 0.96);
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      background: transparent;
      font-family: Arial, sans-serif;
      user-select: none;
    }

    body {
      padding: 2px;
    }

    .audio-switcher {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 4px 8px;
      border: 0;
      border-radius: 999px;
      background: transparent;
      box-shadow: none;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      -webkit-app-region: drag;
      cursor: grab;
    }

    button {
      width: 28px;
      height: 28px;
      display: grid;
      place-items: center;
      flex: 0 0 28px;
      padding: 0;
      border: 0;
      border-radius: 999px;
      outline: none;
      color: var(--icon);
      background: transparent;
      cursor: pointer;
      opacity: 0.9;
      transition: transform 150ms ease, color 150ms ease, opacity 150ms ease;
      -webkit-app-region: no-drag;
    }

    button:hover {
      color: var(--icon-hover);
      opacity: 1;
      transform: translateY(-1px);
    }

    button:active {
      transform: scale(0.9);
    }

    button.active {
      color: var(--accent);
      opacity: 1;
    }

    button.busy {
      opacity: 0.5;
      pointer-events: none;
    }

    #microphone.unavailable { opacity: 0.35; }
    #microphone .mute-slash { display: none; }
    #microphone.active .mute-slash { display: block; }

    svg {
      width: 20px;
      height: 20px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.9;
      stroke-linecap: round;
      stroke-linejoin: round;
      pointer-events: none;
    }

    .error {
      animation: shake 280ms ease;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      30% { transform: translateX(-3px); }
      70% { transform: translateX(3px); }
    }
  </style>
</head>
<body>
  <main id="switcher" class="audio-switcher" title="Drag to move">
    <button type="button" data-device="speaker" aria-label="Switch to speaker" title="Speaker">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.5 9.2v5.6h3.2l4.8 3.8V5.4L7.7 9.2H4.5Z" />
        <path d="M15.2 9.1a4.1 4.1 0 0 1 0 5.8" />
        <path d="M17.8 6.8a7.3 7.3 0 0 1 0 10.4" />
      </svg>
    </button>

    <button type="button" data-device="headphone" aria-label="Switch to headset" title="Headset">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
        <path d="M4 13.2h2.8v6H5.5A1.5 1.5 0 0 1 4 17.7v-4.5Z" />
        <path d="M20 13.2h-2.8v6h1.3a1.5 1.5 0 0 0 1.5-1.5v-4.5Z" />
      </svg>
    </button>
    <button id="microphone" type="button" class="unavailable" aria-label="Analog 1/2 microphone" title="Analog 1/2 · Checking microphone">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="9" y="4.5" width="6" height="9" rx="3" />
        <path d="M5 10v1a7 6 0 0 0 14 0v-1M12 17v2.5M8.5 19.5h7" />
        <path class="mute-slash" d="M5 5l14 14" />
      </svg>
    </button>
  </main>

  <script>
    const api = window.mnAPI
    const switcher = document.getElementById('switcher')
    const buttons = Array.from(document.querySelectorAll('button[data-device]'))
    const micButton = document.getElementById('microphone')
    let micBusy = false
    let micRefresh = null
    function renderMicrophone(state) {
      const available = state && state.available && typeof state.muted === 'boolean'
      micButton.classList.toggle('unavailable', !available)
      micButton.classList.toggle('active', available && state.muted)
      if (available) micButton.setAttribute('aria-pressed', String(state.muted))
      else micButton.removeAttribute('aria-pressed')
      const label = !available ? 'Analog 1/2 · Unavailable (click to retry)' :
        state.muted ? 'Analog 1/2 · Muted (click to unmute)' : 'Analog 1/2 · On (click to mute)'
      micButton.title = label
      micButton.setAttribute('aria-label', label)
    }
    function refreshMicrophone() {
      if (micBusy || micRefresh) return micRefresh
      micRefresh = api.getMicrophoneState().then(renderMicrophone).catch(() => renderMicrophone(null))
        .finally(() => { micRefresh = null })
      return micRefresh
    }
    micButton.addEventListener('mouseenter', refreshMicrophone)
    micButton.addEventListener('click', async () => {
      if (micBusy) return
      micBusy = true
      micButton.classList.add('busy')
      try {
        await micRefresh
        const state = await api.toggleMicrophoneMute()
        renderMicrophone(state)
        if (!state.available) showError()
      } catch { renderMicrophone(null); showError() }
      finally { micBusy = false; micButton.classList.remove('busy') }
    })
    const removeMicrophoneListener = api.onMicrophoneChanged(renderMicrophone)
    refreshMicrophone()
    const accentColors = {
      purple: '#9b7cff',
      blue: '#6f9cff',
      green: '#62c997',
      orange: '#f2a36b',
      red: '#ef747c',
      gray: '#8c91a2',
    }

    let currentDevice = null
    let busy = false

    function resolveTheme(settings) {
      if (!settings || typeof settings !== 'object') return 'light'
      if (settings.theme === 'Light') return 'light'
      if (settings.theme === 'Dark') return 'dark'
      if (settings.theme === 'Custom Wallpaper') {
        return settings.customWallpaperTheme === 'light' ? 'light' : 'dark'
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    function applySettings(settings) {
      const accent = settings && accentColors[settings.accentColor]
        ? accentColors[settings.accentColor]
        : accentColors.purple

      document.documentElement.style.setProperty('--accent', accent)
      document.documentElement.dataset.theme = resolveTheme(settings)
    }

    function renderDevice(device) {
      currentDevice = device
      buttons.forEach((button) => {
        button.classList.toggle('active', button.dataset.device === device)
      })
    }

    function renderBusy(nextBusy) {
      busy = nextBusy
      buttons.forEach((button) => button.classList.toggle('busy', nextBusy))
    }

    function showError() {
      switcher.classList.remove('error')
      void switcher.offsetWidth
      switcher.classList.add('error')
      window.setTimeout(() => switcher.classList.remove('error'), 320)
    }

    async function refreshDevice() {
      try {
        const device = await api.getAudioDevice()
        if (device) renderDevice(device)
      } catch (error) {
        console.error(error)
      }
    }

    async function selectDevice(device) {
      if (busy || currentDevice === device) return

      renderBusy(true)

      try {
        const result = await api.setAudioDevice(device)

        if (!result || !result.success) {
          showError()
          return
        }

        const actualDevice = await api.getAudioDevice()
        renderDevice(actualDevice || device)
      } catch (error) {
        console.error(error)
        showError()
      } finally {
        renderBusy(false)
      }
    }

    buttons.forEach((button) => {
      button.addEventListener('click', () => selectDevice(button.dataset.device))
    })

    api.loadSettings().then(applySettings).catch(console.error)
    refreshDevice()

    const removeAudioListener = api.onAudioDeviceChanged((device) => renderDevice(device))
    const removeSettingsListener = api.onSettingsChanged((settings) => applySettings(settings))
    const refreshTimer = window.setInterval(refreshDevice, 3000)

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      api.loadSettings().then(applySettings).catch(console.error)
    })

    window.addEventListener('beforeunload', () => {
      window.clearInterval(refreshTimer)
      removeAudioListener()
      removeSettingsListener()
      removeMicrophoneListener()
    })
  </script>
</body>
</html>`
}

function getAudioOverlayEnabledFromSettings(settings: unknown) {
  if (!settings || typeof settings !== 'object') return true

  return (settings as { audioOverlayEnabled?: unknown }).audioOverlayEnabled !== false
}

function getAudioOverlayHideInFullscreenFromSettings(settings: unknown) {
  if (!settings || typeof settings !== 'object') return true

  return (settings as { audioOverlayHideInFullscreen?: unknown }).audioOverlayHideInFullscreen !== false
}

const audioOverlayFullscreenProbeScript = String.raw`
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class MNFullscreenProbe {
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    public struct MONITORINFO {
        public int cbSize;
        public RECT rcMonitor;
        public RECT rcWork;
        public uint dwFlags;
    }

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern IntPtr GetShellWindow();

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);

    [DllImport("user32.dll")]
    public static extern IntPtr MonitorFromWindow(IntPtr hWnd, uint dwFlags);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFO info);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder className, int maxCount);

    [DllImport("dwmapi.dll")]
    public static extern int DwmGetWindowAttribute(IntPtr hWnd, int attribute, out RECT rect, int size);

    public static bool IsForegroundFullscreen() {
        IntPtr hWnd = GetForegroundWindow();
        if (hWnd == IntPtr.Zero || hWnd == GetShellWindow()) return false;

        StringBuilder className = new StringBuilder(256);
        GetClassName(hWnd, className, className.Capacity);
        string cls = className.ToString();
        if (cls == "Progman" || cls == "WorkerW" || cls == "Shell_TrayWnd" || cls == "Shell_SecondaryTrayWnd") {
            return false;
        }

        RECT rect;
        const int DWMWA_EXTENDED_FRAME_BOUNDS = 9;
        int dwmResult = DwmGetWindowAttribute(hWnd, DWMWA_EXTENDED_FRAME_BOUNDS, out rect, Marshal.SizeOf(typeof(RECT)));
        if (dwmResult != 0 && !GetWindowRect(hWnd, out rect)) return false;

        IntPtr monitor = MonitorFromWindow(hWnd, 2);
        if (monitor == IntPtr.Zero) return false;

        MONITORINFO info = new MONITORINFO();
        info.cbSize = Marshal.SizeOf(typeof(MONITORINFO));
        if (!GetMonitorInfo(monitor, ref info)) return false;

        const int tolerance = 3;
        return Math.Abs(rect.Left - info.rcMonitor.Left) <= tolerance
            && Math.Abs(rect.Top - info.rcMonitor.Top) <= tolerance
            && Math.Abs(rect.Right - info.rcMonitor.Right) <= tolerance
            && Math.Abs(rect.Bottom - info.rcMonitor.Bottom) <= tolerance;
    }
}
'@

$lastState = $null
while ($true) {
  try {
    $state = if ([MNFullscreenProbe]::IsForegroundFullscreen()) { '1' } else { '0' }
    if ($state -ne $lastState) {
      [Console]::Out.WriteLine($state)
      [Console]::Out.Flush()
      $lastState = $state
    }
  } catch {
    [Console]::Out.WriteLine('0')
    [Console]::Out.Flush()
  }

  Start-Sleep -Milliseconds 250
}
`

function applyAudioOverlayFullscreenState(isFullscreen: boolean) {
  audioOverlayLastFullscreenState = isFullscreen
  if (!audioOverlayEnabled) return

  const shouldSuppress = audioOverlayHideInFullscreen && isFullscreen
  if (audioOverlaySuppressedByFullscreen === shouldSuppress) return

  audioOverlaySuppressedByFullscreen = shouldSuppress

  if (shouldSuppress) {
    if (audioOverlayWindow && !audioOverlayWindow.isDestroyed()) {
      audioOverlayWindow.hide()
    }
    return
  }

  if (audioOverlayWindow && !audioOverlayWindow.isDestroyed()) {
    showAudioOverlayOnTop()
  } else {
    void createAudioOverlayWindow()
  }
}

function stopAudioOverlayFullscreenMonitor() {
  audioOverlayLastFullscreenState = null

  if (audioOverlayFullscreenRestartTimer) {
    clearTimeout(audioOverlayFullscreenRestartTimer)
    audioOverlayFullscreenRestartTimer = null
  }

  if (audioOverlayFullscreenProcess) {
    const processToStop = audioOverlayFullscreenProcess
    audioOverlayFullscreenProcess = null
    processToStop.removeAllListeners()
    processToStop.stdout?.removeAllListeners()
    processToStop.stderr?.removeAllListeners()
    processToStop.kill()
  }
}

function scheduleAudioOverlayFullscreenMonitorRestart() {
  if (
    isQuitting ||
    !audioOverlayEnabled ||
    !audioOverlayHideInFullscreen ||
    audioOverlayFullscreenRestartTimer
  ) {
    return
  }

  audioOverlayFullscreenRestartTimer = setTimeout(() => {
    audioOverlayFullscreenRestartTimer = null
    startAudioOverlayFullscreenMonitor()
  }, 1200)
}

function startAudioOverlayFullscreenMonitor() {
  if (
    process.platform !== 'win32' ||
    !audioOverlayEnabled ||
    !audioOverlayHideInFullscreen ||
    audioOverlayFullscreenProcess
  ) {
    return
  }

  let outputBuffer = ''
  const probe = spawn(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', audioOverlayFullscreenProbeScript],
    { windowsHide: true },
  )

  audioOverlayFullscreenProcess = probe

  probe.stdout?.on('data', (chunk) => {
    outputBuffer += chunk.toString()
    const lines = outputBuffer.split(/\r?\n/)
    outputBuffer = lines.pop() ?? ''

    for (const line of lines) {
      const state = line.trim()
      if (state === '1') applyAudioOverlayFullscreenState(true)
      if (state === '0') applyAudioOverlayFullscreenState(false)
    }
  })

  probe.on('error', () => {
    if (audioOverlayFullscreenProcess === probe) {
      audioOverlayFullscreenProcess = null
    }

    // If the Windows probe cannot start, fail open rather than leaving the
    // switcher hidden indefinitely.
    applyAudioOverlayFullscreenState(false)
    scheduleAudioOverlayFullscreenMonitorRestart()
  })

  probe.on('exit', () => {
    if (audioOverlayFullscreenProcess === probe) {
      audioOverlayFullscreenProcess = null
    }

    scheduleAudioOverlayFullscreenMonitorRestart()
  })
}

async function syncAudioOverlayVisibility(settings?: unknown) {
  if (process.platform !== 'win32') return

  const resolvedSettings = settings === undefined
    ? await readJsonFile(getSettingsFilePath())
    : settings

  audioOverlayEnabled = getAudioOverlayEnabledFromSettings(resolvedSettings)
  audioOverlayHideInFullscreen = getAudioOverlayHideInFullscreenFromSettings(resolvedSettings)

  if (!audioOverlayEnabled) {
    microphone.stop()
    stopAudioOverlayFullscreenMonitor()
    audioOverlaySuppressedByFullscreen = false

    if (audioOverlayWindow && !audioOverlayWindow.isDestroyed()) {
      audioOverlayWindow.hide()
    }
    return
  }

  if (audioOverlayHideInFullscreen) {
    // On the first run, keep the overlay hidden until Windows reports the
    // foreground-window state. On later settings saves, reuse the last known
    // state so the switcher does not flicker or get stuck hidden.
    const fullscreenState = audioOverlayLastFullscreenState
    audioOverlaySuppressedByFullscreen = fullscreenState ?? true

    if (audioOverlaySuppressedByFullscreen && audioOverlayWindow && !audioOverlayWindow.isDestroyed()) {
      audioOverlayWindow.hide()
    }

    await createAudioOverlayWindow()
    startAudioOverlayFullscreenMonitor()

    if (fullscreenState === false) {
      showAudioOverlayOnTop()
    }
    return
  }

  stopAudioOverlayFullscreenMonitor()
  audioOverlaySuppressedByFullscreen = false
  await createAudioOverlayWindow()
}

function keepAudioOverlayOnTop() {
  if (!audioOverlayWindow || audioOverlayWindow.isDestroyed() || audioOverlaySuppressedByFullscreen) return

  // Windows' taskbar is itself a topmost window. Clicking it can reorder the
  // topmost band and temporarily place it above our overlay. Re-assert TOPMOST
  // and then move the overlay to the front of that band without activating it.
  audioOverlayWindow.setAlwaysOnTop(true, 'screen-saver', 1)
  audioOverlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (audioOverlayWindow.isVisible()) {
    audioOverlayWindow.moveTop()
  }
}

function stopAudioOverlayTopmostGuard() {
  if (!audioOverlayTopmostTimer) return

  clearInterval(audioOverlayTopmostTimer)
  audioOverlayTopmostTimer = null
}

function startAudioOverlayTopmostGuard() {
  stopAudioOverlayTopmostGuard()

  if (
    process.platform !== 'win32' ||
    !audioOverlayEnabled ||
    audioOverlaySuppressedByFullscreen ||
    !audioOverlayWindow ||
    audioOverlayWindow.isDestroyed() ||
    !audioOverlayWindow.isVisible()
  ) {
    return
  }

  // There is no Electron event for "the Windows taskbar just moved above my
  // topmost window". A lightweight guard keeps our tiny overlay above the
  // taskbar even after the taskbar itself is clicked, while preserving the
  // user's freely dragged position (including positions inside taskbar bounds).
  audioOverlayTopmostTimer = setInterval(() => {
    if (
      !audioOverlayEnabled ||
      audioOverlaySuppressedByFullscreen ||
      !audioOverlayWindow ||
      audioOverlayWindow.isDestroyed() ||
      !audioOverlayWindow.isVisible()
    ) {
      stopAudioOverlayTopmostGuard()
      return
    }

    keepAudioOverlayOnTop()
  }, 120)
}

function showAudioOverlayOnTop() {
  if (!audioOverlayWindow || audioOverlayWindow.isDestroyed() || !audioOverlayEnabled || audioOverlaySuppressedByFullscreen) return

  keepAudioOverlayOnTop()
  audioOverlayWindow.showInactive()
  startAudioOverlayTopmostGuard()

  // showInactive() can change the native Z-order on Windows, so assert TOPMOST
  // once more immediately after the window is shown.
  setTimeout(() => {
    keepAudioOverlayOnTop()
  }, 0)
}

async function createAudioOverlayWindow() {
  if (process.platform !== 'win32' || !audioOverlayEnabled) return

  if (audioOverlayWindow && !audioOverlayWindow.isDestroyed()) {
    showAudioOverlayOnTop()
    return
  }

  const position = await loadAudioOverlayPosition()

  audioOverlayWindow = new BrowserWindow({
    width: AUDIO_OVERLAY_WIDTH,
    height: AUDIO_OVERLAY_HEIGHT,
    x: position.x,
    y: position.y,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  })

  keepAudioOverlayOnTop()

  audioOverlayWindow.once('ready-to-show', () => {
    showAudioOverlayOnTop()
  })

  audioOverlayWindow.on('show', () => {
    void microphone.request('get')
    startAudioOverlayTopmostGuard()
    setTimeout(() => {
      keepAudioOverlayOnTop()
    }, 0)
  })

  audioOverlayWindow.on('hide', stopAudioOverlayTopmostGuard)
  audioOverlayWindow.on('focus', keepAudioOverlayOnTop)
  audioOverlayWindow.on('blur', () => {
    setTimeout(() => {
      keepAudioOverlayOnTop()
    }, 0)
  })

  audioOverlayWindow.on('move', scheduleAudioOverlayPositionSave)

  audioOverlayWindow.on('close', (event) => {
    if (isQuitting) return

    event.preventDefault()

    if (audioOverlayEnabled && !audioOverlaySuppressedByFullscreen) {
      showAudioOverlayOnTop()
    } else {
      audioOverlayWindow?.hide()
    }
  })

  audioOverlayWindow.on('closed', () => {
    microphone.stop()
    stopAudioOverlayTopmostGuard()
    audioOverlayWindow = null

    if (audioOverlayMoveTimer) {
      clearTimeout(audioOverlayMoveTimer)
      audioOverlayMoveTimer = null
    }
  })

  const overlayUrl = `data:text/html;charset=UTF-8,${encodeURIComponent(getAudioOverlayHtml())}`
  await audioOverlayWindow.loadURL(overlayUrl)
}

function registerCustomWallpaperProtocol() {
  protocol.registerFileProtocol(CUSTOM_WALLPAPER_PROTOCOL, (request, callback) => {
    try {
      const wallpaperPath = getCustomWallpaperFilePathFromUrl(request.url)

      if (!wallpaperPath) {
        callback({ error: -6 })
        return
      }

      callback({ path: wallpaperPath })
    } catch (error) {
      console.error('Failed to resolve custom wallpaper protocol:', error)
      callback({ error: -2 })
    }
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
      backgroundThrottling: false,
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
    // 빌드된 앱에서 오디오가 뮤트되는 문제 방지
    if (win) win.webContents.audioMuted = false
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const protocol = new URL(url).protocol
      if (protocol === 'https:' || protocol === 'http:') void shell.openExternal(url)
    } catch {
      // Invalid URLs are denied.
    }
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    if (url === win?.webContents.getURL()) return
    event.preventDefault()
  })

  win.on('close', (event) => {
    if (isQuitting || !minimizeToTray) {
      return
    }

    event.preventDefault()
    win?.hide()
    createTray()
  })

  win.on('closed', () => {
    win = null

    // 오디오 오버레이가 별도 BrowserWindow이므로 메인 창을 닫았을 때
    // 기존처럼 앱 전체가 종료되도록 명시적으로 종료한다.
    if (!isQuitting && !minimizeToTray) {
      isQuitting = true
      app.quit()
    }
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


ipcMain.handle('dialog:select-shortcut-icon', async () => {
  if (!win) return null

  try {
    const result = await dialog.showOpenDialog(win, {
      title: 'Select Shortcut Icon',
      properties: ['openFile'],
      filters: [
        {
          name: 'Images',
          extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'ico'],
        },
      ],
    })

    if (result.canceled || result.filePaths.length === 0) return null

    const selectedPath = result.filePaths[0]
    const image = nativeImage.createFromPath(selectedPath)
    if (image.isEmpty()) return null

    const size = image.getSize()
    const longestSide = Math.max(size.width, size.height)
    const normalized = longestSide > 128
      ? image.resize({
          width: Math.max(1, Math.round(size.width * (128 / longestSide))),
          height: Math.max(1, Math.round(size.height * (128 / longestSide))),
          quality: 'best',
        })
      : image

    return normalized.toDataURL()
  } catch (error) {
    console.error('Failed to select shortcut icon:', error)
    return null
  }
})

ipcMain.handle('dialog:select-wallpaper', async () => {
  if (!win) return null

  const result = await dialog.showOpenDialog(win, {
    title: 'Select Custom Wallpaper',
    properties: ['openFile'],
    filters: [
      {
        name: 'Images, GIFs, and Videos',
        extensions: ['jpg', 'jpeg', 'jfif', 'png', 'webp', 'gif', 'bmp', 'avif', 'apng', 'svg', 'mp4', 'webm'],
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

  const selectedPath = result.filePaths[0]

  if (!isSupportedWallpaperFile(selectedPath)) {
    return {
      error: 'unsupported-file-type',
      name: path.basename(selectedPath),
    }
  }

  try {
    const wallpaperDir = getCustomWallpaperDirPath()
    await fs.mkdir(wallpaperDir, { recursive: true })

    const fileName = sanitizeCustomWallpaperFileName(selectedPath)
    const destinationPath = path.join(wallpaperDir, fileName)
    await fs.copyFile(selectedPath, destinationPath)

    return {
      image: createCustomWallpaperUrl(fileName),
      name: path.basename(selectedPath),
      savedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Failed to save custom wallpaper:', error)
    return null
  }
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
    broadcastSettingsChanged(settings)
    await syncAudioOverlayVisibility(settings)

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

ipcMain.handle('calendar-schedules:load', async () => {
  return await readJsonFile(getCalendarSchedulesFilePath())
})

ipcMain.handle('calendar-schedules:save', async (_event, schedules: unknown) => {
  try {
    await writeJsonFile(getCalendarSchedulesFilePath(), schedules)

    return true
  } catch (error) {
    console.error('Failed to save calendar schedules:', error)
    return false
  }
})

ipcMain.handle('todo-tasks:load', async () => {
  return await readJsonFile(getTodoTasksFilePath())
})

ipcMain.handle('todo-tasks:save', async (_event, tasks: unknown) => {
  try {
    await writeJsonFile(getTodoTasksFilePath(), tasks)

    return true
  } catch (error) {
    console.error('Failed to save to-do tasks:', error)
    return false
  }
})

ipcMain.handle('vocabulary:list-dates', async () => {
  try {
    await fs.mkdir(getVocabularyDirectoryPath(), { recursive: true })
    const files = await fs.readdir(getVocabularyDirectoryPath())

    return files
      .filter((fileName) => fileName.endsWith('.json'))
      .map((fileName) => fileName.slice(0, -5))
      .filter((dateKey) => VOCABULARY_DATE_KEY_PATTERN.test(dateKey))
      .sort((a, b) => b.localeCompare(a))
  } catch (error) {
    console.error('Failed to list vocabulary dates:', error)
    return []
  }
})

ipcMain.handle('vocabulary:load-date', async (_event, dateKey: unknown) => {
  if (typeof dateKey !== 'string' || !VOCABULARY_DATE_KEY_PATTERN.test(dateKey)) return null
  return await readJsonFile(getVocabularyFilePath(dateKey))
})

ipcMain.handle('vocabulary:save-date', async (_event, dateKey: unknown, words: unknown) => {
  if (typeof dateKey !== 'string' || !VOCABULARY_DATE_KEY_PATTERN.test(dateKey)) return false

  try {
    await writeJsonFile(getVocabularyFilePath(dateKey), words)
    return true
  } catch (error) {
    console.error('Failed to save vocabulary date:', error)
    return false
  }
})

ipcMain.handle('notifications:show', async (_event, options: { title?: unknown; body?: unknown }) => {
  try {
    const title = typeof options?.title === 'string' && options.title.trim() ? options.title : 'MN Workspace'
    const body = typeof options?.body === 'string' ? options.body : ''

    if (!Notification.isSupported()) {
      console.warn('Desktop notifications are not supported in this environment.')
      return false
    }

    const notification = new Notification({ title, body })
    notification.show()
    return true
  } catch (error) {
    console.error('Failed to show notification:', error)
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

ipcMain.handle('youtube-music:change-playlist-cover', async (_event, playlistId: string, theme: unknown = 'dark') => {
  try {
    if (!playlistId) return null

    const coverTheme = normalizePlaylistCoverTheme(theme)
    const result = win
      ? await dialog.showOpenDialog(win, {
          title: `Select ${coverTheme === 'dark' ? 'Dark' : 'Light'} Playlist Cover`,
          properties: ['openFile'],
          filters: [
            {
              name: 'Images',
              extensions: ['png', 'jpg', 'jpeg', 'webp'],
            },
          ],
        })
      : await dialog.showOpenDialog({
          title: `Select ${coverTheme === 'dark' ? 'Dark' : 'Light'} Playlist Cover`,
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
    const targetPath = path.join(coverDirPath, `${safeFileName}-${coverTheme}${extension}`)

    await fs.mkdir(coverDirPath, { recursive: true })

    if (selectedPath !== targetPath) {
      await fs.copyFile(selectedPath, targetPath)
    }

    const coverMap = await loadPlaylistCoverMap()
    const previousCoverEntry = normalizePlaylistCoverEntry(coverMap[playlistId])
    const previousPathForTheme = previousCoverEntry[coverTheme]
    const otherTheme: PlaylistCoverTheme = coverTheme === 'dark' ? 'light' : 'dark'
    const otherThemePath = previousCoverEntry[otherTheme]

    if (previousPathForTheme && previousPathForTheme !== targetPath && previousPathForTheme !== otherThemePath) {
      try {
        await fs.unlink(previousPathForTheme)
      } catch {
        // 이전 커버 파일 삭제 실패는 무시
      }
    }

    coverMap[playlistId] = {
      ...previousCoverEntry,
      [coverTheme]: targetPath,
    }
    await savePlaylistCoverMap(coverMap)

    return {
      theme: coverTheme,
      coverUrl: await createPlaylistCoverDataUrl(targetPath),
    }
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

async function getCurrentAudioDevice(): Promise<AudioDevice | null> {
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
}

ipcMain.handle('device:get-audio', async () => {
  return await getCurrentAudioDevice()
})

ipcMain.handle('device:get-microphone', (event) => {
  if (!audioOverlayEnabled || event.sender !== audioOverlayWindow?.webContents) return { available: false, muted: null }
  return microphone.request('get')
})
ipcMain.handle('device:toggle-microphone', (event) => {
  if (!audioOverlayEnabled || event.sender !== audioOverlayWindow?.webContents) return { available: false, muted: null }
  return microphone.request('toggle')
})

ipcMain.handle('device:set-audio', async (_event, device: AudioDevice) => {
  try {
    const command =
      device === 'speaker'
        ? 'Set-AudioDevice -Index 2'
        : 'Set-AudioDevice -Index 1'

    const result = await runPowerShell(command)

    if (result.success) {
      const currentDevice = await getCurrentAudioDevice()
      broadcastAudioDeviceChanged(currentDevice ?? device)
    }

    return result
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

    return orientation === 1 || orientation === 3 ? 'vertical' : 'horizontal'
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
      const url = new URL(program.path)
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return {
          success: false,
          error: 'Only HTTP and HTTPS URLs are allowed',
        }
      }

      await shell.openExternal(url.toString())

      return {
        success: true,
      }
    }

    if (program.type !== 'Program' && program.type !== 'Folder') {
      return {
        success: false,
        error: 'Unsupported program type',
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

ipcMain.handle('window:set-minimal-mode', async (_event, enabled: boolean) => {
  if (!win || win.isDestroyed()) return false

  if (enabled) {
    // Keep a way to bring the visible minimal window forward without a taskbar button.
    createTray()
    if (!isMinimalWindowMode) {
      normalWindowWasMaximized = win.isMaximized()
      if (normalWindowWasMaximized) win.unmaximize()
      normalWindowBounds = win.getBounds()
    }

    isMinimalWindowMode = true
    win.setMinimumSize(1280, 400)
    win.setMaximumSize(1280, 400)
    win.setSize(1280, 400, true)
    win.setSkipTaskbar(true)
    return true
  }

  isMinimalWindowMode = false
  win.setMaximumSize(0, 0)
  win.setMinimumSize(1100, 700)
  if (normalWindowBounds) win.setBounds(normalWindowBounds, true)
  if (normalWindowWasMaximized) win.maximize()
  win.setSkipTaskbar(false)
  normalWindowBounds = null
  normalWindowWasMaximized = false
  return true
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
  stopAudioOverlayFullscreenMonitor()

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
  isQuitting = true
  microphone.stop()
  stopAudioOverlayTopmostGuard()
  stopAudioOverlayFullscreenMonitor()
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
  if (!win || win.isDestroyed()) {
    createWindow()
  } else {
    win.show()
    win.focus()
  }

  void syncAudioOverlayVisibility()
})

app.whenReady().then(() => {
  registerCustomWallpaperProtocol()
  registerAudioOverlayScreenListeners()
  createWindow()
  void syncAudioOverlayVisibility()
})
