import { app, BrowserWindow, dialog, ipcMain, shell, Tray, Menu, protocol, Notification } from 'electron'
import { execFile } from 'node:child_process'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import dotenv from 'dotenv'
import OpenAI from 'openai'
import { google } from 'googleapis'
import electronUpdater from 'electron-updater'

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
let tray: Tray | null = null
let minimizeToTray = false
let isQuitting = false
let startedAtLogin = app.getLoginItemSettings().wasOpenedAtLogin

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

const AI_EMOTIONS = [
  'default',
  'smile',
  'joy',
  'sleepy',
  'surprised',
  'shy',
  'pout',
  'sad',
  'soft-sad',
  'gloomy',
  'angry-small',
  'done',
] as const

type AIEmotion = typeof AI_EMOTIONS[number]

const AI_CHAT_MAIN_CHARACTERS = ['cheong', 'noah'] as const
type AIChatCharacterId = typeof AI_CHAT_MAIN_CHARACTERS[number]

const AI_CHAT_SPEAKERS = ['cheong', 'noah'] as const
type AIChatSpeaker = typeof AI_CHAT_SPEAKERS[number]

type AIPriority = 'high' | 'medium' | 'low'
type AICommandTargetHint = 'latest' | 'matched' | 'selected' | 'today'

type AICommand = {
  type: 'calendar.create'
  payload: {
    title: string
    date: string | null
    time?: string | null
    color?: 'red' | 'blue' | 'green' | 'orange' | 'purple' | 'gray' | null
  }
} | {
  type: 'calendar.update'
  payload: {
    id?: string | null
    targetId?: string | null
    targetTitle?: string | null
    targetDate?: string | null
    targetHint?: AICommandTargetHint | null
    title?: string | null
    date?: string | null
    time?: string | null
    newTitle?: string | null
    newDate?: string | null
    newTime?: string | null
  }
} | {
  type: 'calendar.delete'
  payload: {
    id?: string | null
    targetId?: string | null
    targetTitle?: string | null
    targetDate?: string | null
    targetHint?: AICommandTargetHint | null
    title?: string | null
    date?: string | null
  }
} | {
  type: 'todo.create'
  payload: {
    title: string
    description?: string | null
    dueDate?: string | null
    priority?: AIPriority | null
    reminderEnabled?: boolean | null
  }
} | {
  type: 'todo.update'
  payload: {
    id?: string | null
    targetId?: string | null
    targetTitle?: string | null
    targetDueDate?: string | null
    targetHint?: AICommandTargetHint | null
    title?: string | null
    newTitle?: string | null
    description?: string | null
    dueDate?: string | null
    priority?: AIPriority | null
    reminderEnabled?: boolean | null
    completed?: boolean | null
  }
} | {
  type: 'todo.delete'
  payload: {
    id?: string | null
    targetId?: string | null
    targetTitle?: string | null
    targetDueDate?: string | null
    targetHint?: AICommandTargetHint | null
    title?: string | null
    dueDate?: string | null
  }
}

type AIChatContext = {
  currentDate?: unknown
  currentDateTime?: unknown
  selectedScheduleDate?: unknown
  schedules?: unknown
  todos?: unknown
}

type AIChatResponseMessage = {
  speaker: AIChatSpeaker
  message: string
  emotion?: AIEmotion
}

type AIChatRole = 'user' | 'assistant'

type AIChatRequestMessage = {
  role: AIChatRole
  content: string
}

type AIChatResponsePayload = {
  success: true
  emotion: AIEmotion
  message: string
  messages: AIChatResponseMessage[]
  action?: 'ask' | 'execute' | 'error'
  commands?: AICommand[]
  missingFields?: string[]
} | {
  success: false
  error: string
}

type AIChatStoredMessage = {
  id: string
  sender: 'user' | 'ai'
  text: string
  timestamp: number
  characterId?: AIChatCharacterId
  emotion?: AIEmotion
  speaker?: AIChatSpeaker
}

