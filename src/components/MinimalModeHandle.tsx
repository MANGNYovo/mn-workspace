import { useEffect, useRef, useState, type PointerEvent } from 'react'
import '../styles/minimal-handle.css'

type Props = { active: boolean; disabled: boolean; onToggle: () => Promise<boolean> }
const USED_KEY = 'mn-minimal-handle-used'

export function MinimalModeHandle({ active, disabled, onToggle }: Props) {
  const [progress, setProgress] = useState(0)
  const [hint, setHint] = useState(false)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const start = useRef<{ x: number; y: number } | null>(null)
  const hintShown = useRef(false)
  const hintTimer = useRef<ReturnType<typeof setTimeout>>()
  const toggleRef = useRef(onToggle)
  toggleRef.current = onToggle

  const reset = () => { start.current = null; setProgress(0) }
  const toggle = async () => {
    if (busyRef.current || disabled) return
    busyRef.current = true
    setBusy(true)
    setHint(false)
    try {
      if (await toggleRef.current()) {
        try { localStorage.setItem(USED_KEY, 'true') } catch { /* Storage may be unavailable. */ }
      }
    } finally {
      reset()
      busyRef.current = false
      setBusy(false)
    }
  }

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') reset()
      if (!event.ctrlKey || event.altKey || event.shiftKey || event.key.toLowerCase() !== 'm' || event.repeat) return
      if ((event.target as HTMLElement)?.closest('input, textarea, select, [contenteditable="true"]')) return
      event.preventDefault()
      void toggle()
    }
    const doubleClick = (event: MouseEvent) => {
      if (!active || !(event.target instanceof HTMLElement)) return
      if (event.target.matches('.minimal-mode, .minimal-mode-background, .minimal-mode-content, .minimal-mode-layout')) void toggle()
    }
    window.addEventListener('keydown', keydown)
    window.addEventListener('dblclick', doubleClick)
    window.addEventListener('blur', reset)
    return () => {
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('dblclick', doubleClick)
      window.removeEventListener('blur', reset)
    }
  })

  useEffect(() => {
    const app = document.querySelector<HTMLElement>('.app')
    app?.style.setProperty('--fold-progress', String(progress))
    app?.setAttribute('data-folding', progress > 0 ? 'true' : 'false')
    return () => { app?.style.removeProperty('--fold-progress'); app?.removeAttribute('data-folding') }
  }, [progress])
  useEffect(() => () => clearTimeout(hintTimer.current), [])

  const distance = (event: PointerEvent<HTMLButtonElement>) => {
    if (!start.current) return 0
    const direction = active ? 1 : -1
    // Require motion in both axes; horizontal window resizing must not trigger a switch.
    return Math.max(0, Math.min(direction * (event.clientX - start.current.x), direction * (event.clientY - start.current.y)))
  }
  const showHint = () => {
    if (hintShown.current) return
    hintShown.current = true
    try { if (localStorage.getItem(USED_KEY)) return } catch { /* Optional preference. */ }
    setHint(true)
    hintTimer.current = setTimeout(() => setHint(false), 2000)
  }

  if (disabled) return null
  return <div className="minimal-handle-wrap" data-dragging={progress > 0}>
    {hint && <span className="minimal-handle-hint" role="status">{active ? '↘ 당겨서 원래 화면으로' : '↖ 당겨서 미니멀 모드'} · Ctrl + M</span>}
    <button type="button" className="minimal-handle" disabled={busy}
      aria-label={active ? '원래 화면으로 전환 (Ctrl+M)' : '미니멀 모드로 전환 (Ctrl+M)'}
      onMouseEnter={showHint} onFocus={showHint}
      onClick={(event) => { if (event.detail === 0) void toggle() }}
      onPointerDown={(event) => {
        if (event.button !== 0 || busyRef.current) return
        event.preventDefault()
        start.current = { x: event.clientX, y: event.clientY }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => { if (start.current) setProgress(Math.min(1, distance(event) / 48)) }}
      onPointerUp={(event) => {
        const commit = start.current !== null && distance(event) >= 48
        reset()
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
        if (commit) void toggle()
      }}
      onPointerCancel={reset} onLostPointerCapture={reset}
    ><span aria-hidden="true" /></button>
  </div>
}
