import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent as ReactMouseEvent } from 'react'
import type { AccentColor, ResolvedTheme, VocabularyByDate, VocabularyWord, VocabularyWordDraft } from '../types'
import { vocabularySoundIconMap } from '../constants'
import { speakEnglishWord, stopEnglishSpeech } from '../utils/englishTts'

type Props = {
  isLoaded: boolean
  vocabularyByDate: VocabularyByDate
  onOpenAddWords: () => void
  onStartTest: (dateKey: string) => void
  onUpdateDate: (dateKey: string, words: VocabularyWordDraft[]) => Promise<boolean>
  onDeleteDate: (dateKey: string) => Promise<boolean>
  accentColor: AccentColor
  resolvedTheme: ResolvedTheme
}

type ManageMode = 'edit' | 'delete'

type ParseResult = {
  words: VocabularyWordDraft[]
  error: string | null
}

const formatVocabularyDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, (month || 1) - 1, day || 1)

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const serializeWords = (words: VocabularyWord[]) => words
  .map((word) => [
    word.word,
    word.correctMeaning,
    word.wrongMeanings[0],
    word.wrongMeanings[1],
    word.example,
  ].join(' / '))
  .join('\n')

const parseVocabularyInput = (value: string): ParseResult => {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return { words: [], error: null }

  const seenWords = new Set<string>()
  const words: VocabularyWordDraft[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const spacedParts = lines[index].split(/\s+\/\s+/)
    const parts = (spacedParts.length >= 5 ? spacedParts : lines[index].split('/'))
      .map((part) => part.trim())

    if (parts.length < 5) {
      return { words: [], error: `Line ${index + 1} needs 5 fields separated by “/”.` }
    }

    const [word, correctMeaning, wrongMeaningOne, wrongMeaningTwo, ...exampleParts] = parts
    const example = exampleParts.join(' / ').trim()

    if (!word || !correctMeaning || !wrongMeaningOne || !wrongMeaningTwo || !example) {
      return { words: [], error: `Line ${index + 1} contains an empty field.` }
    }

    const meaningSet = new Set(
      [correctMeaning, wrongMeaningOne, wrongMeaningTwo].map((meaning) => meaning.toLocaleLowerCase()),
    )
    if (meaningSet.size !== 3) {
      return { words: [], error: `Line ${index + 1} needs three different answer choices.` }
    }

    const normalizedWord = word.toLocaleLowerCase()
    if (seenWords.has(normalizedWord)) {
      return { words: [], error: `“${word}” is duplicated in this list.` }
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

export function VocabularyPage({
  isLoaded,
  vocabularyByDate,
  onOpenAddWords,
  onStartTest,
  onUpdateDate,
  onDeleteDate,
  accentColor,
  resolvedTheme,
}: Props) {
  const dateKeys = useMemo(
    () => Object.keys(vocabularyByDate)
      .filter((dateKey) => (vocabularyByDate[dateKey] ?? []).length > 0)
      .sort((a, b) => b.localeCompare(a)),
    [vocabularyByDate],
  )
  const [expandedDates, setExpandedDates] = useState<Set<string>>(() => new Set(dateKeys))
  const [actionMenuDateKey, setActionMenuDateKey] = useState<string | null>(null)
  const [managedDateKey, setManagedDateKey] = useState<string | null>(null)
  const [manageMode, setManageMode] = useState<ManageMode>('edit')
  const [editValue, setEditValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const actionMenuRef = useRef<HTMLDivElement | null>(null)

  const managedWords = managedDateKey ? vocabularyByDate[managedDateKey] ?? [] : []
  const parsedEdit = useMemo(() => parseVocabularyInput(editValue), [editValue])
  const defaultSoundIcon = vocabularySoundIconMap[resolvedTheme === 'dark' ? 'white' : 'gray']
  const hoverSoundIcon = vocabularySoundIconMap[accentColor]

  useEffect(() => {
    setExpandedDates((previous) => {
      const next = new Set(previous)
      dateKeys.forEach((dateKey) => next.add(dateKey))
      return next
    })
  }, [dateKeys])

  useEffect(() => () => stopEnglishSpeech(), [])

  useEffect(() => {
    if (manageMode !== 'edit' || !managedDateKey) return
    const timer = window.setTimeout(() => editTextareaRef.current?.focus(), 80)
    return () => window.clearTimeout(timer)
  }, [manageMode, managedDateKey])

  useEffect(() => {
    if (!actionMenuDateKey) return

    const handleOutsideClick = (event: MouseEvent) => {
      if (actionMenuRef.current?.contains(event.target as Node)) return
      setActionMenuDateKey(null)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [actionMenuDateKey])

  useEffect(() => {
    if (!managedDateKey && !actionMenuDateKey) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isSaving) return
      if (managedDateKey) {
        setManagedDateKey(null)
        setModalError(null)
      } else {
        setActionMenuDateKey(null)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [managedDateKey, actionMenuDateKey, isSaving])

  const toggleDate = (dateKey: string) => {
    setExpandedDates((previous) => {
      const next = new Set(previous)
      if (next.has(dateKey)) next.delete(dateKey)
      else next.add(dateKey)
      return next
    })
  }

  const toggleActionMenu = (dateKey: string) => {
    setActionMenuDateKey((current) => current === dateKey ? null : dateKey)
  }

  const openEditMode = (dateKey: string) => {
    setActionMenuDateKey(null)
    setManagedDateKey(dateKey)
    setEditValue(serializeWords(vocabularyByDate[dateKey] ?? []))
    setManageMode('edit')
    setModalError(null)
  }

  const openDeleteMode = (dateKey: string) => {
    setActionMenuDateKey(null)
    setManagedDateKey(dateKey)
    setManageMode('delete')
    setModalError(null)
  }

  const handleSaveEdit = async () => {
    if (!managedDateKey || parsedEdit.words.length === 0 || parsedEdit.error || isSaving) return

    setIsSaving(true)
    setModalError(null)
    try {
      const saved = await onUpdateDate(managedDateKey, parsedEdit.words)
      if (saved) setManagedDateKey(null)
      else setModalError('Could not save the changes. Please try again.')
    } catch (error) {
      console.error('Failed to edit vocabulary date:', error)
      setModalError('Could not save the changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteDate = async () => {
    if (!managedDateKey || isSaving) return

    setIsSaving(true)
    setModalError(null)
    try {
      const deleted = await onDeleteDate(managedDateKey)
      if (deleted) setManagedDateKey(null)
      else setModalError('Could not delete this date. Please try again.')
    } catch (error) {
      console.error('Failed to delete vocabulary date:', error)
      setModalError('Could not delete this date. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const closeManageModal = () => {
    if (isSaving) return
    setManagedDateKey(null)
    setModalError(null)
  }

  return (
    <section className="vocabulary-page">
      <div className="vocabulary-page-card">
        <header className="vocabulary-page-header">
          <div className="vocabulary-page-title-wrap">
            <div>
              <h1>Vocabulary List</h1>
              <p>Review and manage your words by date.</p>
            </div>
          </div>

          <button type="button" className="vocabulary-add-button" disabled={!isLoaded} onClick={onOpenAddWords}>
            <span>Add Word</span>
          </button>
        </header>

        <div className="vocabulary-date-list">
          {!isLoaded ? (
            <div className="vocabulary-empty-state">
              <span className="vocabulary-empty-icon vocabulary-loading-icon" aria-hidden="true">···</span>
              <strong>Loading vocabulary</strong>
              <p>Reading your date-based JSON files.</p>
            </div>
          ) : dateKeys.length === 0 ? (
            <div className="vocabulary-empty-state">
              <span className="vocabulary-empty-icon" aria-hidden="true">Aa</span>
              <strong>No vocabulary yet</strong>
              <p>Add your first list to create a date-based JSON file.</p>
              <button type="button" onClick={onOpenAddWords}>Add Words</button>
            </div>
          ) : dateKeys.map((dateKey) => {
            const words = vocabularyByDate[dateKey] ?? []
            const isExpanded = expandedDates.has(dateKey)

            return (
              <article
                key={dateKey}
                className={`vocabulary-date-card ${isExpanded ? 'expanded' : 'collapsed'} ${actionMenuDateKey === dateKey ? 'menu-open' : ''}`}
              >
                <header className="vocabulary-date-card-header">
                  <button
                    type="button"
                    className="vocabulary-date-toggle"
                    aria-label={isExpanded ? 'Collapse date' : 'Expand date'}
                    aria-expanded={isExpanded}
                    onClick={() => toggleDate(dateKey)}
                  >
                    <span className="vocabulary-chevron" aria-hidden="true">∨</span>
                    <span className="vocabulary-date-icon" aria-hidden="true" />
                    <strong>{formatVocabularyDate(dateKey)}</strong>
                    <span className="vocabulary-word-count">{words.length} {words.length === 1 ? 'word' : 'words'}</span>
                  </button>

                  <div className="vocabulary-date-actions">
                    <button
                      type="button"
                      className="vocabulary-test-button"
                      disabled={words.length === 0}
                      aria-label={`Start vocabulary test for ${formatVocabularyDate(dateKey)}`}
                      title="Start test"
                      onClick={() => onStartTest(dateKey)}
                    >
                      <span className="vocabulary-test-play-icon" aria-hidden="true" />
                    </button>
                    <div
                      className="vocabulary-date-menu-area"
                      ref={actionMenuDateKey === dateKey ? actionMenuRef : null}
                    >
                      <button
                        type="button"
                        className="vocabulary-date-more-button"
                        aria-label={`Manage words for ${formatVocabularyDate(dateKey)}`}
                        aria-haspopup="menu"
                        aria-expanded={actionMenuDateKey === dateKey}
                        title="Manage date"
                        onClick={() => toggleActionMenu(dateKey)}
                      >
                        <span aria-hidden="true">...</span>
                      </button>

                      {actionMenuDateKey === dateKey && (
                        <div className="vocabulary-date-action-menu" role="menu">
                          <button type="button" role="menuitem" onClick={() => openEditMode(dateKey)}>
                            Edit
                          </button>
                          <button type="button" role="menuitem" className="delete" onClick={() => openDeleteMode(dateKey)}>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </header>

                {isExpanded && (
                  <div className="vocabulary-word-list">
                    {words.map((word) => (
                      <div key={word.id} className="vocabulary-word-row">
                        <span className="vocabulary-word-dot" aria-hidden="true" />
                        <div className="vocabulary-word-main">
                          <strong>{word.word}</strong>
                          <button
                            type="button"
                            className="vocabulary-sound-button"
                            title={`Play pronunciation for ${word.word}`}
                            aria-label={`Play pronunciation for ${word.word}`}
                            onClick={() => speakEnglishWord(word.word)}
                          >
                            <img className="vocabulary-sound-icon-default" src={defaultSoundIcon} alt="" />
                            <img className="vocabulary-sound-icon-hover" src={hoverSoundIcon} alt="" />
                          </button>
                        </div>
                        <span className="vocabulary-word-meaning">{word.correctMeaning}</span>
                        <span className={`vocabulary-mistake-pill ${word.mistakeCount > 0 ? 'has-mistakes' : 'new'}`}>
                          {word.mistakeCount > 0 ? `Wrong ${word.mistakeCount}` : 'New'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </div>

      {managedDateKey && (
        <div
          className="vocabulary-modal-backdrop vocabulary-manage-backdrop"
          role="presentation"
          onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) => {
            if (event.target === event.currentTarget) closeManageModal()
          }}
        >
          <section
            className={`vocabulary-date-manage-modal mode-${manageMode}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={manageMode === 'edit' ? 'vocabulary-manage-title' : 'vocabulary-delete-title'}
          >
            <header className="vocabulary-date-manage-header">
              {manageMode === 'edit' ? (
                <div>
                  <h2 id="vocabulary-manage-title">Edit Words</h2>
                  <p>{formatVocabularyDate(managedDateKey)}</p>
                </div>
              ) : (
                <span aria-hidden="true" />
              )}
              <button
                type="button"
                className="vocabulary-add-modal-close"
                aria-label="Close"
                disabled={isSaving}
                onClick={closeManageModal}
              >
                ×
              </button>
            </header>

            {manageMode === 'edit' ? (
              <>
                <div className="vocabulary-add-format-help vocabulary-edit-format-help">
                  <strong>One word per line</strong>
                  <span>word / correct meaning / wrong meaning / wrong meaning / example sentence</span>
                </div>
                <textarea
                  ref={editTextareaRef}
                  className="vocabulary-add-textarea vocabulary-edit-textarea"
                  value={editValue}
                  spellCheck={false}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
                    setEditValue(event.target.value)
                    setModalError(null)
                  }}
                />
                <div className="vocabulary-add-status" aria-live="polite">
                  {modalError ? (
                    <span className="error">{modalError}</span>
                  ) : parsedEdit.error ? (
                    <span className="error">{parsedEdit.error}</span>
                  ) : parsedEdit.words.length > 0 ? (
                    <span>{parsedEdit.words.length} {parsedEdit.words.length === 1 ? 'word' : 'words'} ready to save</span>
                  ) : (
                    <span>Keep at least one word in this date.</span>
                  )}
                </div>
                <footer className="vocabulary-add-modal-footer vocabulary-manage-footer">
                  <button
                    type="button"
                    className="vocabulary-modal-cancel"
                    disabled={isSaving}
                    onClick={closeManageModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="vocabulary-modal-save"
                    disabled={parsedEdit.words.length === 0 || Boolean(parsedEdit.error) || isSaving}
                    onClick={handleSaveEdit}
                  >
                    {isSaving ? 'Saving…' : 'Save'}
                  </button>
                </footer>
              </>
            ) : (
              <div className="vocabulary-delete-confirmation">
                <span className="vocabulary-delete-warning" aria-hidden="true">!</span>
                <h3 id="vocabulary-delete-title">Delete all words from this date?</h3>
                <p>{managedWords.length} {managedWords.length === 1 ? 'word' : 'words'} will be removed from the vocabulary list.</p>
                {modalError && <span className="vocabulary-delete-error">{modalError}</span>}
                <div className="vocabulary-delete-actions">
                  <button
                    type="button"
                    className="vocabulary-modal-cancel"
                    disabled={isSaving}
                    onClick={closeManageModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="vocabulary-delete-confirm-button"
                    disabled={isSaving}
                    onClick={handleDeleteDate}
                  >
                    {isSaving ? 'Deleting…' : 'Delete Date'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  )
}
