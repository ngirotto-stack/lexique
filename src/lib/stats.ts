import { LANGS, type DeckCard, type Lang, type LogRecord, type StateRecord } from '../types'
import { dayKey, previousDayKey, startOfDay } from './day'
import { STATE_REVIEW } from './scheduler'
import { buildPlan } from './session'

export interface LangStats {
  total: number
  /** Cartes sorties de l'apprentissage initial (état « révision »). */
  learned: number
  /** Cartes vues mais encore en apprentissage. */
  learning: number
}

export interface Stats {
  perLang: Record<Lang, LangStats>
  dueReviews: number
  dueNew: number
  reviewedToday: number
  streak: number
  /** Part des révisions de cartes mûres réussies sur 30 jours, ou null sans données. */
  retention: number | null
  retentionSample: number
}

const DAY_MS = 24 * 3_600_000

export function computeStats(deck: DeckCard[], states: StateRecord[], logs: LogRecord[], now: number): Stats {
  const byId = new Map(states.map((s) => [s.id, s]))
  const perLang = Object.fromEntries(
    LANGS.map((l) => [l, { total: 0, learned: 0, learning: 0 }]),
  ) as Record<Lang, LangStats>
  for (const c of deck) {
    const p = perLang[c.lang]
    p.total++
    const s = byId.get(c.id)
    if (s?.card.state === STATE_REVIEW) p.learned++
    else if (s) p.learning++
  }

  const dayStart = startOfDay(now)
  const logsToday = logs.filter((l) => l.ts >= dayStart)
  const plan = buildPlan(deck, states, logsToday, now)

  const days = new Set(logs.map((l) => dayKey(l.ts)))
  let cursor = dayKey(now)
  // Une série reste vivante tant que la journée en cours n'est pas terminée.
  if (!days.has(cursor)) cursor = previousDayKey(cursor)
  let streak = 0
  while (days.has(cursor)) {
    streak++
    cursor = previousDayKey(cursor)
  }

  const mature = logs.filter((l) => l.ts >= now - 30 * DAY_MS && l.prevState === STATE_REVIEW)
  const retention = mature.length ? mature.filter((l) => l.grade > 1).length / mature.length : null

  return {
    perLang,
    dueReviews: plan.reviews,
    dueNew: plan.fresh,
    reviewedToday: logsToday.length,
    streak,
    retention,
    retentionSample: mature.length,
  }
}
