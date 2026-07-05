import { useEffect, useMemo, useRef, useState } from 'react'
import type { AccentColor, ResolvedTheme, VocabularyWord } from '../types'
import backIcon from '../assets/vocabulary-back.png'
import { playbackIconMap, vocabularySoundIconMap } from '../constants'
import nextIcon from '../assets/vocabulary-next.png'
import { speakEnglishWord, stopEnglishSpeech } from '../utils/englishTts'

type Props = {
  dateKey: string
  words: VocabularyWord[]
  onBack: () => void
  onRecordMistake: (wordId: string) => void
  accentColor: AccentColor
  resolvedTheme: ResolvedTheme
}

type TestStatus = 'testing' | 'roundResult' | 'completed'

type RoundResultSummary = {
  roundNumber: number
  total: number
  correct: number
  missedWords: VocabularyWord[]
}

const QUESTION_TIME_MS = 20_000
const TIMER_RING_RADIUS = 10
const TIMER_RING_CIRCUMFERENCE = 2 * Math.PI * TIMER_RING_RADIUS

const shuffle = <T,>(items: T[]) => {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }
  return next
}

const uniqueWords = (words: VocabularyWord[]) => {
  const seen = new Set<string>()
  return words.filter((word) => {
    if (seen.has(word.id)) return false
    seen.add(word.id)
    return true
  })
}

const formatDateLabel = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const formatTimer = (milliseconds: number) => {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000))
  return `00:${String(seconds).padStart(2, '0')}`
}

