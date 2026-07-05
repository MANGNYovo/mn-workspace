const normalizeLanguage = (value: string) => value.toLocaleLowerCase().replace('_', '-')

const maleVoiceNamePattern = /(?:^|\b)(?:male|guy|david|mark|christopher|eric|roger|ryan|andrew|brian|daniel|alex|aaron|fred|tom|oliver|arthur|eddy|george|james|henry|liam|noah|william)(?:\b|$)/i
const femaleVoiceNamePattern = /(?:^|\b)(?:female|aria|jenny|zira|samantha|victoria|karen|moira|tessa|ava|allison|susan|hazel|heera|joanna|emma)(?:\b|$)/i

const isEnglishVoice = (voice: SpeechSynthesisVoice) => {
  const language = normalizeLanguage(voice.lang)
  return language === 'en' || language.startsWith('en-')
}

const isUsEnglishVoice = (voice: SpeechSynthesisVoice) => normalizeLanguage(voice.lang) === 'en-us'
const isLikelyMaleVoice = (voice: SpeechSynthesisVoice) => maleVoiceNamePattern.test(voice.name)
const isLikelyFemaleVoice = (voice: SpeechSynthesisVoice) => femaleVoiceNamePattern.test(voice.name)

const pickEnglishVoice = (voices: SpeechSynthesisVoice[]) => {
  const englishVoices = voices.filter(isEnglishVoice)
  const usEnglishVoices = englishVoices.filter(isUsEnglishVoice)

  return usEnglishVoices.find(isLikelyMaleVoice)
    ?? englishVoices.find(isLikelyMaleVoice)
    ?? usEnglishVoices.find((voice) => !isLikelyFemaleVoice(voice))
    ?? englishVoices.find((voice) => !isLikelyFemaleVoice(voice))
    ?? usEnglishVoices[0]
    ?? englishVoices[0]
    ?? null
}

export const speakEnglishWord = (text: string) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false

  const word = text.trim()
  if (!word) return false

  const synth = window.speechSynthesis
  const utterance = new SpeechSynthesisUtterance(word)
  const voice = pickEnglishVoice(synth.getVoices())

  utterance.lang = voice?.lang || 'en-US'
  utterance.rate = 0.9
  utterance.pitch = 0.85
  utterance.volume = 1
  if (voice) utterance.voice = voice

  synth.cancel()
  synth.speak(utterance)
  return true
}

export const stopEnglishSpeech = () => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
}
