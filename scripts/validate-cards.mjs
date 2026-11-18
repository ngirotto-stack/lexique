// Vérifie cards/*.json avant chaque build. Usage : node scripts/validate-cards.mjs
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'cards')
const LANGS = ['en', 'it', 'fr']
const REGISTERS = ['courant', 'soutenu', 'familier']
const MARK = /\*[^*]+\*/g

const errors = []
const seen = new Set()
const counts = {}

for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  let cards
  try {
    cards = JSON.parse(readFileSync(join(dir, file), 'utf8'))
  } catch (e) {
    errors.push(`${file}: JSON invalide (${e.message})`)
    continue
  }
  if (!Array.isArray(cards)) {
    errors.push(`${file}: doit contenir un tableau de cartes`)
    continue
  }
  cards.forEach((c, i) => {
    const where = `${file}[${i}] ${c?.word ?? '?'}`
    const str = (k) => typeof c[k] === 'string' && c[k].trim().length > 0
    for (const k of ['word', 'lang', 'definition', 'register', 'translation']) {
      if (!str(k)) errors.push(`${where}: champ « ${k} » manquant`)
    }
    if (!LANGS.includes(c.lang)) errors.push(`${where}: langue « ${c.lang} » inconnue`)
    if (!REGISTERS.includes(c.register)) errors.push(`${where}: registre « ${c.register} » inconnu`)
    if (!Array.isArray(c.examples) || c.examples.length !== 2) {
      errors.push(`${where}: il faut exactement 2 exemples`)
    } else {
      c.examples.forEach((ex, n) => {
        const marks = typeof ex === 'string' ? ex.match(MARK) : null
        if (!marks || marks.length !== 1) {
          errors.push(`${where}: l'exemple ${n + 1} doit baliser le mot une fois, *ainsi*`)
        }
      })
    }
    if (str('word') && str('definition') && c.lang !== 'fr') {
      const stem = c.word.toLowerCase().slice(0, Math.max(4, c.word.length - 2))
      if (c.definition.toLowerCase().includes(stem)) {
        errors.push(`${where}: la définition contient le mot à deviner`)
      }
    }
    const id = `${c.lang}:${String(c.word).toLowerCase()}`
    if (seen.has(id)) errors.push(`${where}: doublon`)
    seen.add(id)
    counts[c.lang] = (counts[c.lang] ?? 0) + 1
  })
}

if (errors.length) {
  console.error(errors.join('\n'))
  console.error(`\n${errors.length} erreur(s) dans les cartes.`)
  process.exit(1)
}
console.log(`Cartes valides : ${LANGS.map((l) => `${l} ${counts[l] ?? 0}`).join(' · ')}`)
