import { useEffect, useMemo, useRef, useState } from 'react'
import type { VocabularyWordDraft } from '../types'

type Props = {
  dateLabel: string
  onClose: () => void
  onAddWords: (words: VocabularyWordDraft[]) => Promise<boolean>
}

type ParseResult = {
  words: VocabularyWordDraft[]
  error: string | null
}

const parseVocabularyInput = (value: string): ParseResult => {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return { words: [], error: null }
  }

  const seenWords = new Set<string>()
  const words: VocabularyWordDraft[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const spacedParts = lines[index].split(/\s+\/\s+/)
    const parts = (spacedParts.length >= 5 ? spacedParts : lines[index].split('/'))
      .map((part) => part.trim())

    if (parts.length < 5) {
      return {
        words: [],
        error: `Line ${index + 1} needs 5 fields separated by “/”.`,
      }
    }

    const [word, correctMeaning, wrongMeaningOne, wrongMeaningTwo, ...exampleParts] = parts
    const example = exampleParts.join(' / ').trim()

    if (!word || !correctMeaning || !wrongMeaningOne || !wrongMeaningTwo || !example) {
      return {
        words: [],
        error: `Line ${index + 1} contains an empty field.`,
      }
    }

    const meaningSet = new Set(
      [correctMeaning, wrongMeaningOne, wrongMeaningTwo].map((meaning) => meaning.toLocaleLowerCase()),
    )
    if (meaningSet.size !== 3) {
      return {
        words: [],
        error: `Line ${index + 1} needs three different answer choices.`,
      }
    }

    const normalizedWord = word.toLocaleLowerCase()
    if (seenWords.has(normalizedWord)) {
      return {
        words: [],
        error: `“${word}” is duplicated in this list.`,
      }
    }

    seenWords.add(normalizedWord)
    words.push({
      word,
      correctMeaning,
      wrongMeanings: [wrongMeaningOne, wrongMeaningTwo],
      example,
    })
  }

  return { words, error: null }
}

export function AddVocabularyModal({ dateLabel, onClose, onAddWords }: Props) {
  const [value, setValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const parsed = useMemo(() => parseVocabularyInput(value), [value])

  useEffect(() => {
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 80)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) onClose()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isSaving, onClose])

  const handleSave = async () => {
    if (parsed.words.length === 0 || parsed.error || isSaving) return

    setSaveError(null)
    setIsSaving(true)
    try {
      const saved = await onAddWords(parsed.words)
      if (saved) onClose()
      else setSaveError('Could not save the vocabulary file. Please try again.')
    } catch (error) {
      console.error('Failed to add vocabulary words:', error)
      setSaveError('Could not save the vocabulary file. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="vocabulary-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSaving) onClose()
    }}>
      <section className="vocabulary-add-modal" role="dialog" aria-modal="true" aria-labelledby="vocabulary-add-title">
        <header className="vocabulary-add-modal-header">
          <div className="vocabulary-add-modal-title-wrap">
            <div>
              <h2 id="vocabulary-add-title">Add New Words</h2>
              <p>{dateLabel}</p>
            </div>
          </div>
          <button
            type="button"
            className="vocabulary-add-modal-close"
            aria-label="Close"
            disabled={isSaving}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="vocabulary-add-format-help">
          <strong>One word per line</strong>
          <span>word / correct meaning / wrong meaning / wrong meaning / example sentence</span>
        </div>

        <textarea
          ref={textareaRef}
          className="vocabulary-add-textarea"
          value={value}
          spellCheck={false}
          placeholder={'serene / 고요한, 평온한 / 시끄러운, 소란스러운 / 빠르게 움직이는 / She remained serene even under pressure.\neloquent / 유창하고 설득력 있는 / 이해하기 어려운 / 거칠고 부주의한 / She gave an eloquent speech.'}
          onChange={(event) => { setValue(event.target.value); setSaveError(null) }}
        />

        <div className="vocabulary-add-status" aria-live="polite">
          {saveError ? (
            <span className="error">{saveError}</span>
          ) : parsed.error ? (
            <span className="error">{parsed.error}</span>
          ) : parsed.words.length > 0 ? (
            <span>{parsed.words.length} {parsed.words.length === 1 ? 'word' : 'words'} ready to save</span>
          ) : (
            <span>Paste or type your vocabulary list above.</span>
          )}
        </div>

        <footer className="vocabulary-add-modal-footer">
          <button type="button" className="vocabulary-modal-cancel" disabled={isSaving} onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="vocabulary-modal-save"
            disabled={parsed.words.length === 0 || Boolean(parsed.error) || isSaving}
            onClick={handleSave}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </section>
    </div>
  )
}
