import { dumpAll, replaceAll, type Dump } from './db'

const LAST_BACKUP_KEY = 'lexique:lastBackup'

export const lastBackupAt = (): number | null => {
  const v = Number(localStorage.getItem(LAST_BACKUP_KEY))
  return v > 0 ? v : null
}

export async function exportBackup(): Promise<void> {
  const dump = await dumpAll()
  const json = JSON.stringify({ app: 'lexique', version: 1, exportedAt: new Date().toISOString(), ...dump })
  const name = `lexique-${new Date().toISOString().slice(0, 10)}.json`
  const file = new File([json], name, { type: 'application/json' })

  // Sur iPhone, la feuille de partage permet « Enregistrer dans Fichiers ».
  if (navigator.maxTouchPoints > 0 && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      throw e
    }
  } else {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()))
}

/** Lit une sauvegarde et rend son contenu, dates restaurées, sans rien écrire. */
export function parseBackup(text: string): Dump {
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("Ce fichier n'est pas du JSON valide.")
  }
  if (data?.app !== 'lexique' || !Array.isArray(data.states) || !Array.isArray(data.logs)) {
    throw new Error("Ce fichier n'est pas une sauvegarde Lexique.")
  }
  if (data.version !== 1) throw new Error(`Version de sauvegarde inconnue (${data.version}).`)
  const date = (v: unknown) => {
    const d = new Date(v as string)
    if (Number.isNaN(d.getTime())) throw new Error('Sauvegarde corrompue : date illisible.')
    return d
  }
  const states = data.states.map((s: any) => ({
    ...s,
    card: {
      ...s.card,
      dueAt: date(s.card.dueAt),
      lastReviewAt: s.card.lastReviewAt == null ? null : date(s.card.lastReviewAt),
    },
  }))
  return { states, logs: data.logs, queue: Array.isArray(data.queue) ? data.queue : [] }
}

export const importBackup = (dump: Dump) => replaceAll(dump)
