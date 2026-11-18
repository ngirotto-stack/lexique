import { cardId, type CardContent, type DeckCard } from '../types'

// Le contenu des cartes vit dans cards/*.json et part dans le build ;
// IndexedDB ne garde que la progression.
const files = import.meta.glob<CardContent[]>('../../cards/*.json', { eager: true, import: 'default' })

export const deck: DeckCard[] = Object.values(files)
  .flat()
  .map((c) => ({ ...c, id: cardId(c.lang, c.word) }))

export const deckById = new Map(deck.map((c) => [c.id, c]))
