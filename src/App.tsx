import { useEffect, useState } from 'react'
import { allQueue, deleteQueue } from './lib/db'
import { deckById } from './lib/deck'
import Add from './screens/Add'
import Dashboard from './screens/Dashboard'
import Review from './screens/Review'

type Tab = 'review' | 'add' | 'stats'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'review', label: 'Réviser', icon: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm3 5h8M8 13h3m3 0h2' },
  { id: 'add', label: 'Ajouter', icon: 'M12 5v14M5 12h14' },
  { id: 'stats', label: 'Tableau de bord', icon: 'M5 20V10m7 10V4m7 16v-7' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('review')

  // Un mot de la file déjà enrichi (présent dans cards/*.json) en sort tout seul.
  useEffect(() => {
    void allQueue().then((q) => Promise.all(q.filter((i) => deckById.has(i.id)).map((i) => deleteQueue(i.id))))
  }, [])

  return (
    <div className="app">
      <main className="screen">
        {tab === 'review' && <Review />}
        {tab === 'add' && <Add />}
        {tab === 'stats' && <Dashboard />}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className="tab" aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={t.icon} />
            </svg>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