export function VocabularyTestPage({ dateKey, words, onBack, onRecordMistake, accentColor, resolvedTheme }: Props) {
  const [roundWords, setRoundWords] = useState<VocabularyWord[]>(() => shuffle(words))
  const [questionIndex, setQuestionIndex] = useState(0)
  const [roundNumber, setRoundNumber] = useState(1)
  const [missedThisRound, setMissedThisRound] = useState<VocabularyWord[]>([])
  const [correctThisRound, setCorrectThisRound] = useState(0)
  const [roundResult, setRoundResult] = useState<RoundResultSummary | null>(null)
  const [selectedMeaning, setSelectedMeaning] = useState<string | null>(null)
  const [remainingMs, setRemainingMs] = useState(QUESTION_TIME_MS)
  const [isPaused, setIsPaused] = useState(false)
  const [status, setStatus] = useState<TestStatus>(words.length > 0 ? 'testing' : 'completed')
  const remainingMsRef = useRef(QUESTION_TIME_MS)
  const advancingRef = useRef(false)
  const moveForwardRef = useRef<(isCorrect: boolean) => void>(() => {})

  const pauseIcon = playbackIconMap.pause[accentColor]
  const playIcon = playbackIconMap.start[accentColor]
  const defaultSoundIcon = vocabularySoundIconMap[resolvedTheme === 'dark' ? 'white' : 'gray']
  const hoverSoundIcon = vocabularySoundIconMap[accentColor]

  useEffect(() => () => stopEnglishSpeech(), [])

  const currentWord = roundWords[questionIndex] ?? null
  const optionKey = `${roundNumber}:${questionIndex}:${currentWord?.id ?? 'none'}`
  useEffect(() => {
    stopEnglishSpeech()
  }, [currentWord?.id, status])

  const options = useMemo(() => {
    if (!currentWord) return []
    return shuffle([currentWord.correctMeaning, ...currentWord.wrongMeanings])
  }, [currentWord, optionKey])

  const resetQuestionTimer = () => {
    remainingMsRef.current = QUESTION_TIME_MS
    setRemainingMs(QUESTION_TIME_MS)
  }

  useEffect(() => {
    if (status !== 'testing' || isPaused || !currentWord) return

    const startedAt = performance.now()
    const startingRemaining = remainingMsRef.current
    let animationFrame = 0

    const tick = (now: number) => {
      const nextRemaining = Math.max(0, startingRemaining - (now - startedAt))
      remainingMsRef.current = nextRemaining
      setRemainingMs(nextRemaining)

      if (nextRemaining > 0) {
        animationFrame = window.requestAnimationFrame(tick)
      }
    }

    animationFrame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [status, isPaused, optionKey, currentWord])

  const moveForward = (isCorrect: boolean) => {
    if (!currentWord || status !== 'testing' || advancingRef.current) return
    advancingRef.current = true

    let nextMissed = missedThisRound
    if (!isCorrect) {
      onRecordMistake(currentWord.id)
      nextMissed = uniqueWords([...missedThisRound, currentWord])
    }

    const nextCorrectCount = correctThisRound + (isCorrect ? 1 : 0)

    if (questionIndex < roundWords.length - 1) {
      setMissedThisRound(nextMissed)
      setCorrectThisRound(nextCorrectCount)
      setQuestionIndex((previous) => previous + 1)
      setSelectedMeaning(null)
      resetQuestionTimer()
    } else if (nextMissed.length > 0) {
      setRoundResult({
        roundNumber,
        total: roundWords.length,
        correct: nextCorrectCount,
        missedWords: nextMissed,
      })
      setMissedThisRound(nextMissed)
      setCorrectThisRound(nextCorrectCount)
      setSelectedMeaning(null)
      setIsPaused(false)
      setStatus('roundResult')
      resetQuestionTimer()
    } else {
      setCorrectThisRound(nextCorrectCount)
      setStatus('completed')
      setIsPaused(false)
      setSelectedMeaning(null)
    }

    window.queueMicrotask(() => {
      advancingRef.current = false
    })
  }

  moveForwardRef.current = moveForward

  useEffect(() => {
    if (status === 'testing' && !isPaused && currentWord && remainingMs <= 0) {
      moveForwardRef.current(false)
    }
  }, [remainingMs, status, isPaused, currentWord])

  const handleNext = () => {
    if (!selectedMeaning || !currentWord || isPaused) return
    moveForward(selectedMeaning === currentWord.correctMeaning)
  }

  const handleSkip = () => {
    if (isPaused) return
    moveForward(false)
  }

  const handleRetestIncorrect = () => {
    if (!roundResult || roundResult.missedWords.length === 0) return

    setRoundWords(shuffle(roundResult.missedWords))
    setQuestionIndex(0)
    setRoundNumber(roundResult.roundNumber + 1)
    setMissedThisRound([])
    setCorrectThisRound(0)
    setRoundResult(null)
    setSelectedMeaning(null)
    setIsPaused(false)
    setStatus('testing')
    resetQuestionTimer()
  }

  const handleRestart = () => {
    setRoundWords(shuffle(words))
    setQuestionIndex(0)
    setRoundNumber(1)
    setMissedThisRound([])
    setCorrectThisRound(0)
    setRoundResult(null)
    setSelectedMeaning(null)
    setIsPaused(false)
    setStatus(words.length > 0 ? 'testing' : 'completed')
    resetQuestionTimer()
  }

  const timerProgress = Math.max(0, Math.min(100, (remainingMs / QUESTION_TIME_MS) * 100))
  const progressPercent = roundWords.length > 0
    ? Math.round(((questionIndex + 1) / roundWords.length) * 100)
    : 100

  return (
    <section className="vocabulary-test-page">
      <div className={`vocabulary-test-card ${isPaused ? 'is-paused' : ''}`}>
        <header className="vocabulary-test-header">
          <button type="button" className="vocabulary-test-back" onClick={onBack}>
            <span className="vocabulary-test-back-icon"><img src={backIcon} alt="" /></span>
            <span>Back</span>
          </button>

          <div className="vocabulary-test-heading">
            <h1>English Word Test</h1>
            <span>{formatDateLabel(dateKey)}</span>
          </div>

          {status === 'testing' ? (
            <button
              type="button"
              className={`vocabulary-timer-button ${isPaused ? 'paused' : ''}`}
              aria-label={isPaused ? 'Resume test' : 'Pause test'}
              title={isPaused ? 'Resume test' : 'Pause test'}
              onClick={() => setIsPaused((previous) => !previous)}
            >
              <span className="vocabulary-timer-ring">
                <svg className="vocabulary-timer-ring-svg" viewBox="0 0 26 26" aria-hidden="true">
                  <circle className="vocabulary-timer-ring-track" cx="13" cy="13" r={TIMER_RING_RADIUS} />
                  <circle
                    className="vocabulary-timer-ring-progress"
                    cx="13"
                    cy="13"
                    r={TIMER_RING_RADIUS}
                    strokeDasharray={TIMER_RING_CIRCUMFERENCE}
                    strokeDashoffset={TIMER_RING_CIRCUMFERENCE * (1 - timerProgress / 100)}
                  />
                </svg>
              </span>
              <strong>{formatTimer(remainingMs)}</strong>
              <img
                className="vocabulary-timer-state-icon"
                src={isPaused ? playIcon : pauseIcon}
                alt=""
                aria-hidden="true"
              />
            </button>
          ) : <span className="vocabulary-test-header-spacer" />}
        </header>

        {status === 'testing' && currentWord ? (
          <div className="vocabulary-test-body">
            <div className="vocabulary-question-meta">
              <strong>Round {roundNumber}</strong>
              <span className="vocabulary-question-position">
                Question <b>{questionIndex + 1}</b> / {roundWords.length}
              </span>
            </div>

            <div className="vocabulary-progress-track" aria-hidden="true">
              <span style={{ width: `${progressPercent}%` }} />
            </div>

            <div className="vocabulary-question-word-wrap">
              <h2>{currentWord.word}</h2>
              <button
                type="button"
                className="vocabulary-test-sound-button"
                title={`Play pronunciation for ${currentWord.word}`}
                aria-label={`Play pronunciation for ${currentWord.word}`}
                disabled={isPaused}
                onClick={() => speakEnglishWord(currentWord.word)}
              >
                <img className="vocabulary-sound-icon-default" src={defaultSoundIcon} alt="" />
                <img className="vocabulary-sound-icon-hover" src={hoverSoundIcon} alt="" />
              </button>
            </div>

            <div className="vocabulary-answer-list" role="radiogroup" aria-label="Meaning choices">
              {options.map((meaning, index) => {
                const isSelected = selectedMeaning === meaning
                return (
                  <button
                    key={`${optionKey}:${meaning}`}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`vocabulary-answer-option ${isSelected ? 'selected' : ''}`}
                    disabled={isPaused}
                    onClick={() => setSelectedMeaning(meaning)}
                  >
                    <span className="vocabulary-answer-letter">{String.fromCharCode(65 + index)}</span>
                    <strong>{meaning}</strong>
                  </button>
                )
              })}
            </div>

            <div className="vocabulary-test-footer">
              <button type="button" className="vocabulary-skip-button" disabled={isPaused} onClick={handleSkip}>
                <span>Skip Question</span>
              </button>

              <button
                type="button"
                className="vocabulary-next-button"
                disabled={!selectedMeaning || isPaused}
                onClick={handleNext}
              >
                <span>Next</span>
                <img src={nextIcon} alt="" />
              </button>
            </div>
          </div>
        ) : status === 'roundResult' && roundResult ? (
          <div className="vocabulary-round-result">
            <span className="vocabulary-round-result-label">Round {roundResult.roundNumber} Complete</span>
            <h2>Round Results</h2>
            <p>You will retest only the words you missed.</p>

            <div className="vocabulary-round-score-grid" aria-label="Round score">
              <div className="correct">
                <strong>{roundResult.correct}</strong>
                <span>Correct</span>
              </div>
              <div className="incorrect">
                <strong>{roundResult.missedWords.length}</strong>
                <span>Incorrect</span>
              </div>
            </div>

            <div className="vocabulary-round-missed-panel">
              <div className="vocabulary-round-missed-header">
                <strong>Incorrect Words</strong>
                <span>{roundResult.missedWords.length}</span>
              </div>
              <div className="vocabulary-round-missed-list">
                {roundResult.missedWords.map((word) => (
                  <div className="vocabulary-round-missed-row" key={word.id}>
                    <strong>{word.word}</strong>
                    <span>{word.correctMeaning}</span>
                  </div>
                ))}
              </div>
            </div>

            <button type="button" className="vocabulary-retest-button" onClick={handleRetestIncorrect}>
              Retest Incorrect Words
            </button>
          </div>
        ) : (
          <div className="vocabulary-test-complete">
            <span className="vocabulary-complete-mark" aria-hidden="true">✓</span>
            <h2>{words.length > 0 ? 'All words correct!' : 'No words to test'}</h2>
            <p>
              {words.length > 0
                ? `You cleared every word after ${roundNumber} ${roundNumber === 1 ? 'round' : 'rounds'}.`
                : 'Add vocabulary first, then start a test.'}
            </p>
            <div className="vocabulary-complete-actions">
              {words.length > 0 && <button type="button" className="vocabulary-restart-button" onClick={handleRestart}>Test Again</button>}
              <button type="button" className="vocabulary-complete-back-button" onClick={onBack}>Back to List</button>
            </div>
          </div>
        )}

        {isPaused && status === 'testing' && (
          <div className="vocabulary-pause-overlay" aria-live="polite">
            <div>
              <img src={pauseIcon} alt="" />
              <strong>Paused</strong>
              <span>Press the timer button to continue.</span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
