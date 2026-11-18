import type { DeckCard, Lang, LogRecord, StateRecord } from '../types'
import { endOfDay } from './day'
import { STATE_NEW, STATE_REVIEW } from './scheduler'

export const NEW_PER_DAY = 10
export const SESSION_MS = 5 * 60_000
/** Une carte en apprentissage due d'ici là peut être montrée en avance. */
export const LEARN_AHEAD_MS = 20 * 60_000

// Dosage des 10 nouveaux mots du jour : l'anglais d'abord (6), puis 2 et 2.
const NEW_PATTERN: Lang[] = ['en', 'en', 'it', 'en', 'en', 'fr', 'en', 'it', 'en', 'fr']
const FALLBACK: Lang[] = ['en', 'it', 'fr']

/** Choisit les nouveaux mots du jour, en reprenant le dosage là où il en était. */
export function pickNew(unseen: DeckCard[], alreadyToday: number): DeckCard[] {
  const pools: Record<Lang, DeckCard[]> = { en: [], it: [], fr: [] }
  for (const c of unseen) pools[c.lang].push(c)
  const out: DeckCard[] = []
  for (let slot = alreadyToday; slot < NEW_PER_DAY; slot++) {
    const lang = [NEW_PATTERN[slot], ...FALLBACK].find((l) => pools[l].length > 0)
    if (!lang) break
    out.push(pools[lang].shift()!)
  }
  return out
}

export const newSeenToday = (logsToday: LogRecord[]) =>
  logsToday.filter((l) => l.prevState === STATE_NEW).length

/** Une carte déjà vue est-elle à réviser maintenant ? */
export function isDue(s: StateRecord, now: number): boolean {
  const due = s.card.dueAt.getTime()
  // Les cartes mûres comptent pour toute la journée ; les pas d'apprentissage, à l'heure dite.
  return s.card.state === STATE_REVIEW ? due <= endOfDay(now) : due <= now + LEARN_AHEAD_MS
}

export interface Plan {
  queue: string[]
  reviews: number
  fresh: number
}

export function buildPlan(deck: DeckCard[], states: StateRecord[], logsToday: LogRecord[], now: number): Plan {
  const inDeck = new Set(deck.map((c) => c.id))
  const seen = new Set(states.map((s) => s.id))
  const reviews = states
    .filter((s) => inDeck.has(s.id) && isDue(s, now))
    .sort((a, b) => a.card.dueAt.getTime() - b.card.dueAt.getTime())
    .map((s) => s.id)
  const fresh = pickNew(deck.filter((c) => !seen.has(c.id)), newSeenToday(logsToday)).map((c) => c.id)

  // Les nouveaux mots sont répartis parmi les révisions plutôt que groupés à la fin.
  const queue: string[] = []
  const every = fresh.length ? Math.max(1, Math.floor(reviews.length / fresh.length)) : 0
  let f = 0
  reviews.forEach((id, i) => {
    queue.push(id)
    if (f < fresh.length && (i + 1) % every === 0) queue.push(fresh[f++])
  })
  queue.push(...fresh.slice(f))
  return { queue, reviews: reviews.length, fresh: fresh.length }
}
