import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AIChatCharacterId,
  AIChatContext,
  AIChatRequestMessage,
  AIChatSpeaker,
  AICommand,
  AIEmotion,
} from '../types'

export type { AIChatCharacterId, AIEmotion } from '../types'

type AIChatMessage = {
  id: string
  sender: 'user' | 'ai'
  text: string
  timestamp: number
  characterId?: AIChatCharacterId
  emotion?: AIEmotion
  speaker?: AIChatSpeaker
}

type AIChatReply = {
  speaker: AIChatSpeaker
  message: string
  emotion?: AIEmotion
}

type AIChatAPIResult = Awaited<ReturnType<typeof window.mnAPI.sendAIChatMessage>>

export type AIChatNotification = {
  text: string
  characterId: AIChatCharacterId
  characterName: string
}

type AIChatPageProps = {
  isActive?: boolean
  aiContext?: AIChatContext
  onNotify?: (notification: AIChatNotification) => void
  onExecuteCommands?: (commands: AICommand[], characterId: AIChatCharacterId) => void
}

type CharacterConfig = {
  id: AIChatCharacterId
  name: string
  description: string
  defaultEmotion: AIEmotion
  emotions: AIEmotion[]
  placeholder: string
}

const CHARACTER_STORAGE_KEY = 'mn-ai-chat-character-v2'

const CHEONG_EMOTIONS: AIEmotion[] = [
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
]

const NOAH_EMOTIONS: AIEmotion[] = ['default', 'done']

const CHARACTER_CONFIGS: Record<AIChatCharacterId, CharacterConfig> = {
  cheong: {
    id: 'cheong',
    name: '청명',
    description: 'Quiet, cool, quietly caring',
    defaultEmotion: 'default',
    emotions: CHEONG_EMOTIONS,
    placeholder: 'Message...',
  },
  noah: {
    id: 'noah',
    name: '노아',
    description: 'Schedule and to-do assistant',
    defaultEmotion: 'default',
    emotions: NOAH_EMOTIONS,
    placeholder: 'Ask Noah to add or edit schedules and tasks...',
  },
}

const CHARACTER_MENU_ORDER: AIChatCharacterId[] = ['noah', 'cheong']

const SPEAKER_LABELS: Record<AIChatSpeaker, string> = {
  cheong: '청명',
  noah: '노아',
}

