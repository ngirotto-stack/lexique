import { DefaultScheduler } from 'ts-fsrs'
import type { Grade } from '../types'

/** FSRS, rétention cible 90 %. */
export const scheduler = await DefaultScheduler({ desiredRetention: 0.9, enableFuzz: true })

export type SrsCard = ReturnType<typeof scheduler.newCard>

export const STATE_NEW = 0
export const STATE_REVIEW = 2

export const newCard = (now: Date): SrsCard => scheduler.newCard({ now })

export const review = (card: SrsCard, grade: Grade, now: Date): SrsCard =>
  scheduler.review({ card, grade, now }).card as SrsCard

/** Prochaine échéance pour chacune des quatre notes. */
export function previewDue(card: SrsCard, now: Date): Record<Grade, Date> {
  const out = {} as Record<Grade, Date>
  for (const p of scheduler.preview({ card, now })) out[p.grade as Grade] = p.card.dueAt
  return out
}

export function formatInterval(ms: number): string {
  const min = ms / 60_000
  if (min < 60) return `${Math.max(1, Math.round(min))} min`
  const h = min / 60
  if (h < 24) return `${Math.round(h)} h`
  const d = h / 24
  if (d < 30) return `${Math.round(d)} j`
  if (d < 365) return `${Math.round(d / 30)} mois`
  const y = d / 365
  return `${y < 10 ? Math.round(y * 10) / 10 : Math.round(y)} an${y >= 2 ? 's' : ''}`.replace('.', ',')
}