type AIChatHistoryPayload = {
  messages: AIChatStoredMessage[]
  emotion: AIEmotion
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

function normalizeAIChatCharacterId(value: unknown): AIChatCharacterId {
  return (AI_CHAT_MAIN_CHARACTERS as readonly unknown[]).includes(value) ? value as AIChatCharacterId : 'cheong'
}

function getDefaultAIEmotion(characterId: AIChatCharacterId = 'cheong'): AIEmotion {
  return characterId === 'noah' ? 'default' : 'default'
}

function normalizeAIEmotion(value: unknown, characterId: AIChatCharacterId = 'cheong'): AIEmotion {
  if (typeof value === 'string' && (AI_EMOTIONS as readonly string[]).includes(value)) {
    if (characterId === 'noah' && value === 'smile') return 'done'
    if (characterId === 'noah' && value !== 'default' && value !== 'done') return getDefaultAIEmotion(characterId)
    if (characterId === 'cheong' && value === 'done') return 'smile'
    return value as AIEmotion
  }

  return getDefaultAIEmotion(characterId)
}

function normalizeAIChatSpeaker(value: unknown, fallback: AIChatCharacterId = 'cheong'): AIChatSpeaker {
  return (AI_CHAT_SPEAKERS as readonly unknown[]).includes(value) ? value as AIChatSpeaker : fallback
}

function getStoredAIMessageCharacterId(item: Partial<AIChatStoredMessage>, requestedCharacterId: AIChatCharacterId): AIChatCharacterId | null {
  if (normalizeAIChatCharacterId(item.characterId) === item.characterId) return item.characterId

  if (item.sender === 'ai') {
    if (normalizeAIChatCharacterId(item.speaker) === item.speaker) return item.speaker
    return requestedCharacterId === 'cheong' ? 'cheong' : null
  }

  return requestedCharacterId === 'cheong' ? 'cheong' : null
}

function normalizeAIChatStoredMessage(value: unknown, characterId: AIChatCharacterId): AIChatStoredMessage | null {
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

  const messageCharacterId = getStoredAIMessageCharacterId(item, characterId)
  if (messageCharacterId !== characterId) return null

  return {
    id: item.id,
    sender: item.sender,
    text: item.text,
    timestamp: item.timestamp,
    characterId: messageCharacterId,
    emotion: item.emotion ? normalizeAIEmotion(item.emotion, characterId) : undefined,
    speaker: item.sender === 'ai' ? normalizeAIChatSpeaker(item.speaker, characterId) : undefined,
  }
}

function normalizeAIChatHistoryPayload(payload: unknown, characterId: AIChatCharacterId): AIChatHistoryPayload {
  if (!payload || typeof payload !== 'object') {
    return {
      messages: [],
      emotion: getDefaultAIEmotion(characterId),
    }
  }

  const item = payload as Partial<AIChatHistoryPayload>

  return {
    messages: Array.isArray(item.messages)
      ? item.messages
        .map((message) => normalizeAIChatStoredMessage(message, characterId))
        .filter((message): message is AIChatStoredMessage => Boolean(message))
      : [],
    emotion: normalizeAIEmotion(item.emotion, characterId),
  }
}

function sanitizeAIMessageText(message: string) {
  return message
    .replace(/(^|\n)\s*(오|아)(?:[,，]+|[.?!！？~…]+)\s+/g, '$1')
    .replace(/^\s*승연아[,，]\s*(?=.{12,})/, '')
    .replace(/승연아는/g, '승연이는')
    .replace(/승연아가/g, '승연이가')
    .replace(/승연아를/g, '승연이를')
    .replace(/승연아도/g, '승연이도')
    .replace(/승연아의/g, '승연이의')
    .replace(/승연아랑/g, '승연이랑')
    .replace(/승연아한테/g, '승연이한테')
    .replace(/승연아에게/g, '승연이한테')
    .replace(/청명이가/g, '내가')
    .replace(/청명은/g, '나는')
    .replace(/청명이는/g, '나는')
    .replace(/청명도/g, '나도')
    .replace(/청명을/g, '나를')
    .replace(/청명에게/g, '나한테')
    .replace(/청명한테/g, '나한테')
    .replace(/청명의/g, '내')
    .replace(/노아가/g, '내가')
    .replace(/노아는/g, '나는')
    .replace(/노아도/g, '나도')
    .replace(/노아를/g, '나를')
    .replace(/노아에게/g, '나한테')
    .replace(/노아한테/g, '나한테')
    .replace(/노아의/g, '내')
    .replace(/유청명은/g, '나는')
    .replace(/유청명도/g, '나도')
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
      emotion?: unknown
      message?: unknown
      messages?: unknown
      action?: unknown
      commands?: unknown
      missingFields?: unknown
    }
  } catch (error) {
    const firstJSONObjectText = extractFirstJSONObjectText(trimmedText)

    if (firstJSONObjectText && firstJSONObjectText !== trimmedText) {
      return JSON.parse(firstJSONObjectText) as {
        emotion?: unknown
        message?: unknown
        messages?: unknown
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

function normalizePriority(value: unknown): AIPriority | undefined {
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

function normalizeAIAction(value: unknown): 'ask' | 'execute' | 'error' | undefined {
  if (value === 'ask' || value === 'execute' || value === 'error') return value
  return undefined
}

function parseAIResponsePayload(rawText: string, characterId: AIChatCharacterId = 'cheong'): {
  emotion: AIEmotion
  message: string
  messages: AIChatResponseMessage[]
  action?: 'ask' | 'execute' | 'error'
  commands?: AICommand[]
  missingFields?: string[]
} {
  const parsed = parseAIResponseJSON(rawText)
  const fallbackEmotion = normalizeAIEmotion(parsed.emotion, characterId)
  const fallbackMessage = typeof parsed.message === 'string'
    ? sanitizeAIMessageText(parsed.message)
    : ''

  const firstMessage = Array.isArray(parsed.messages)
    ? parsed.messages
      .map((item): AIChatResponseMessage | null => {
        if (!item || typeof item !== 'object') return null

        const candidate = item as {
          speaker?: unknown
          emotion?: unknown
          message?: unknown
        }
        const message = typeof candidate.message === 'string'
          ? sanitizeAIMessageText(candidate.message)
          : ''

        if (!message) return null

        return {
          speaker: normalizeAIChatSpeaker(candidate.speaker, characterId),
          message,
          emotion: normalizeAIEmotion(candidate.emotion ?? fallbackEmotion, characterId),
        }
      })
      .filter((item): item is AIChatResponseMessage => Boolean(item))
      .at(0)
    : null

  const mainMessage = firstMessage ?? {
    speaker: characterId,
    message: fallbackMessage || '잠깐, 방금 신호가 좀 비었어. 다시 한 번 말해줄래?',
    emotion: fallbackEmotion,
  }

  const commands = normalizeAICommands(parsed.commands)
  const missingFields = normalizeMissingFields(parsed.missingFields)

  return {
    emotion: mainMessage.emotion ?? fallbackEmotion,
    message: mainMessage.message,
    messages: [mainMessage],
    action: normalizeAIAction(parsed.action) ?? (commands.length > 0 ? 'execute' : missingFields ? 'ask' : undefined),
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

// ─── Lore 파일 경로 ──────────────────────────────────────────────────────────
function getCheongLoreFilePath() {
  // 개발환경: electron/ 폴더 옆, 빌드: exe 옆 (package.json extraFiles 설정)
  return [
    path.join(process.env.APP_ROOT ?? '', 'electron', 'cheong-lore.json'),
    path.join(path.dirname(app.getPath('exe')), 'cheong-lore.json'),
  ]
}

// lore 파일에서 캐릭터 설정을 읽어 시스템 프롬프트 생성
async function createCheongDeveloperPrompt(): Promise<string> {
  // lore 파일 로드 시도 (개발/빌드 환경 순서로)
  let loreItems: Array<{ section: string; content: string }> = []

  for (const lorePath of getCheongLoreFilePath()) {
    try {
      const raw = await readJsonFile(lorePath)
      if (Array.isArray(raw) && raw.length > 0) {
        loreItems = raw
        break
      }
    } catch {
      // 다음 경로 시도
    }
  }

  // lore에서 읽은 캐릭터 설명 조합
  const loreContent = loreItems.length > 0
    ? loreItems.map((item) => item.content).join(' ')
    : ''

  // AI 응답 형식 규칙 (캐릭터와 무관한 기술적 지시사항 — lore에 넣지 않음)
  const systemRules = [
    '너는 "청명"이라는 이름의 AI 캐릭터다. 사용자 이름은 "승연"이다.',
    loreContent,
    '청명은 자신을 3인칭으로 부르지 않는다. 자신은 "나", "내", "내가", "나한테", "나도"라고 말한다.',
    '승연이 이름을 억지로 자주 부르지 않는다. 이름을 불러야 자연스러운 상황에서만 "승연 씨"라고 부른다.',
    '현재 대화 중인 캐릭터가 청명일 때는 노아처럼 일정이나 투두를 직접 실행하지 않는다. 비서 기능이 필요하면 노아에게 말하라고 짧게 안내할 수 있다.',
    'messages 배열에도 speaker는 반드시 "cheong"만 사용한다.',
    '사용자의 말에 상담사나 비서처럼 과하게 정리해서 답하지 않는다. 짧고 자연스럽게 반응한다.',
    '답변은 반드시 JSON 하나로만 출력한다.',
    '스키마: {"emotion":"default|smile|joy|sleepy|surprised|shy|pout|sad|soft-sad|gloomy|angry-small","message":"청명의 답변","messages":[{"speaker":"cheong","emotion":"same emotion","message":"청명의 답변"}]}',
    'emotion 규칙: default는 평온함, smile은 작은 미소/기분 좋음, joy는 조용한 즐거움, sleepy는 나른함/졸림, surprised는 놀람, shy는 부끄러움, pout은 삐짐, sad는 슬픔, soft-sad는 약간 슬픔, gloomy는 우울/무기력, angry-small은 작게 화남/차가운 짜증에 쓴다.',
    'JSON 외의 문장, 설명, 마크다운, 코드블록은 절대 출력하지 않는다.',
  ].filter(Boolean).join(' ')

  return systemRules
}

function createNoahDeveloperPrompt(context: AIChatContext): string {
  const safeContext = normalizeAIChatContext(context)
  const contextText = JSON.stringify(safeContext)

  return [
    '너는 "노아"라는 이름의 일정/할 일 관리 전용 AI 비서다. 사용자 이름은 "승연"이다. 필요할 때만 자연스럽게 "승연님"이라고 부른다.',
    '노아는 차분하고 부드러운 비서 말투로 말한다. 답변은 너무 짧게 끊지 말고 1~2문장 정도로 자연스럽게 말하되, 장황하게 설명하지 않는다. 모든 실제 앱 조작은 네가 직접 하는 것이 아니라 commands 배열로 앱에 전달한다.',
    '현재 날짜와 시간 기준은 Asia/Seoul이다. 상대 날짜는 APP_CONTEXT.currentDate/currentDateTime을 기준으로 ISO 날짜 YYYY-MM-DD로 해석한다.',
    '월이 생략된 "19일" 같은 표현은 현재 월의 해당 일이 아직 지나지 않았으면 현재 월, 이미 지났으면 다음 달로 해석한다.',
    '일정 생성 최소 조건은 title과 date다. time은 선택값이다. 제목과 날짜가 있으면 시간이 없어도 바로 calendar.create 명령을 만든다.',
    '할 일 생성 최소 조건은 title이다. dueDate, priority, reminderEnabled는 선택값이다. 제목이 있으면 마감기한/중요도가 없어도 바로 todo.create 명령을 만든다.',
    '필수 정보가 부족할 때만 action:"ask"로 질문하고 commands는 비운다. 선택값만 부족한 경우에는 되묻지 않는다.',
    '호칭은 매 답변마다 반복하지 않는다. 인사, 확인, 되묻기, 조금 더 정중하게 말해야 하는 상황에서만 "승연님"을 자연스럽게 사용한다. 예: "승연님, 어떤 할 일을 삭제할까요?" / 단순 완료는 "일정 추가해둘게요."처럼 호칭 없이 말해도 된다.',
    '수정 요청은 APP_CONTEXT.schedules와 APP_CONTEXT.todos에서 가장 잘 맞는 항목을 고른다. id를 알 수 있으면 targetId 또는 id를 넣는다. "방금", "최근"은 targetHint:"latest"를 쓴다.',
    '일정 수정은 calendar.update를 사용한다. 변경값은 newTitle/newDate/newTime에 넣고, 찾을 조건은 targetId/targetTitle/targetDate/targetHint에 넣는다.',
    '일정 삭제 요청은 calendar.delete를 사용한다. APP_CONTEXT.schedules에서 가장 잘 맞는 항목을 골라 targetId 또는 targetTitle/targetDate/targetHint를 넣는다. 찾을 수 있으면 지원하지 않는다고 말하지 말고 calendar.delete 명령을 만든다. 삭제할 항목이 전혀 특정되지 않으면 action:"ask"로 어떤 일정을 삭제할지 묻고 commands는 비운다.',
    '할 일 수정은 todo.update를 사용한다. 변경값은 newTitle/dueDate/priority/description/reminderEnabled/completed에 넣고, 찾을 조건은 targetId/targetTitle/targetDueDate/targetHint에 넣는다.',
    '할 일 삭제 요청은 todo.delete를 사용한다. APP_CONTEXT.todos에서 가장 잘 맞는 항목을 골라 targetId 또는 targetTitle/targetDueDate/targetHint를 넣는다. 찾을 수 있으면 지원하지 않는다고 말하지 말고 todo.delete 명령을 만든다. 삭제할 항목이 전혀 특정되지 않으면 action:"ask"로 어떤 할 일을 삭제할지 묻고 commands는 비운다.',
    '완료 답변을 할 때 emotion은 "done"을 사용한다. 추가/수정 명령을 실행할 때 action은 "execute"를 사용한다.',
    '답변은 반드시 JSON 하나로만 출력한다. JSON 외 문장, 설명, 마크다운, 코드블록은 절대 출력하지 않는다.',
    '스키마: {"emotion":"default|done","action":"ask|execute|error","message":"사용자에게 보여줄 짧은 답변","messages":[{"speaker":"noah","emotion":"default|done","message":"같은 답변"}],"commands":[{"type":"calendar.create|calendar.update|calendar.delete|todo.create|todo.update|todo.delete","payload":{}}],"missingFields":["필요한 필드"]}',
    'calendar.create payload 예시: {"title":"치과예약","date":"2026-07-19","time":null}',
    'calendar.update payload 예시: {"targetTitle":"치과예약","targetHint":"latest","newTime":"15:00"}',
    'calendar.delete payload 예시: {"targetTitle":"치과예약","targetHint":"matched"}',
    'todo.create payload 예시: {"title":"문제집 독해","dueDate":null,"priority":"medium","reminderEnabled":false}',
    'todo.update payload 예시: {"targetTitle":"문제집 독해","priority":"high"}',
    'todo.delete payload 예시: {"targetTitle":"문제집 독해","targetHint":"matched"}',
    `APP_CONTEXT=${contextText}`,
  ].join(' ')
}

async function createAIChatDeveloperPrompt(characterId: AIChatCharacterId, context: AIChatContext): Promise<string> {
  if (characterId === 'noah') return createNoahDeveloperPrompt(context)
  return createCheongDeveloperPrompt()
}

// ─── AI Chat IPC 핸들러 ─────────────────────────────────────────────────────

ipcMain.handle('ai-chat:load-history', async (_event, characterIdPayload?: unknown): Promise<AIChatHistoryPayload> => {
  const characterId = normalizeAIChatCharacterId(characterIdPayload)

  try {
    const characterHistory = await readJsonFile(getAIChatHistoryFilePath(characterId))

    if (characterHistory) {
      return normalizeAIChatHistoryPayload(characterHistory, characterId)
    }

    return normalizeAIChatHistoryPayload(null, characterId)
  } catch (error) {
    console.error('Failed to load AI chat history:', error)
    return {
      messages: [],
      emotion: getDefaultAIEmotion(characterId),
    }
  }
})

ipcMain.handle('ai-chat:save-history', async (_event, characterIdPayload: unknown, payload: unknown): Promise<boolean> => {
  const characterId = normalizeAIChatCharacterId(characterIdPayload)

  try {
    await writeJsonFile(getAIChatHistoryFilePath(characterId), normalizeAIChatHistoryPayload(payload, characterId))
    return true
  } catch (error) {
    console.error('Failed to save AI chat history:', error)
    return false
  }
})

ipcMain.handle('ai-chat:clear-history', async (_event, characterIdPayload?: unknown): Promise<boolean> => {
  const characterId = normalizeAIChatCharacterId(characterIdPayload)

  try {
    await writeJsonFile(getAIChatHistoryFilePath(characterId), {
      messages: [],
      emotion: getDefaultAIEmotion(characterId),
    })
    return true
  } catch (error) {
    console.error('Failed to clear AI chat history:', error)
    return false
  }
})

ipcMain.handle('ai-chat:send', async (_event, payload: { characterId?: unknown; messages?: unknown; context?: unknown }): Promise<AIChatResponsePayload> => {
  try {
    const client = getOpenAIClient()
    const characterId = normalizeAIChatCharacterId(payload?.characterId)
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
          content: await createAIChatDeveloperPrompt(characterId, context),
        },
        ...messages,
      ],
      text: {
        format: {
          type: 'json_object',
        },
      },
      temperature: characterId === 'noah' ? 0.2 : 0.85,
      max_output_tokens: characterId === 'noah' ? 650 : 500,
    })

    const rawText = response.output_text?.trim() ?? ''
    return {
      success: true,
      ...parseAIResponsePayload(rawText, characterId),
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

type PlaylistCoverTheme = 'light' | 'dark'
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

function getLikedTracksFilePath() {
  return path.join(app.getPath('userData'), 'liked-tracks.json')
}

function getAIChatHistoryFilePath(characterId: AIChatCharacterId = 'cheong') {
  return path.join(app.getPath('userData'), `ai-chat-history-${characterId}.json`)
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

app.whenReady().then(() => {
  registerCustomWallpaperProtocol()
  createWindow()
})