import { useEffect, useMemo, useRef, useState } from 'react'
import type { AccentColor, ResolvedTheme, VocabularyTestMode, VocabularyWord } from '../types'
import backIcon from '../assets/vocabulary-back.png'
import { playbackIconMap, vocabularySoundIconMap } from '../constants'
import nextIcon from '../assets/vocabulary-next.png'
import { speakEnglishWord, stopEnglishSpeech } from '../utils/englishTts'

type Props = {
  dateKey: string
  words: VocabularyWord[]
  testMode: VocabularyTestMode
  onBack: () => void
  onRecordMistake: (wordId: string) => void
  accentColor: AccentColor
  resolvedTheme: ResolvedTheme
}

type TestStatus = 'testing' | 'roundResult' | 'completed'

type MissedAnswerSummary = {
  word: VocabularyWord
  userAnswer: string | null
}

type RoundResultSummary = {
  roundNumber: number
  total: number
  correct: number
  missedAnswers: MissedAnswerSummary[]
}

const QUESTION_TIME_MS = 20_000
const TIMER_RING_RADIUS = 10
const TIMER_RING_CIRCUMFERENCE = 2 * Math.PI * TIMER_RING_RADIUS
const LEADING_PLACEHOLDER_PATTERN = /^(?:~|∼|〜|～)\s*(?:(?:을\s*\/\s*를|이\s*\/\s*가|은\s*\/\s*는|와\s*\/\s*과|으로\s*\/\s*로|에게서|으로|에게|한테|에서|을|를|이|가|은|는|의|에|와|과|로|도|만)\s*)?/u
const MEANING_SEPARATOR_PATTERN = /\s*(?:,|，|;|；|·|ㆍ|또는|혹은)\s*/u
const OPTIONAL_MEANING_MODIFIERS = new Set([
  '매우',
  '몹시',
  '아주',
  '대단히',
  '굉장히',
  '상당히',
  '극도로',
  '완전히',
  '전적으로',
  '철저히',
  '단호히',
  '강하게',
  '심하게',
  '분명히',
  '명백히',
  '적극적으로',
  '확실히',
])
const GENERIC_CORE_MEANINGS = new Set([
  '하다',
  '되다',
  '있다',
  '없다',
  '이다',
  '않다',
  '한',
  '된',
  '있는',
  '없는',
  '않은',
])

const shuffle = <T,>(items: T[]) => {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }
  return next
}

