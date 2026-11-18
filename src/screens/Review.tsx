import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { startOfDay } from '../lib/day'
import { allStates, logsSince, saveReview } from '../lib/db'
import { deck, deckById } from '../lib/deck'
import { formatInterval, newCard, previewDue, review } from '../lib/scheduler'
import { buildPlan, LEARN_AHEAD_MS, SESSION_MS } from '../lib/session'
import { canSpeak, speak } from '../lib/speech'
import { LANG_LABEL, LANG_SHORT, type DeckCard, type Grade, type StateRecord } from '../types'

type Phase = 'loading' | 'intro' | 'card' | 'timeup' | 'done'

const GRADES: { grade: Grade; label: string; cls: string }[] = [
  { grade: 1, label: 'À revoir', cls: 'again' },
  { grade: 2, label: 'Difficile', cls: 'hard' },
  { grade: 3, label: 'Bien', cls: 'good' },
  { grade: 4, label: 'Facile', cls: 'easy' },
]

/** Affiche une phrase d'exemple : le mot balisé est masqué ou mis en valeur. */
function Sentence({ text, masked, hint }: { text: string; masked?: boolean; hint?: boolean }) {
  const parts = text.split(/\*([^*]+)\*/)
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 0 ? (
          p
        ) : masked ? (
          <span key={i} className="blank" aria-label="mot masqué">
            {hint ? p[0] : ''}
          </span>
        ) : (
          <mark key={i}>{p}</mark>
        ),
      )}
    </>
  )
}

function SpeakButton({ text, card, label }: { text: string; card: DeckCard; label: string }) {
  if (!canSpeak) return null
  return (
    <button className="speak" aria-label={label} onClick={() => speak(text, card.lang)}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 10v4h3l5 4V6L7 10H4Zm12-1.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" />
      </svg>
    </button>
  )
}

