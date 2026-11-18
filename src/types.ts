import type { SrsCard } from './lib/scheduler'

export type Lang = 'en' | 'it' | 'fr'
export type Register = 'courant' | 'soutenu' | 'familier'
export type Grade = 1 | 2 | 3 | 4

/** Une entrée de cards/*.json. Le mot est balisé *ainsi* dans les exemples. */
export interface CardContent {
  word: string
  lang: Lang
  pos?: string
  definition: string
  examples: [string, string]
  register: Register
  translation: string
  source?: string
}

export interface DeckCard extends CardContent {
  id: string
}

/** État FSRS d'une carte déjà vue. Une carte sans état est « nouvelle ». */
export interface StateRecord {
  id: string
  lang: Lang
  card: SrsCard
}

export interface LogRecord {
  n?: number
  id: string
  lang: Lang
  ts: number
  grade: Grade
  /** État avant la révision : 0 nouveau, 1 apprentissage, 2 révision, 3 réapprentissage. */
  prevState: number
}

export interface QueueItem {
  id: string
  word: string
  lang: Lang
  note?: string
  addedAt: number
}

export const LANGS: Lang[] = ['en', 'it', 'fr']
export const LANG_LABEL: Record<Lang, string> = { en: 'Anglais', it: 'Italien', fr: 'Français' }
export const LANG_SHORT: Record<Lang, string> = { en: 'EN', it: 'IT', fr: 'FR' }

export const cardId = (lang: Lang, word: string) => `${lang}:${word.trim().toLowerCase()}`
