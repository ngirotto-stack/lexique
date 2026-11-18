// La journée change à 4 h du matin : une révision à 1 h compte pour la veille.
const ROLLOVER_MS = 4 * 3_600_000
const DAY_MS = 24 * 3_600_000

export function dayKey(ts: number = Date.now()): string {
  const d = new Date(ts - ROLLOVER_MS)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function endOfDay(now: number = Date.now()): number {
  const d = new Date(now - ROLLOVER_MS)
  d.setHours(24, 0, 0, 0)
  return d.getTime() + ROLLOVER_MS
}

export const startOfDay = (now: number = Date.now()) => endOfDay(now) - DAY_MS

export function previousDayKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  // Midi, pour rester dans la bonne journée malgré les changements d'heure.
  return dayKey(new Date(y, m - 1, d - 1, 12).getTime() + ROLLOVER_MS)
}
