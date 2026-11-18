import type { Lang } from '../types'

const VOICE: Record<Lang, string> = { en: 'en-GB', it: 'it-IT', fr: 'fr-FR' }

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

// Safari ne charge la liste des voix qu'après un premier appel.
if (canSpeak) speechSynthesis.getVoices()

export function speak(text: string, lang: Lang) {
  if (!canSpeak) return
  const tag = VOICE[lang]
  const u = new SpeechSynthesisUtterance(text.replace(/\*/g, ''))
  u.lang = tag
  const voices = speechSynthesis.getVoices()
  const norm = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-')
  const voice = voices.find((v) => norm(v) === tag) ?? voices.find((v) => norm(v).startsWith(tag.slice(0, 2)))
  if (voice) u.voice = voice
  u.rate = 0.92
  speechSynthesis.cancel()
  speechSynthesis.speak(u)
}
