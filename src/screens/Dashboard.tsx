import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { exportBackup, importBackup, lastBackupAt, parseBackup } from '../lib/backup'
import { allLogs, allStates } from '../lib/db'
import { deck } from '../lib/deck'
import { computeStats, type Stats } from '../lib/stats'
import { LANGS, LANG_LABEL } from '../types'

const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [backupAt, setBackupAt] = useState(lastBackupAt())
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const refresh = async () => {
    const [states, logs] = await Promise.all([allStates(), allLogs()])
    setStats(computeStats(deck, states, logs, Date.now()))
  }
  useEffect(() => void refresh(), [])

  const doExport = async () => {
    try {
      await exportBackup()
      setBackupAt(lastBackupAt())
    } catch (e) {
      setMessage({ text: `Export impossible : ${(e as Error).message}`, ok: false })
    }
  }

  const doImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const dump = parseBackup(await file.text())
      const ok = window.confirm(
        `Remplacer toute la progression de cet appareil par la sauvegarde (${dump.states.length} cartes, ${dump.logs.length} révisions) ?`,
      )
      if (!ok) return
      await importBackup(dump)
      await refresh()
      setMessage({ text: 'Sauvegarde restaurée.', ok: true })
    } catch (err) {
      setMessage({ text: (err as Error).message, ok: false })
    }
  }

  if (!stats) return <div className="center muted">Chargement…</div>
  const due = stats.dueReviews + stats.dueNew

  return (
    <div className="page">
      <h1 className="title">Tableau de bord</h1>

      <div className="tiles">
        <div className="tile">
          <span className="tile-value">{due}</span>
          <span className="tile-label">à faire aujourd'hui</span>
          <span className="tile-note">
            {stats.dueReviews} révision{stats.dueReviews > 1 ? 's' : ''} · {stats.dueNew} nouveau{stats.dueNew > 1 ? 'x' : ''}
          </span>
        </div>
        <div className="tile">
          <span className="tile-value">{stats.streak}</span>
          <span className="tile-label">jour{stats.streak > 1 ? 's' : ''} d'affilée</span>
          <span className="tile-note">
            {stats.reviewedToday > 0 ? `${stats.reviewedToday} révisions aujourd'hui` : "pas encore révisé aujourd'hui"}
          </span>
        </div>
        <div className="tile">
          <span className="tile-value">
            {stats.retention === null ? '—' : `${Math.round(stats.retention * 100)} %`}
          </span>
          <span className="tile-label">de rétention</span>
          <span className="tile-note">
            {stats.retention === null
              ? 'se calcule dès les premières cartes mûres'
              : `${stats.retentionSample} révisions sur 30 jours · cible 90 %`}
          </span>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Mots appris</h2>
        </div>
        <ul className="langs">
          {LANGS.map((l) => {
            const p = stats.perLang[l]
            const pct = (n: number) => `${p.total ? (n / p.total) * 100 : 0}%`
            return (
              <li key={l}>
                <div className="lang-row">
                  <span>{LANG_LABEL[l]}</span>
                  <span>
                    <strong>{p.learned}</strong>
                    <span className="muted"> / {p.total}</span>
                  </span>
                </div>
                <div className={`bar lang-${l}`} aria-hidden="true">
                  <div className="learned" style={{ width: pct(p.learned) }} />
                  <div className="learning" style={{ width: pct(p.learning) }} />
                </div>
                {p.learning > 0 && <small className="muted">{p.learning} en cours d'apprentissage</small>}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Sauvegarde</h2>
        </div>
        <p className="muted">
          La progression n'existe que sur cet appareil.{' '}
          {backupAt
            ? `Dernier export le ${new Date(backupAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}.`
            : 'Aucun export pour le moment.'}
        </p>
        <div className="row">
          <button className="btn" onClick={() => void doExport()}>
            Exporter
          </button>
          <button className="btn" onClick={() => fileInput.current?.click()}>
            Importer
          </button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={doImport} />
        </div>
        <p className={`message ${message?.ok ? 'ok' : 'warn'}`} role="status">
          {message?.text}
        </p>
      </section>

      {isIOS && !isStandalone && (
        <section className="section note">
          <h2>Installer sur l'iPhone</h2>
          <p className="muted">
            Dans Safari, touchez Partager puis « Sur l'écran d'accueil ». L'app s'ouvre alors en plein écran, fonctionne hors
            ligne et sa progression n'est plus effacée après quelques jours sans visite.
          </p>
        </section>
      )}
    </div>
  )
}