const uniqueMissedAnswers = (answers: MissedAnswerSummary[]) => {
  const seen = new Set<string>()
  return answers.filter(({ word }) => {
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

const normalizeMeaning = (value: string) => value
  .normalize('NFKC')
  .toLocaleLowerCase()
  .trim()
  .replace(/[“”‘’"'`]/g, '')
  .replace(/[.!?。！？]+$/u, '')
  .replace(/\s+/g, ' ')

const removeLeadingPlaceholder = (value: string) => value
  .replace(LEADING_PLACEHOLDER_PATTERN, '')
  .trim()

const toComparableAnswer = (value: string) => removeLeadingPlaceholder(normalizeMeaning(value))
  .replace(/\s+/g, '')

const getCoreMeaningVariants = (value: string) => {
  const normalized = removeLeadingPlaceholder(normalizeMeaning(value))
  const tokens = normalized.split(/\s+/u).filter(Boolean)
  const variants: string[] = []

  let firstCoreTokenIndex = 0
  while (
    firstCoreTokenIndex < tokens.length - 1
    && OPTIONAL_MEANING_MODIFIERS.has(tokens[firstCoreTokenIndex])
  ) {
    firstCoreTokenIndex += 1
    const candidate = tokens.slice(firstCoreTokenIndex).join(' ')
    const compactCandidate = candidate.replace(/\s+/gu, '')

    // Avoid accepting vague endings such as "하다" or "있다" on their own.
    if (compactCandidate.length >= 3 && !GENERIC_CORE_MEANINGS.has(compactCandidate)) {
      variants.push(candidate)
    }
  }

  return variants
}

const getAcceptedAnswerVariants = (correctMeaning: string) => {
  const normalizedMeaning = normalizeMeaning(correctMeaning)
  const meaningParts = normalizedMeaning
    .split(MEANING_SEPARATOR_PATTERN)
    .map((part) => part.trim())
    .filter(Boolean)

  return new Set(
    [normalizedMeaning, ...meaningParts]
      .flatMap((part) => [
        part,
        removeLeadingPlaceholder(part),
        ...getCoreMeaningVariants(part),
      ])
      .map(toComparableAnswer)
      .filter(Boolean),
  )
}

const isWrittenAnswerCorrect = (answer: string, correctMeaning: string) => {
  const comparableAnswer = toComparableAnswer(answer)
  if (!comparableAnswer) return false
  return getAcceptedAnswerVariants(correctMeaning).has(comparableAnswer)
}

const getWrittenAnswerCacheKey = (word: VocabularyWord, answer: string) => [
  word.word,
  word.correctMeaning,
  normalizeMeaning(answer),
].join('::')

const checkWrittenMeaning = async (
  word: VocabularyWord,
  answer: string,
  cache: Map<string, boolean>,
) => {
  if (isWrittenAnswerCorrect(answer, word.correctMeaning)) return true

  const cacheKey = getWrittenAnswerCacheKey(word, answer)
  const cachedResult = cache.get(cacheKey)
  if (typeof cachedResult === 'boolean') return cachedResult

  const result = await window.mnAPI.checkVocabularyMeaning({
    word: word.word,
    correctMeaning: word.correctMeaning,
    answer,
  })
  const isCorrect = result.success ? result.isCorrect : false

  if (result.success) cache.set(cacheKey, isCorrect)
  return isCorrect
}

const selectRandomWrittenBatch = (words: VocabularyWord[]) => {
  if (words.length === 0) return []
  const sampleSize = Math.max(1, Math.round(words.length * 0.3))
  return shuffle(words).slice(0, sampleSize)
}

function VocabularySequentialTestPage({
  dateKey,
  words,
  testMode,
  onBack,
  onRecordMistake,
  accentColor,
  resolvedTheme,
}: Props) {
  const [roundWords, setRoundWords] = useState<VocabularyWord[]>(() => shuffle(words))
  const [questionIndex, setQuestionIndex] = useState(0)
  const [roundNumber, setRoundNumber] = useState(1)
  const [missedThisRound, setMissedThisRound] = useState<MissedAnswerSummary[]>([])
  const [correctThisRound, setCorrectThisRound] = useState(0)
  const [roundResult, setRoundResult] = useState<RoundResultSummary | null>(null)
  const [selectedMeaning, setSelectedMeaning] = useState<string | null>(null)
  const [writtenAnswer, setWrittenAnswer] = useState('')
  const [remainingMs, setRemainingMs] = useState(QUESTION_TIME_MS)
  const [isPaused, setIsPaused] = useState(false)
  const [isCheckingAnswer, setIsCheckingAnswer] = useState(false)
  const [status, setStatus] = useState<TestStatus>(words.length > 0 ? 'testing' : 'completed')
  const remainingMsRef = useRef(QUESTION_TIME_MS)
  const advancingRef = useRef(false)
  const moveForwardRef = useRef<(isCorrect: boolean) => void>(() => {})
  const writtenAnswerInputRef = useRef<HTMLInputElement | null>(null)
  const checkingAnswerRef = useRef(false)
  const meaningCheckCacheRef = useRef(new Map<string, boolean>())

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

  useEffect(() => {
    if (testMode !== 'written' || status !== 'testing' || isPaused || isCheckingAnswer || !currentWord) return
    const focusTimer = window.setTimeout(() => writtenAnswerInputRef.current?.focus(), 60)
    return () => window.clearTimeout(focusTimer)
  }, [testMode, status, isPaused, isCheckingAnswer, optionKey, currentWord])

  const options = useMemo(() => {
    if (!currentWord) return []
    return shuffle([currentWord.correctMeaning, ...currentWord.wrongMeanings])
  }, [currentWord, optionKey])

  const resetQuestionTimer = () => {
    remainingMsRef.current = QUESTION_TIME_MS
    setRemainingMs(QUESTION_TIME_MS)
  }

  const clearAnswer = () => {
    setSelectedMeaning(null)
    setWrittenAnswer('')
  }

  useEffect(() => {
    if (status !== 'testing' || isPaused || isCheckingAnswer || !currentWord) return

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
  }, [status, isPaused, isCheckingAnswer, optionKey, currentWord])

  const moveForward = (isCorrect: boolean) => {
    if (!currentWord || status !== 'testing' || advancingRef.current) return
    advancingRef.current = true

    let nextMissed = missedThisRound
    if (!isCorrect) {
      const currentUserAnswer = testMode === 'written'
        ? writtenAnswer.trim()
        : selectedMeaning?.trim() ?? ''

      onRecordMistake(currentWord.id)
      nextMissed = uniqueMissedAnswers([
        ...missedThisRound,
        { word: currentWord, userAnswer: currentUserAnswer || null },
      ])
    }

    const nextCorrectCount = correctThisRound + (isCorrect ? 1 : 0)

    if (questionIndex < roundWords.length - 1) {
      setMissedThisRound(nextMissed)
      setCorrectThisRound(nextCorrectCount)
      setQuestionIndex((previous) => previous + 1)
      clearAnswer()
      resetQuestionTimer()
    } else if (nextMissed.length > 0) {
      setRoundResult({
        roundNumber,
        total: roundWords.length,
        correct: nextCorrectCount,
        missedAnswers: nextMissed,
      })
      setMissedThisRound(nextMissed)
      setCorrectThisRound(nextCorrectCount)
      clearAnswer()
      setIsPaused(false)
      setStatus('roundResult')
      resetQuestionTimer()
    } else {
      setCorrectThisRound(nextCorrectCount)
      setStatus('completed')
      setIsPaused(false)
      clearAnswer()
    }

    window.queueMicrotask(() => {
      advancingRef.current = false
    })
  }

  moveForwardRef.current = moveForward

  useEffect(() => {
    if (status === 'testing' && !isPaused && !isCheckingAnswer && currentWord && remainingMs <= 0) {
      moveForwardRef.current(false)
    }
  }, [remainingMs, status, isPaused, isCheckingAnswer, currentWord])

  const handleNext = async () => {
    if (!currentWord || isPaused || isCheckingAnswer || checkingAnswerRef.current) return

    if (testMode === 'written') {
      const answer = writtenAnswer.trim()
      if (!answer) return

      checkingAnswerRef.current = true
      setIsCheckingAnswer(true)
      try {
        const isCorrect = await checkWrittenMeaning(
          currentWord,
          answer,
          meaningCheckCacheRef.current,
        )
        moveForward(isCorrect)
      } catch (error) {
        console.error('Failed to check vocabulary meaning:', error)
        moveForward(false)
      } finally {
        checkingAnswerRef.current = false
        setIsCheckingAnswer(false)
      }
      return
    }

    if (!selectedMeaning) return
    moveForward(selectedMeaning === currentWord.correctMeaning)
  }

  const handleSkip = () => {
    if (isPaused || isCheckingAnswer) return
    moveForward(false)
  }

  const handleRetestIncorrect = () => {
    if (!roundResult || roundResult.missedAnswers.length === 0) return

    setRoundWords(shuffle(roundResult.missedAnswers.map(({ word }) => word)))
    setQuestionIndex(0)
    setRoundNumber(roundResult.roundNumber + 1)
    setMissedThisRound([])
    setCorrectThisRound(0)
    setRoundResult(null)
    clearAnswer()
    setIsPaused(false)
    checkingAnswerRef.current = false
    setIsCheckingAnswer(false)
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
    clearAnswer()
    setIsPaused(false)
    checkingAnswerRef.current = false
    setIsCheckingAnswer(false)
    setStatus(words.length > 0 ? 'testing' : 'completed')
    resetQuestionTimer()
  }

  const timerProgress = Math.max(0, Math.min(100, (remainingMs / QUESTION_TIME_MS) * 100))
  const progressPercent = roundWords.length > 0
    ? Math.round(((questionIndex + 1) / roundWords.length) * 100)
    : 100
  const canSubmitAnswer = !isCheckingAnswer && (testMode === 'written'
    ? writtenAnswer.trim().length > 0
    : Boolean(selectedMeaning))
  const testModeLabel = testMode === 'written' ? 'Written Answer' : 'Multiple Choice'

  return (
    <section className="vocabulary-test-page">
      <div className={`vocabulary-test-card mode-${testMode} ${isPaused ? 'is-paused' : ''}`}>
        <header className="vocabulary-test-header">
          <button type="button" className="vocabulary-test-back" onClick={onBack}>
            <span className="vocabulary-test-back-icon"><img src={backIcon} alt="" /></span>
            <span>Back</span>
          </button>

          <div className="vocabulary-test-heading">
            <h1>English Word Test</h1>
            <span>{formatDateLabel(dateKey)} · {testModeLabel}</span>
          </div>

          {status === 'testing' ? (
            <button
              type="button"
              className={`vocabulary-timer-button ${isPaused ? 'paused' : ''}`}
              aria-label={isCheckingAnswer ? 'Checking answer' : isPaused ? 'Resume test' : 'Pause test'}
              title={isCheckingAnswer ? 'Checking answer' : isPaused ? 'Resume test' : 'Pause test'}
              disabled={isCheckingAnswer}
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
                disabled={isPaused || isCheckingAnswer}
                onClick={() => speakEnglishWord(currentWord.word)}
              >
                <img className="vocabulary-sound-icon-default" src={defaultSoundIcon} alt="" />
                <img className="vocabulary-sound-icon-hover" src={hoverSoundIcon} alt="" />
              </button>
            </div>

            {testMode === 'written' ? (
              <div className="vocabulary-written-answer-wrap">
                <label htmlFor="vocabulary-written-answer">Type the Korean meaning</label>
                <input
                  ref={writtenAnswerInputRef}
                  id="vocabulary-written-answer"
                  type="text"
                  value={writtenAnswer}
                  maxLength={160}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={isPaused || isCheckingAnswer}
                  placeholder="Enter the meaning"
                  onChange={(event) => setWrittenAnswer(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
                    event.preventDefault()
                    void handleNext()
                  }}
                />
                <p>Equivalent Korean synonyms and paraphrases are accepted automatically. You may also omit a leading ~ particle.</p>
              </div>
            ) : (
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
                      disabled={isPaused || isCheckingAnswer}
                      onClick={() => setSelectedMeaning(meaning)}
                    >
                      <span className="vocabulary-answer-letter">{String.fromCharCode(65 + index)}</span>
                      <strong>{meaning}</strong>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="vocabulary-test-footer">
              <button type="button" className="vocabulary-skip-button" disabled={isPaused || isCheckingAnswer} onClick={handleSkip}>
                <span>Skip Question</span>
              </button>

              <button
                type="button"
                className="vocabulary-next-button"
                disabled={!canSubmitAnswer || isPaused || isCheckingAnswer}
                onClick={() => void handleNext()}
              >
                <span>{isCheckingAnswer ? 'Checking...' : testMode === 'written' ? 'Submit' : 'Next'}</span>
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
                <strong>{roundResult.missedAnswers.length}</strong>
                <span>Incorrect</span>
              </div>
            </div>

            <div className="vocabulary-round-missed-panel">
              <div className="vocabulary-round-missed-header">
                <strong>Incorrect Words</strong>
                <span>{roundResult.missedAnswers.length}</span>
              </div>
              <div className="vocabulary-round-missed-list">
                {roundResult.missedAnswers.map(({ word, userAnswer }) => (
                  <div className="vocabulary-round-missed-row" key={word.id}>
                    <strong>{word.word}</strong>
                    <div className="vocabulary-round-answer-cell user-answer">
                      <small>Your answer</small>
                      <span>{userAnswer ?? 'No answer'}</span>
                    </div>
                    <div className="vocabulary-round-answer-cell correct-answer">
                      <small>Correct answer</small>
                      <span>{word.correctMeaning}</span>
                    </div>
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

function VocabularyBatchTestPage({
  dateKey,
  words,
  onBack,
  onRecordMistake,
  accentColor,
  resolvedTheme,
}: Props) {
  const [batchWords, setBatchWords] = useState<VocabularyWord[]>(() => selectRandomWrittenBatch(words))
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [roundNumber, setRoundNumber] = useState(1)
  const [roundResult, setRoundResult] = useState<RoundResultSummary | null>(null)
  const [status, setStatus] = useState<TestStatus>(words.length > 0 ? 'testing' : 'completed')
  const [isCheckingAnswer, setIsCheckingAnswer] = useState(false)
  const [checkingPosition, setCheckingPosition] = useState(0)
  const meaningCheckCacheRef = useRef(new Map<string, boolean>())
  const answerInputRefs = useRef<Array<HTMLInputElement | null>>([])

  const defaultSoundIcon = vocabularySoundIconMap[resolvedTheme === 'dark' ? 'white' : 'gray']
  const hoverSoundIcon = vocabularySoundIconMap[accentColor]
  const answeredCount = batchWords.filter((word) => (answers[word.id] ?? '').trim().length > 0).length

  useEffect(() => () => stopEnglishSpeech(), [])

  useEffect(() => {
    stopEnglishSpeech()
  }, [status, batchWords])

  const updateAnswer = (wordId: string, answer: string) => {
    setAnswers((previous) => ({ ...previous, [wordId]: answer }))
  }

  const handleSubmitBatch = async () => {
    if (batchWords.length === 0 || isCheckingAnswer) return

    setIsCheckingAnswer(true)
    setCheckingPosition(0)

    const missedAnswers: MissedAnswerSummary[] = []
    let correct = 0

    try {
      for (let index = 0; index < batchWords.length; index += 1) {
        const word = batchWords[index]
        const answer = (answers[word.id] ?? '').trim()
        let isCorrect = false

        if (answer) {
          try {
            isCorrect = await checkWrittenMeaning(
              word,
              answer,
              meaningCheckCacheRef.current,
            )
          } catch (error) {
            console.error(`Failed to check vocabulary meaning for ${word.word}:`, error)
          }
        }

        if (isCorrect) {
          correct += 1
        } else {
          onRecordMistake(word.id)
          missedAnswers.push({ word, userAnswer: answer || null })
        }

        setCheckingPosition(index + 1)
      }

      if (missedAnswers.length > 0) {
        setRoundResult({
          roundNumber,
          total: batchWords.length,
          correct,
          missedAnswers,
        })
        setStatus('roundResult')
      } else {
        setStatus('completed')
      }
    } finally {
      setIsCheckingAnswer(false)
    }
  }

  const handleRetestIncorrect = () => {
    if (!roundResult || roundResult.missedAnswers.length === 0) return

    setBatchWords(shuffle(roundResult.missedAnswers.map(({ word }) => word)))
    setAnswers({})
    setRoundNumber(roundResult.roundNumber + 1)
    setRoundResult(null)
    setCheckingPosition(0)
    setStatus('testing')
  }

  const handleRestart = () => {
    setBatchWords(selectRandomWrittenBatch(words))
    setAnswers({})
    setRoundNumber(1)
    setRoundResult(null)
    setCheckingPosition(0)
    setStatus(words.length > 0 ? 'testing' : 'completed')
  }

  return (
    <section className="vocabulary-test-page">
      <div className={`vocabulary-test-card mode-writtenBatch ${isCheckingAnswer ? 'is-checking' : ''}`}>
        <header className="vocabulary-test-header">
          <button type="button" className="vocabulary-test-back" onClick={onBack}>
            <span className="vocabulary-test-back-icon"><img src={backIcon} alt="" /></span>
            <span>Back</span>
          </button>

          <div className="vocabulary-test-heading">
            <h1>English Word Test</h1>
            <span>{formatDateLabel(dateKey)} · Random Written</span>
          </div>

          {status === 'testing' ? (
            <span className="vocabulary-batch-count-badge">
              <strong>{batchWords.length}</strong>
              <span>/ {words.length} words</span>
            </span>
          ) : <span className="vocabulary-test-header-spacer" />}
        </header>

        {status === 'testing' && batchWords.length > 0 ? (
          <div className="vocabulary-batch-test-body">
            <div className="vocabulary-batch-intro">
              <div>
                <strong>Round {roundNumber}</strong>
                <span>Type the Korean meaning for every word below.</span>
              </div>
              <p>Randomly selected about 30% of this date's vocabulary.</p>
            </div>

            <div className="vocabulary-batch-answer-list">
              {batchWords.map((word, index) => (
                <div className="vocabulary-batch-answer-row" key={word.id}>
                  <span className="vocabulary-batch-answer-number">{String(index + 1).padStart(2, '0')}</span>
                  <div className="vocabulary-batch-word-cell">
                    <strong>{word.word}</strong>
                    <button
                      type="button"
                      className="vocabulary-test-sound-button"
                      title={`Play pronunciation for ${word.word}`}
                      aria-label={`Play pronunciation for ${word.word}`}
                      disabled={isCheckingAnswer}
                      onClick={() => speakEnglishWord(word.word)}
                    >
                      <img className="vocabulary-sound-icon-default" src={defaultSoundIcon} alt="" />
                      <img className="vocabulary-sound-icon-hover" src={hoverSoundIcon} alt="" />
                    </button>
                  </div>
                  <input
                    ref={(element) => {
                      answerInputRefs.current[index] = element
                    }}
                    type="text"
                    value={answers[word.id] ?? ''}
                    maxLength={160}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={isCheckingAnswer}
                    aria-label={`Korean meaning for ${word.word}`}
                    placeholder="Enter the meaning"
                    onChange={(event) => updateAnswer(word.id, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Tab' || event.nativeEvent.isComposing) return

                      const nextIndex = index + (event.shiftKey ? -1 : 1)
                      const nextInput = answerInputRefs.current[nextIndex]
                      if (!nextInput) return

                      event.preventDefault()
                      nextInput.focus()
                      nextInput.select()
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="vocabulary-batch-footer">
              <span aria-live="polite">
                {isCheckingAnswer
                  ? `Checking ${checkingPosition} / ${batchWords.length}...`
                  : `${answeredCount} / ${batchWords.length} answered`}
              </span>
              <button
                type="button"
                className="vocabulary-next-button vocabulary-batch-submit-button"
                disabled={isCheckingAnswer}
                onClick={() => void handleSubmitBatch()}
              >
                <span>{isCheckingAnswer ? 'Checking...' : 'Submit Test'}</span>
                <img src={nextIcon} alt="" />
              </button>
            </div>
          </div>
        ) : status === 'roundResult' && roundResult ? (
          <div className="vocabulary-round-result">
            <span className="vocabulary-round-result-label">Round {roundResult.roundNumber} Complete</span>
            <h2>Round Results</h2>
            <p>Retest only the words you missed from this random set.</p>

            <div className="vocabulary-round-score-grid" aria-label="Round score">
              <div className="correct">
                <strong>{roundResult.correct}</strong>
                <span>Correct</span>
              </div>
              <div className="incorrect">
                <strong>{roundResult.missedAnswers.length}</strong>
                <span>Incorrect</span>
              </div>
            </div>

            <div className="vocabulary-round-missed-panel">
              <div className="vocabulary-round-missed-header">
                <strong>Incorrect Words</strong>
                <span>{roundResult.missedAnswers.length}</span>
              </div>
              <div className="vocabulary-round-missed-list">
                {roundResult.missedAnswers.map(({ word, userAnswer }) => (
                  <div className="vocabulary-round-missed-row" key={word.id}>
                    <strong>{word.word}</strong>
                    <div className="vocabulary-round-answer-cell user-answer">
                      <small>Your answer</small>
                      <span>{userAnswer ?? 'No answer'}</span>
                    </div>
                    <div className="vocabulary-round-answer-cell correct-answer">
                      <small>Correct answer</small>
                      <span>{word.correctMeaning}</span>
                    </div>
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
            <h2>{words.length > 0 ? 'Random set complete!' : 'No words to test'}</h2>
            <p>
              {words.length > 0
                ? `You cleared the selected words after ${roundNumber} ${roundNumber === 1 ? 'round' : 'rounds'}.`
                : 'Add vocabulary first, then start a test.'}
            </p>
            <div className="vocabulary-complete-actions">
              {words.length > 0 && <button type="button" className="vocabulary-restart-button" onClick={handleRestart}>New Random Test</button>}
              <button type="button" className="vocabulary-complete-back-button" onClick={onBack}>Back to List</button>
            </div>
          </div>
        )}

        {isCheckingAnswer && status === 'testing' && (
          <div className="vocabulary-batch-checking-overlay" aria-live="polite">
            <div>
              <span className="vocabulary-batch-checking-spinner" aria-hidden="true" />
              <strong>Checking answers</strong>
              <span>{checkingPosition} / {batchWords.length}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export function VocabularyTestPage(props: Props) {
  if (props.testMode === 'writtenBatch') {
    return <VocabularyBatchTestPage {...props} />
  }

  return <VocabularySequentialTestPage {...props} />
}

