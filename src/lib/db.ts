import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { LogRecord, QueueItem, StateRecord } from '../types'

interface Schema extends DBSchema {
  states: { key: string; value: StateRecord }
  logs: { key: number; value: LogRecord; indexes: { ts: number } }
  queue: { key: string; value: QueueItem }
}

let dbp: Promise<IDBPDatabase<Schema>> | undefined

function db() {
  dbp ??= openDB<Schema>('lexique', 1, {
    upgrade(d) {
      d.createObjectStore('states', { keyPath: 'id' })
      d.createObjectStore('logs', { keyPath: 'n', autoIncrement: true }).createIndex('ts', 'ts')
      d.createObjectStore('queue', { keyPath: 'id' })
    },
  })
  return dbp
}

export const allStates = async () => (await db()).getAll('states')
export const allLogs = async () => (await db()).getAll('logs')
export const logsSince = async (ts: number) =>
  (await db()).getAllFromIndex('logs', 'ts', IDBKeyRange.lowerBound(ts))

export async function saveReview(state: StateRecord, log: LogRecord) {
  const tx = (await db()).transaction(['states', 'logs'], 'readwrite')
  await Promise.all([tx.objectStore('states').put(state), tx.objectStore('logs').add(log), tx.done])
}

export const allQueue = async () =>
  (await (await db()).getAll('queue')).sort((a, b) => b.addedAt - a.addedAt)
export const putQueue = async (item: QueueItem) => void (await (await db()).put('queue', item))
export const deleteQueue = async (id: string) => (await db()).delete('queue', id)

export interface Dump {
  states: StateRecord[]
  logs: LogRecord[]
  queue: QueueItem[]
}

export async function dumpAll(): Promise<Dump> {
  const d = await db()
  const [states, logs, queue] = await Promise.all([d.getAll('states'), d.getAll('logs'), d.getAll('queue')])
  return { states, logs, queue }
}

/** Remplace toute la base par le contenu d'une sauvegarde. */
export async function replaceAll(dump: Dump) {
  const tx = (await db()).transaction(['states', 'logs', 'queue'], 'readwrite')
  const states = tx.objectStore('states')
  const logs = tx.objectStore('logs')
  const queue = tx.objectStore('queue')
  await Promise.all([states.clear(), logs.clear(), queue.clear()])
  await Promise.all([
    ...dump.states.map((s) => states.put(s)),
    ...dump.logs.map(({ n: _n, ...l }) => logs.add(l)),
    ...dump.queue.map((q) => queue.put(q)),
    tx.done,
  ])
}
