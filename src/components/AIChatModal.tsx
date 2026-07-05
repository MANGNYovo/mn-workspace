import { FormEvent, KeyboardEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react'
import type {
  AccentColor,
  AIChatContext,
  AIChatRequestMessage,
  AIChatStoredMessage,
  AICommand,
} from '../types'
import { playbackIconMap } from '../constants'

type AIChatAPIResult = Awaited<ReturnType<typeof window.mnAPI.sendAIChatMessage>>

type AIChatModalProps = {
  isOpen: boolean
  isMinimized: boolean
  accentColor: AccentColor
  aiContext?: AIChatContext
  onClose: () => void
  onToggleMinimized: () => void
  onExecuteCommands?: (commands: AICommand[]) => void
}

const LOCAL_STORAGE_KEY = 'mn-ai-chat-messages-noah-v2'

const createAIMessageId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `ai-chat-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const normalizeStoredMessages = (value: unknown): AIChatStoredMessage[] => {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is AIChatStoredMessage => (
      Boolean(item) &&
      typeof item.id === 'string' &&
      (item.sender === 'user' || item.sender === 'ai') &&
      typeof item.text === 'string' &&
      typeof item.timestamp === 'number'
    ))
    .map((item) => ({
      id: item.id,
      sender: item.sender,
      text: item.text,
      timestamp: item.timestamp,
    }))
}

const safeLoadLocalMessages = (): AIChatStoredMessage[] => {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? normalizeStoredMessages(JSON.parse(raw)) : []
  } catch {
    return []
  }
}

const createAPIHistory = (messages: AIChatStoredMessage[]): AIChatRequestMessage[] => (
  messages
    .filter((message) => message.text.trim().length > 0)
    .slice(-10)
    .map((message) => ({
      role: message.sender === 'user' ? 'user' : 'assistant',
      content: message.text.trim(),
    }))
)

const createFailureReply = (result: Extract<AIChatAPIResult, { success: false }>) => {
  if (result.error === 'missing-openai-api-key') {
    return 'OPENAI_API_KEY가 .env에 설정되어 있지 않습니다.'
  }

  if (result.error === 'empty-message') {
    return '메시지를 입력해 주세요.'
  }

  return `요청을 처리하지 못했습니다. (${result.error})`
}

export function AIChatModal({
  isOpen,
  isMinimized,
  accentColor,
  aiContext,
  onClose,
  onToggleMinimized,
  onExecuteCommands,
}: AIChatModalProps) {
  const [messages, setMessages] = useState<AIChatStoredMessage[]>(safeLoadLocalMessages)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isRestoreHovered, setIsRestoreHovered] = useState(false)

  const modalRef = useRef<HTMLElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const activeRequestIdRef = useRef(0)
  const aiContextRef = useRef(aiContext)
  const onExecuteCommandsRef = useRef(onExecuteCommands)
  const dragStateRef = useRef<{
    pointerId: number
    offsetX: number
    offsetY: number
  } | null>(null)

  useEffect(() => {
    aiContextRef.current = aiContext
  }, [aiContext])

  useEffect(() => {
    onExecuteCommandsRef.current = onExecuteCommands
  }, [onExecuteCommands])

  useEffect(() => {
    if (isOpen) return

    dragStateRef.current = null
    setIsDragging(false)
    setPosition(null)
    setIsRestoreHovered(false)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    dragStateRef.current = null
    setIsDragging(false)
    setPosition(null)
    setIsRestoreHovered(false)
  }, [isMinimized, isOpen])

  useEffect(() => {
    if (!isOpen) return

    const keepInsideViewport = () => {
      const node = modalRef.current
      if (!node) return

      const rect = node.getBoundingClientRect()
      const maxX = Math.max(0, window.innerWidth - rect.width)
      const maxY = Math.max(0, window.innerHeight - rect.height)

      setPosition((current) => {
        if (!current) return current

        const x = Math.min(Math.max(0, current.x), maxX)
        const y = Math.min(Math.max(0, current.y), maxY)
        if (x === current.x && y === current.y) return current

        return { x, y }
      })
    }

    const frame = requestAnimationFrame(keepInsideViewport)
    window.addEventListener('resize', keepInsideViewport)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', keepInsideViewport)
    }
  }, [isOpen, isMinimized])

  useEffect(() => {
    let isCancelled = false

    const loadSavedHistory = async () => {
      try {
        const savedHistory = await window.mnAPI.loadAIChatHistory()
        if (isCancelled) return

        const savedMessages = normalizeStoredMessages(savedHistory?.messages)
        setMessages(savedMessages.length > 0 ? savedMessages : safeLoadLocalMessages())
      } catch {
        if (!isCancelled) setMessages(safeLoadLocalMessages())
      } finally {
        if (!isCancelled) setIsHistoryLoaded(true)
      }
    }

    void loadSavedHistory()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isHistoryLoaded) return

    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages))
    } catch {
      // localStorage가 막힌 환경이면 Electron 저장만 사용
    }

    void window.mnAPI.saveAIChatHistory({ messages })
  }, [messages, isHistoryLoaded])

  useEffect(() => {
    const node = textareaRef.current
    if (!node) return

    node.style.height = '0px'
    node.style.height = `${Math.min(node.scrollHeight, 92)}px`
  }, [input])

  useEffect(() => {
    if (!isOpen || isMinimized) return

    const frame = requestAnimationFrame(() => {
      textareaRef.current?.focus()
    })

    return () => cancelAnimationFrame(frame)
  }, [isOpen, isMinimized])

  useEffect(() => {
    if (!isHistoryLoaded || !isOpen || isMinimized) return

    const scrollToBottom = () => {
      const node = scrollRef.current
      if (node) node.scrollTop = node.scrollHeight
    }

    const frame = requestAnimationFrame(scrollToBottom)
    const timeoutId = window.setTimeout(scrollToBottom, 100)

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timeoutId)
    }
  }, [messages.length, isTyping, isHistoryLoaded, isOpen, isMinimized])

  const addAIMessage = (text: string) => {
    const message: AIChatStoredMessage = {
      id: createAIMessageId(),
      sender: 'ai',
      text,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, message])
  }

  const requestAIReply = async (apiMessages: AIChatRequestMessage[], requestId: number) => {
    setIsTyping(true)

    try {
      const result = await window.mnAPI.sendAIChatMessage(apiMessages, aiContextRef.current)
      if (activeRequestIdRef.current !== requestId) return

      if (result.success) {
        addAIMessage(result.message)

        if (Array.isArray(result.commands) && result.commands.length > 0) {
          onExecuteCommandsRef.current?.(result.commands)
        }
      } else {
        addAIMessage(createFailureReply(result as Extract<AIChatAPIResult, { success: false }>))
      }
    } catch (error) {
      if (activeRequestIdRef.current !== requestId) return

      addAIMessage(
        `요청을 처리하지 못했습니다. (${error instanceof Error ? error.message : 'unknown-error'})`,
      )
    } finally {
      if (activeRequestIdRef.current === requestId) setIsTyping(false)
    }
  }

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault()

    const text = input.trim()
    if (!text || isTyping || !isHistoryLoaded) return

    const userMessage: AIChatStoredMessage = {
      id: createAIMessageId(),
      sender: 'user',
      text,
      timestamp: Date.now(),
    }

    const nextMessages = [...messages, userMessage]
    const requestId = activeRequestIdRef.current + 1
    activeRequestIdRef.current = requestId

    setMessages(nextMessages)
    setInput('')
    void requestAIReply(createAPIHistory(nextMessages), requestId)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }

  const handleDragStart = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    if ((event.target as HTMLElement).closest('button, input, textarea, a')) return

    const node = modalRef.current
    if (!node) return

    const rect = node.getBoundingClientRect()
    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    }

    setPosition({ x: rect.left, y: rect.top })
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const handleDragMove = (event: ReactPointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current
    const node = modalRef.current
    if (!dragState || !node || dragState.pointerId !== event.pointerId) return

    const rect = node.getBoundingClientRect()
    const maxX = Math.max(0, window.innerWidth - rect.width)
    const maxY = Math.max(0, window.innerHeight - rect.height)

    setPosition({
      x: Math.min(Math.max(0, event.clientX - dragState.offsetX), maxX),
      y: Math.min(Math.max(0, event.clientY - dragState.offsetY), maxY),
    })
  }

  const handleDragEnd = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragStateRef.current?.pointerId !== event.pointerId) return

    dragStateRef.current = null
    setIsDragging(false)

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <section
      ref={modalRef}
      className={`ai-chat-modal ${isOpen ? 'open' : ''} ${isMinimized ? 'minimized' : ''} ${isDragging ? 'dragging' : ''}`}
      style={position ? { left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto' } : undefined}
      aria-label="AI Assistant"
      aria-hidden={!isOpen}
    >
      <header
        className="ai-chat-modal-header"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
      >
        <div className="ai-chat-modal-title">
          <span className="ai-chat-modal-status-dot" aria-hidden="true" />
          <span>AI Assistant</span>
        </div>

        <div className="ai-chat-modal-actions">
          <button
            type="button"
            className={`ai-chat-modal-control ${isMinimized ? 'restore' : ''}`}
            aria-label={isMinimized ? 'Restore AI chat' : 'Minimize AI chat'}
            title={isMinimized ? 'Restore' : 'Minimize'}
            onMouseEnter={() => setIsRestoreHovered(true)}
            onMouseLeave={() => setIsRestoreHovered(false)}
            onFocus={() => setIsRestoreHovered(true)}
            onBlur={() => setIsRestoreHovered(false)}
            onClick={onToggleMinimized}
          >
            {isMinimized ? (
              <img
                src={playbackIconMap.max[isRestoreHovered ? accentColor : 'gray']}
                alt=""
                className="ai-chat-modal-restore-icon"
                draggable={false}
              />
            ) : '−'}
          </button>
          <button
            type="button"
            className="ai-chat-modal-control close"
            aria-label="Close AI chat"
            title="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </header>

      {!isMinimized && (
        <>
          <div className="ai-chat-modal-log" ref={scrollRef} aria-live="polite">
            {isHistoryLoaded && messages.length === 0 && !isTyping && (
              <div className="ai-chat-modal-empty">
                <strong>Ready</strong>
                <span>Ask me to manage or check your schedules and to-do list.</span>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`ai-chat-modal-message-row ${message.sender}`}>
                <div className="ai-chat-modal-bubble">{message.text}</div>
              </div>
            ))}

            {isTyping && (
              <div className="ai-chat-modal-message-row ai">
                <div className="ai-chat-modal-bubble ai-chat-modal-typing" aria-label="AI is typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          <form className="ai-chat-modal-input-form" onSubmit={handleSubmit}>
            <textarea
              ref={textareaRef}
              value={input}
              rows={1}
              placeholder="Ask about schedules or to-do..."
              className="ai-chat-modal-input"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              autoComplete="off"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              type="submit"
              className="ai-chat-modal-send"
              aria-label="Send message"
              disabled={!input.trim() || isTyping || !isHistoryLoaded}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h13" />
                <path d="M13 6l6 6-6 6" />
              </svg>
            </button>
          </form>
        </>
      )}
    </section>
  )
}
