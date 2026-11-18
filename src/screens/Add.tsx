import { useEffect, useState, type FormEvent } from 'react'
import { allQueue, deleteQueue, putQueue } from '../lib/db'
import { deckById } from '../lib/deck'
import { cardId, LANGS, LANG_LABEL, LANG_SHORT, type Lang, type QueueItem } from '../types'

export default function Add() {
  const [word, setWord] = useState('')
  const [lang, setLang] = useState<Lang>('en')
  const [note, setNote] = useState('')
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  const refresh = () => allQueue().then(setQueue)
  useEffect(() => void refresh(), [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const w = word.trim()
    if (!w) return
    const id = cardId(lang, w)
    if (deckById.has(id)) return setMessage({ text: `« ${w} » est déjà dans le paquet.`, ok: false })
    if (queue.some((q) => q.id === id)) return setMessage({ text: `« ${w} » est déjà dans la file.`, ok: false })
    await putQueue({ id, word: w, lang, note: note.trim() || undefined, addedAt: Date.now() })
    setWord('')
    setNote('')
    setMessage({ text: `« ${w} » ajouté à la file.`, ok: true })
    await refresh()
  }

  const remove = async (id: string) => {
    await deleteQueue(id)
    await refresh()
  }

  const copy = async () => {
    const payload = queue.map(({ word, lang, note }) => ({ word, lang, ...(note ? { source: note } : {}) }))
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      setMessage({ text: 'File copiée. Collez-la dans Claude Code pour l\'enrichir.', ok: true })
    } catch {
      setMessage({ text: 'Copie impossible : utilisez la sauvegarde du tableau de bord.', ok: false })
    }
  }

  return (
    <div className="page">
      <h1 className="title">Ajouter un mot</h1>
      <form className="form" onSubmit={submit}>
        <div className="segmented" role="radiogroup" aria-label="Langue">
          {LANGS.map((l) => (
            <button key={l} type="button" role="radio" aria-checked={lang === l} onClick={() => setLang(l)}>
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>
        <input
          className="input"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="Le mot"
          aria-label="Mot"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
        />
        <input
          className="input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Où l'avez-vous croisé ? (facultatif)"
          aria-label="Source"
        />
        <button className="btn primary wide" disabled={!word.trim()}>
          Mettre en file
        </button>
        <p className={`message ${message?.ok ? 'ok' : 'warn'}`} role="status">
          {message?.text}
        </p>
      </form>

      <section className="section">
        <div className="section-head">
          <h2>À enrichir</h2>
          <span className="muted">{queue.length}</span>
        </div>
        {queue.length === 0 ? (
          <p className="muted">
            La file est vide. Les mots ajoutés ici attendent leur définition et leurs exemples avant d'entrer en révision.
          </p>
        ) : (
          <>
            <ul className="list">
              {queue.map((q) => (
                <li key={q.id}>
                  <span className={`chip lang-${q.lang}`}>{LANG_SHORT[q.lang]}</span>
                  <span className="grow">
                    <strong>{q.word}</strong>
                    {q.note && <small>{q.note}</small>}
                  </span>
                  <button className="icon-btn" aria-label={`Retirer ${q.word}`} onClick={() => void remove(q.id)}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <button className="btn wide" onClick={() => void copy()}>
              Copier la file pour Claude Code
            </button>
          </>
        )}
      </section>
    </div>
  )
}