export default function Review() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [counts, setCounts] = useState({ reviews: 0, fresh: 0 })
  const [current, setCurrent] = useState<DeckCard | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const [hint, setHint] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [error, setError] = useState<string | null>(null)

  // État de la session : mutable, il ne pilote pas l'affichage directement.
  const s = useRef({
    queue: [] as string[],
    learning: [] as { id: string; due: number }[],
    states: new Map<string, StateRecord>(),
    startedAt: 0,
    done: 0,
    again: 0,
    busy: false,
  })

  const load = useCallback(async () => {
    const [states, logsToday] = await Promise.all([allStates(), logsSince(startOfDay())])
    const plan = buildPlan(deck, states, logsToday, Date.now())
    Object.assign(s.current, {
      queue: plan.queue,
      learning: [],
      states: new Map(states.map((r) => [r.id, r])),
      done: 0,
      again: 0,
      busy: false,
    })
    setCounts({ reviews: plan.reviews, fresh: plan.fresh })
    setPhase('intro')
  }, [])

  useEffect(() => {
    load().catch((e) => setError(String(e?.message ?? e)))
  }, [load])

  useEffect(() => {
    if (phase !== 'card') return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [phase])

  const next = useCallback(() => {
    const st = s.current
    const t = Date.now()
    st.learning.sort((a, b) => a.due - b.due)
    let id: string | undefined
    if (st.learning[0]?.due <= t) id = st.learning.shift()!.id
    else id = st.queue.shift() ?? st.learning.shift()?.id
    const card = id ? deckById.get(id) : undefined
    setRevealed(false)
    setShowTranslation(false)
    setHint(false)
    setNow(t)
    if (card) {
      setCurrent(card)
      setPhase('card')
    } else {
      setCurrent(null)
      setPhase('done')
    }
  }, [])

  const start = () => {
    s.current.startedAt = Date.now()
    next()
  }

  const rate = useCallback(
    async (grade: Grade) => {
      const st = s.current
      if (!current || st.busy) return
      st.busy = true
      try {
        const at = new Date()
        const prev = st.states.get(current.id)?.card ?? newCard(at)
        const card = review(prev, grade, at)
        const record: StateRecord = { id: current.id, lang: current.lang, card }
        await saveReview(record, { id: current.id, lang: current.lang, ts: at.getTime(), grade, prevState: prev.state })
        st.states.set(current.id, record)
        st.done++
        if (grade === 1) st.again++
        // Un pas d'apprentissage court revient dans la même session.
        const due = card.dueAt.getTime()
        if (due - at.getTime() <= LEARN_AHEAD_MS) st.learning.push({ id: current.id, due })
        if (Date.now() - st.startedAt >= SESSION_MS && (st.queue.length || st.learning.length)) setPhase('timeup')
        else next()
      } catch (e) {
        setError(`La révision n'a pas pu être enregistrée : ${(e as Error).message}`)
      } finally {
        st.busy = false
      }
    },
    [current, next],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'card') return
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        setRevealed(true)
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        void rate(Number(e.key) as Grade)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, revealed, rate])

  const intervals = useMemo(() => {
    if (!current || !revealed) return null
    const at = new Date()
    const due = previewDue(s.current.states.get(current.id)?.card ?? newCard(at), at)
    return Object.fromEntries(GRADES.map(({ grade }) => [grade, formatInterval(due[grade].getTime() - at.getTime())]))
  }, [current, revealed])

  if (error) {
    return (
      <div className="center">
        <p className="lead">Un problème est survenu.</p>
        <p className="muted">{error}</p>
        <button className="btn" onClick={() => location.reload()}>
          Recharger
        </button>
      </div>
    )
  }

  if (phase === 'loading') return <div className="center muted">Chargement…</div>

  if (phase === 'intro') {
    const total = counts.reviews + counts.fresh
    return (
      <div className="center">
        <p className="eyebrow">Session du jour</p>
        {total === 0 ? (
          <>
            <h1 className="display">Rien à réviser</h1>
            <p className="muted">Les 10 nouveaux mots du jour sont vus et aucune carte n'est due. À demain.</p>
          </>
        ) : (
          <>
            <h1 className="display">
              {total} carte{total > 1 ? 's' : ''}
            </h1>
            <p className="muted">
              {counts.reviews} à réviser · {counts.fresh} nouveau{counts.fresh > 1 ? 'x' : ''} · 5 minutes environ
            </p>
            <button className="btn primary" onClick={start}>
              Commencer
            </button>
          </>
        )}
      </div>
    )
  }

  if (phase === 'timeup' || phase === 'done') {
    const st = s.current
    const left = st.queue.length + st.learning.length
    return (
      <div className="center">
        <p className="eyebrow">{phase === 'done' ? 'Session terminée' : '5 minutes écoulées'}</p>
        <h1 className="display">
          {st.done} révision{st.done > 1 ? 's' : ''}
        </h1>
        <p className="muted">
          {st.done > 0 && `${Math.round((1 - st.again / st.done) * 100)} % de réussite. `}
          {left > 0 ? `Il reste ${left} carte${left > 1 ? 's' : ''} pour aujourd'hui.` : 'Tout est à jour pour aujourd\'hui.'}
        </p>
        {phase === 'timeup' && (
          <button
            className="btn primary"
            onClick={() => {
              st.startedAt = Date.now()
              next()
            }}
          >
            Continuer 5 minutes
          </button>
        )}
        <button className="btn" onClick={() => void load()}>
          {phase === 'timeup' ? 'Arrêter là' : 'Terminer'}
        </button>
      </div>
    )
  }

  if (!current) return null
  const st = s.current
  const elapsed = Math.min(1, (now - st.startedAt) / SESSION_MS)
  const remaining = st.queue.length + st.learning.length + 1
  const isNew = !st.states.has(current.id)

  return (
    <div className="review">
      <header className="review-head">
        <span className={`chip lang-${current.lang}`} title={LANG_LABEL[current.lang]}>
          {LANG_SHORT[current.lang]}
        </span>
        {isNew && <span className="chip new">nouveau</span>}
        <div className="timebar" role="progressbar" aria-label="Temps de session" aria-valuenow={Math.round(elapsed * 100)}>
          <div style={{ width: `${elapsed * 100}%` }} />
        </div>
        <span className="count">{remaining}</span>
      </header>

      <article className="card" key={current.id}>
        {!revealed ? (
          <>
            <p className="sentence" onClick={() => setHint(true)}>
              <Sentence text={current.examples[0]} masked hint={hint} />
            </p>
            <p className="definition">{current.definition}</p>
            {!hint && <p className="tip">Touchez la phrase pour un indice.</p>}
          </>
        ) : (
          <>
            <div className="word-row">
              <h2 className="word">{current.word}</h2>
              <SpeakButton text={current.word} card={current} label={`Prononcer ${current.word}`} />
            </div>
            <p className="meta">
              {current.pos && <span>{current.pos}</span>}
              <span>{current.register}</span>
              {current.source && <span>{current.source}</span>}
            </p>
            <p className="definition">{current.definition}</p>
            <ul className="examples">
              {current.examples.map((ex) => (
                <li key={ex}>
                  <p className="sentence small">
                    <Sentence text={ex} />
                  </p>
                  <SpeakButton text={ex} card={current} label="Lire la phrase" />
                </li>
              ))}
            </ul>
            <button className="translation" aria-expanded={showTranslation} onClick={() => setShowTranslation((v) => !v)}>
              <span className="label">{current.lang === 'fr' ? 'En plus simple' : 'En français'}</span>
              <span className={showTranslation ? 'value' : 'value hidden'}>
                {showTranslation ? current.translation : 'toucher pour afficher'}
              </span>
            </button>
          </>
        )}
      </article>

      <footer className="actions">
        {!revealed ? (
          <button className="btn primary wide" onClick={() => setRevealed(true)}>
            Révéler
          </button>
        ) : (
          <div className="grades">
            {GRADES.map(({ grade, label, cls }) => (
              <button key={grade} className={`grade ${cls}`} onClick={() => void rate(grade)}>
                <span>{label}</span>
                <small>{intervals?.[grade]}</small>
              </button>
            ))}
          </div>
        )}
      </footer>
    </div>
  )
}