const CHEONG_EXPRESSION_IMAGES = import.meta.glob('../assets/cheong-*.*', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const NOAH_EXPRESSION_IMAGES = import.meta.glob('../assets/noah-*.*', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const isCharacterId = (value: unknown): value is AIChatCharacterId => (
  value === 'cheong' || value === 'noah'
)

const getStorageKey = (characterId: AIChatCharacterId, kind: 'messages' | 'emotion') => (
  `mn-ai-chat-${kind}-${characterId}-v2`
)

const getDefaultEmotion = (characterId: AIChatCharacterId): AIEmotion => (
  CHARACTER_CONFIGS[characterId].defaultEmotion
)

const getCharacterExpressionImage = (characterId: AIChatCharacterId, emotion: AIEmotion) => {
  if (characterId === 'noah') {
    return NOAH_EXPRESSION_IMAGES[`../assets/noah-${emotion}.png`]
      ?? NOAH_EXPRESSION_IMAGES['../assets/noah-default.png']
      ?? ''
  }

  return CHEONG_EXPRESSION_IMAGES[`../assets/cheong-${emotion}.png`]
    ?? CHEONG_EXPRESSION_IMAGES['../assets/cheong-default.png']
    ?? ''
}

const createAIMessageId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `ai-chat-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const formatMessageTime = (timestamp: number) => {
  try {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

const normalizeAIEmotion = (value: unknown, characterId: AIChatCharacterId): AIEmotion => {
  if (typeof value === 'string' && CHARACTER_CONFIGS[characterId].emotions.includes(value as AIEmotion)) {
    return value as AIEmotion
  }

  if (characterId === 'cheong' && typeof value === 'string' && CHEONG_EMOTIONS.includes(value as AIEmotion)) {
    return value as AIEmotion
  }

  if (characterId === 'noah' && value === 'smile') return 'done'

  return getDefaultEmotion(characterId)
}

const normalizeSpeaker = (value: unknown, fallback: AIChatCharacterId): AIChatSpeaker => (
  isCharacterId(value) ? value : fallback
)

const getStoredMessageCharacterId = (item: Partial<AIChatMessage>, requestedCharacterId: AIChatCharacterId): AIChatCharacterId | null => {
  if (isCharacterId(item.characterId)) return item.characterId

  if (item.sender === 'ai') {
    if (isCharacterId(item.speaker)) return item.speaker
    return requestedCharacterId === 'cheong' ? 'cheong' : null
  }

  return requestedCharacterId === 'cheong' ? 'cheong' : null
}

const safeLoadCharacter = (): AIChatCharacterId => {
  try {
    const stored = window.localStorage.getItem(CHARACTER_STORAGE_KEY)
    return isCharacterId(stored) ? stored : 'noah'
  } catch {
    return 'noah'
  }
}

const cleanupLegacyLocalStorage = () => {
  try {
    ;[
      'mn-ai-chat-messages-luka-v1',
      'mn-ai-chat-emotion-luka-v1',
      'mn-ai-chat-messages-v1',
      'mn-ai-chat-emotion-v1',
      'mn-ai-chat-messages-cheong-v1',
      'mn-ai-chat-emotion-cheong-v1',
    ].forEach((key) => window.localStorage.removeItem(key))
  } catch {
    // localStorage가 막힌 환경이면 무시
  }
}

const normalizeStoredMessages = (value: unknown, characterId: AIChatCharacterId): AIChatMessage[] => {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is AIChatMessage => (
      item &&
      typeof item.id === 'string' &&
      (item.sender === 'user' || item.sender === 'ai') &&
      typeof item.text === 'string' &&
      typeof item.timestamp === 'number'
    ))
    .map((item): AIChatMessage | null => {
      const messageCharacterId = getStoredMessageCharacterId(item, characterId)
      if (messageCharacterId !== characterId) return null

      return {
        ...item,
        characterId: messageCharacterId,
        emotion: item.emotion ? normalizeAIEmotion(item.emotion, characterId) : undefined,
        speaker: item.sender === 'ai' ? normalizeSpeaker(item.speaker, characterId) : undefined,
      }
    })
    .filter((item): item is AIChatMessage => Boolean(item))
}

const safeLoadMessages = (characterId: AIChatCharacterId): AIChatMessage[] => {
  try {
    const raw = window.localStorage.getItem(getStorageKey(characterId, 'messages'))
    if (!raw) return []
    return normalizeStoredMessages(JSON.parse(raw), characterId)
  } catch {
    return []
  }
}

const safeLoadEmotion = (characterId: AIChatCharacterId): AIEmotion => {
  try {
    return normalizeAIEmotion(window.localStorage.getItem(getStorageKey(characterId, 'emotion')), characterId)
  } catch {
    return getDefaultEmotion(characterId)
  }
}

const normalizeAIReplyMessages = (
  result: Extract<AIChatAPIResult, { success: true }>,
  characterId: AIChatCharacterId,
): AIChatReply[] => {
  const replies = Array.isArray(result.messages)
    ? result.messages
      .map((item): AIChatReply | null => {
        const message = typeof item.message === 'string' ? item.message.trim() : ''
        if (!message) return null

        return {
          speaker: normalizeSpeaker(item.speaker, characterId),
          message,
          emotion: normalizeAIEmotion(item.emotion ?? result.emotion, characterId),
        }
      })
      .filter((item): item is AIChatReply => Boolean(item))
      .slice(0, 1)
    : []

  if (replies.length > 0) return replies

  return [{
    speaker: characterId,
    emotion: normalizeAIEmotion(result.emotion, characterId),
    message: result.message,
  }]
}

const createAPIHistory = (messages: AIChatMessage[], characterId: AIChatCharacterId): AIChatRequestMessage[] => {
  return messages
    .filter((message) => (message.characterId ?? characterId) === characterId)
    .filter((message) => message.text.trim().length > 0)
    .slice(-10)
    .map((message) => {
      if (message.sender === 'user') {
        return {
          role: 'user',
          content: message.text.trim(),
        }
      }

      const speaker = message.speaker ?? characterId
      return {
        role: 'assistant',
        content: `${SPEAKER_LABELS[speaker]}: ${message.text.trim()}`,
      }
    })
}

const createFailureReply = (
  result: Extract<AIChatAPIResult, { success: false }>,
  characterId: AIChatCharacterId,
): { emotion: AIEmotion; text: string } => {
  const fallbackEmotion = characterId === 'noah' ? 'default' : 'gloomy'

  if (result.error === 'missing-openai-api-key') {
    return {
      emotion: fallbackEmotion,
      text: 'OPENAI_API_KEY가 .env에 아직 없어서 AI 연결이 안 됐어. 프로젝트 루트의 .env에 OPENAI_API_KEY를 추가해줘.',
    }
  }

  if (result.error === 'empty-message') {
    return {
      emotion: fallbackEmotion,
      text: '메시지가 비어있어서 답장을 못 만들었어. 다시 한 번 보내줘.',
    }
  }

  return {
    emotion: fallbackEmotion,
    text: `AI 연결 중 문제가 생겼어. (${result.error})`,
  }
}

export function AIChatPage({ isActive = true, aiContext, onNotify, onExecuteCommands }: AIChatPageProps = {}) {
  const [currentCharacterId, setCurrentCharacterId] = useState<AIChatCharacterId>(() => safeLoadCharacter())
  const [isCharacterMenuOpen, setIsCharacterMenuOpen] = useState(false)
  const [messages, setMessages] = useState<AIChatMessage[]>(() => safeLoadMessages(safeLoadCharacter()))
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false)
  const [loadedCharacterId, setLoadedCharacterId] = useState<AIChatCharacterId | null>(null)
  const [emotion, setEmotion] = useState<AIEmotion>(() => safeLoadEmotion(safeLoadCharacter()))

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const activeRequestIdRef = useRef(0)
  const isActiveRef = useRef(isActive)
  const onNotifyRef = useRef(onNotify)
  const onExecuteCommandsRef = useRef(onExecuteCommands)
  const aiContextRef = useRef(aiContext)

  const currentCharacter = CHARACTER_CONFIGS[currentCharacterId]

  const scrollChatToBottom = () => {
    const scrollNode = scrollRef.current
    if (!scrollNode) return

    scrollNode.scrollTop = scrollNode.scrollHeight
  }

  const statusText = useMemo(() => {
    if (isTyping) return 'Thinking...'
    if (currentCharacterId === 'noah') return emotion === 'done' ? 'Done' : 'Ready'

    const labelMap: Partial<Record<AIEmotion, string>> = {
      default: 'Calm',
      smile: 'Smile',
      joy: 'Joy',
      sleepy: 'Sleepy',
      surprised: 'Surprised',
      shy: 'Shy',
      pout: 'Pout',
      sad: 'Sad',
      'soft-sad': 'Soft sad',
      gloomy: 'Gloomy',
      'angry-small': 'Annoyed',
    }
    return labelMap[emotion] ?? 'Calm'
  }, [currentCharacterId, emotion, isTyping])

  useEffect(() => {
    cleanupLegacyLocalStorage()
  }, [])

  useEffect(() => {
    isActiveRef.current = isActive
  }, [isActive])

  useEffect(() => {
    onNotifyRef.current = onNotify
  }, [onNotify])

  useEffect(() => {
    onExecuteCommandsRef.current = onExecuteCommands
  }, [onExecuteCommands])

  useEffect(() => {
    aiContextRef.current = aiContext
  }, [aiContext])

  useEffect(() => {
    try {
      window.localStorage.setItem(CHARACTER_STORAGE_KEY, currentCharacterId)
    } catch {
      // localStorage가 막힌 환경이면 무시
    }
  }, [currentCharacterId])

  useEffect(() => {
    const targetCharacterId = currentCharacterId
    let isCancelled = false
    activeRequestIdRef.current += 1
    setInput('')
    setIsTyping(false)
    setIsCharacterMenuOpen(false)
    setIsHistoryLoaded(false)
    setLoadedCharacterId(null)
    setMessages(safeLoadMessages(targetCharacterId))
    setEmotion(safeLoadEmotion(targetCharacterId))

    const loadSavedHistory = async () => {
      try {
        const savedHistory = await window.mnAPI.loadAIChatHistory(targetCharacterId)

        if (isCancelled) return

        const savedMessages = normalizeStoredMessages(savedHistory?.messages, targetCharacterId)
        setMessages(savedMessages.length > 0 ? savedMessages : safeLoadMessages(targetCharacterId))
        setEmotion(normalizeAIEmotion(savedHistory?.emotion, targetCharacterId))
      } catch {
        if (!isCancelled) {
          setMessages(safeLoadMessages(targetCharacterId))
          setEmotion(safeLoadEmotion(targetCharacterId))
        }
      } finally {
        if (!isCancelled) {
          setLoadedCharacterId(targetCharacterId)
          setIsHistoryLoaded(true)
        }
      }
    }

    void loadSavedHistory()

    return () => {
      isCancelled = true
    }
  }, [currentCharacterId])

  useEffect(() => {
    if (!isHistoryLoaded || loadedCharacterId !== currentCharacterId) return

    const characterMessages = messages
      .map((message) => ({
        ...message,
        characterId: message.characterId ?? currentCharacterId,
      }))
      .filter((message) => message.characterId === currentCharacterId)

    window.localStorage.setItem(getStorageKey(currentCharacterId, 'messages'), JSON.stringify(characterMessages))
    window.localStorage.setItem(getStorageKey(currentCharacterId, 'emotion'), emotion)
    void window.mnAPI.saveAIChatHistory(currentCharacterId, {
      messages: characterMessages,
      emotion,
    })
  }, [messages, emotion, isHistoryLoaded, loadedCharacterId, currentCharacterId])

  useEffect(() => {
    const node = textareaRef.current
    if (!node) return
    node.style.height = '0px'
    node.style.height = `${Math.min(node.scrollHeight, 128)}px`
  }, [input])

  useEffect(() => {
    if (!isHistoryLoaded) return
    if (!isActive && messages.length === 0) return

    const frame = requestAnimationFrame(() => {
      scrollChatToBottom()
      requestAnimationFrame(scrollChatToBottom)
    })
    const timeoutId = window.setTimeout(scrollChatToBottom, 120)

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timeoutId)
    }
  }, [messages.length, isTyping, isHistoryLoaded, isActive])

  const addAIReplyMessages = (replies: AIChatReply[]) => {
    const safeReplies: AIChatReply[] = replies.length > 0
      ? replies
      : [{
        speaker: currentCharacterId,
        emotion: getDefaultEmotion(currentCharacterId),
        message: '잠깐, 방금 신호가 좀 비었어. 다시 한 번 말해줄래?',
      }]
    const timestamp = Date.now()
    const aiMessages: AIChatMessage[] = safeReplies.map((reply, index) => ({
      id: createAIMessageId(),
      sender: 'ai',
      text: reply.message,
      timestamp: timestamp + index,
      emotion: reply.emotion,
      speaker: reply.speaker,
      characterId: reply.speaker,
    }))
    const notificationReply = safeReplies[0]

    setMessages((prev) => [...prev, ...aiMessages])

    if (safeReplies[0]?.emotion) {
      setEmotion(normalizeAIEmotion(safeReplies[0].emotion, currentCharacterId))
    }

    if (!isActiveRef.current) {
      onNotifyRef.current?.({
        text: notificationReply.message,
        characterId: currentCharacterId,
        characterName: currentCharacter.name,
      })
    }
  }

  const addAIMessage = (text: string, nextEmotion: AIEmotion) => {
    addAIReplyMessages([{
      speaker: currentCharacterId,
      emotion: nextEmotion,
      message: text,
    }])
  }

  const requestAIReply = async (apiMessages: AIChatRequestMessage[], requestId: number, characterId: AIChatCharacterId) => {
    setIsTyping(true)

    try {
      const result = await window.mnAPI.sendAIChatMessage(characterId, apiMessages, aiContextRef.current)

      if (activeRequestIdRef.current !== requestId) return

      if (result.success) {
        addAIReplyMessages(normalizeAIReplyMessages(result, characterId))

        if (characterId === 'noah' && Array.isArray(result.commands) && result.commands.length > 0) {
          onExecuteCommandsRef.current?.(result.commands, characterId)
        }
      } else {
        const failureReply = createFailureReply(result as Extract<AIChatAPIResult, { success: false }>, characterId)
        addAIMessage(failureReply.text, failureReply.emotion)
      }
    } catch (error) {
      if (activeRequestIdRef.current !== requestId) return

      addAIMessage(
        `${CHARACTER_CONFIGS[characterId].name} 호출 중 오류가 났어. (${error instanceof Error ? error.message : 'unknown-error'})`,
        getDefaultEmotion(characterId),
      )
    } finally {
      if (activeRequestIdRef.current === requestId) {
        setIsTyping(false)
      }
    }
  }

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault()
    const text = input.trim()
    if (!text || isTyping || !isHistoryLoaded) return

    const characterId = currentCharacterId
    const userMessage: AIChatMessage = {
      id: createAIMessageId(),
      sender: 'user',
      text,
      timestamp: Date.now(),
      characterId,
    }

    const nextMessages = [...messages, userMessage]
    const requestId = activeRequestIdRef.current + 1
    activeRequestIdRef.current = requestId

    setMessages(nextMessages)
    setInput('')

    void requestAIReply(createAPIHistory(nextMessages, characterId), requestId, characterId)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSubmit()
    }
  }

  const handleReset = () => {
    activeRequestIdRef.current += 1
    setMessages([])
    setInput('')
    setIsTyping(false)
    setEmotion(getDefaultEmotion(currentCharacterId))
    window.localStorage.removeItem(getStorageKey(currentCharacterId, 'messages'))
    window.localStorage.removeItem(getStorageKey(currentCharacterId, 'emotion'))
    void window.mnAPI.clearAIChatHistory(currentCharacterId)
  }

  const handleSelectCharacter = (characterId: AIChatCharacterId) => {
    if (characterId === currentCharacterId) {
      setIsCharacterMenuOpen(false)
      return
    }

    activeRequestIdRef.current += 1
    setIsCharacterMenuOpen(false)
    setInput('')
    setIsTyping(false)
    setIsHistoryLoaded(false)
    setLoadedCharacterId(null)
    setMessages(safeLoadMessages(characterId))
    setEmotion(safeLoadEmotion(characterId))
    setCurrentCharacterId(characterId)
  }

  const currentExpressionImage = getCharacterExpressionImage(currentCharacterId, emotion)

  return (
    <section className="ai-chat-page" aria-label="AI Chat">
      <header className="ai-chat-header">
        <div>
          <h1>AI Chat</h1>
          <p>{currentCharacter.name} is connected.</p>
        </div>
        <div className="ai-chat-header-actions">
          <div className="ai-chat-character-switcher">
            <button
              type="button"
              className="ai-chat-character-button"
              aria-label="Change AI character"
              aria-expanded={isCharacterMenuOpen}
              title="Change character"
              onClick={() => setIsCharacterMenuOpen((prev) => !prev)}
            >
              <span className="ai-chat-character-dot" />
              <span>{currentCharacter.name}</span>
            </button>
            {isCharacterMenuOpen && (
              <div className="ai-chat-character-menu" role="menu">
                {CHARACTER_MENU_ORDER.map((characterId) => {
                  const character = CHARACTER_CONFIGS[characterId]
                  return (
                    <button
                      key={character.id}
                      type="button"
                      className={character.id === currentCharacterId ? 'active' : ''}
                      role="menuitem"
                      onClick={() => handleSelectCharacter(character.id)}
                    >
                      <strong>{character.name}</strong>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <button
            type="button"
            className="ai-chat-reset-button"
            aria-label="Reset AI chat"
            title="Reset chat"
            onClick={handleReset}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 12a8 8 0 1 1-2.34-5.66" />
              <path d="M20 4v5h-5" />
            </svg>
          </button>
        </div>
      </header>

      <div className="ai-chat-panel">
        <div className="ai-character-slot" data-character={currentCharacterId} data-emotion={emotion} aria-label={`${currentCharacter.name} expression: ${statusText}`}>
          <div className={`ai-character-figure ${currentExpressionImage ? 'has-image' : ''}`}>
            {currentExpressionImage ? (
              <img src={currentExpressionImage} alt="" className="ai-character-image" draggable={false} />
            ) : (
              <div className="ai-character-face">
                <span className="ai-eye ai-eye-left" />
                <span className="ai-eye ai-eye-right" />
                <span className="ai-mouth" />
              </div>
            )}
          </div>
        </div>

        <div className="ai-chat-log" ref={scrollRef}>
          {isHistoryLoaded && messages.length === 0 && !isTyping && (
            <div className="ai-chat-empty">
              <strong>Ready</strong>
              <span>{currentCharacter.name} 연결 완료!<br />어서와🥰</span>
            </div>
          )}

          {messages.map((message) => {
            const speaker: AIChatSpeaker = message.sender === 'ai'
              ? normalizeSpeaker(message.speaker, currentCharacterId)
              : currentCharacterId

            return (
              <div
                key={message.id}
                className={`ai-chat-message-row ${message.sender} speaker-${speaker}`}
              >
                <div className="ai-chat-message-stack">
                  <div className="ai-chat-bubble">{message.text}</div>
                  <time className="ai-chat-time">{formatMessageTime(message.timestamp)}</time>
                </div>
              </div>
            )
          })}

          {isTyping && (
            <div className={`ai-chat-message-row ai speaker-${currentCharacterId}`}>
              <div className="ai-chat-message-stack">
                <div className="ai-chat-bubble ai-typing-bubble" aria-label="AI is typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}
        </div>

        <form className="ai-chat-input-form" onSubmit={(event) => void handleSubmit(event)}>
          <textarea
            ref={textareaRef}
            value={input}
            rows={1}
            placeholder={currentCharacter.placeholder}
            className="ai-chat-input"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            autoComplete="off"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="submit"
            className="ai-chat-send-button"
            aria-label="Send message"
            disabled={!input.trim() || isTyping || !isHistoryLoaded}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h13" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>
      </div>
    </section>
  )
}
