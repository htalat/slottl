import { useCallback, useEffect, useState } from 'react'
import type { FoodOption } from '../components/slot-machine'
import * as api from './api'
import type { FoodSource } from './foodSources'

const STORAGE_PREFIX = 'slottl:foods:'

/** Tints cycled onto newly added foods so the reel stays colorful. */
const TINTS = [
  'bg-rose-50',
  'bg-sky-50',
  'bg-amber-50',
  'bg-emerald-50',
  'bg-violet-50',
  'bg-orange-50',
  'bg-lime-50',
  'bg-fuchsia-50',
]

/**
 * - 'local'   — not signed in (or no API configured): localStorage only
 * - 'syncing' — a server read/write is in flight
 * - 'synced'  — server holds the latest copy
 * - 'error'   — server unreachable; edits are safe locally and will be
 *               pushed wholesale on the next successful edit or reload
 */
export type SyncState = 'local' | 'syncing' | 'synced' | 'error'

function isFoodOption(value: unknown): value is FoodOption {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.emoji === 'string' &&
    typeof v.label === 'string' &&
    (v.tint === undefined || typeof v.tint === 'string')
  )
}

function storageKey(sourceId: string) {
  return STORAGE_PREFIX + sourceId
}

function loadStored(sourceId: string): FoodOption[] | null {
  try {
    const raw = localStorage.getItem(storageKey(sourceId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.every(isFoodOption)) return parsed
  } catch {
    // Corrupt/unavailable storage — fall through to the seed list.
  }
  return null
}

function saveStored(sourceId: string, foods: FoodOption[]): void {
  try {
    localStorage.setItem(storageKey(sourceId), JSON.stringify(foods))
  } catch {
    // Storage full/blocked: the session still works, it just won't persist.
  }
}

/**
 * The editable food list for a source. Local-first, server-authoritative:
 *
 * - Signed out (or no VITE_API_BASE_URL): exactly the old behavior —
 *   seeds from src/data/sources/, edits copied into localStorage.
 * - Signed in: on load the server copy wins; if the server has no copy
 *   yet, the current local list is pushed up as the initial version.
 *   Every edit writes localStorage first (instant, offline-safe), then
 *   PUTs the whole list (last write wins). localStorage doubles as the
 *   offline cache of the server state.
 */
export function useFoodList(source: FoodSource) {
  const token = api.useAuthToken()
  const remote = api.isRemoteEnabled() && token !== null

  const [foods, setFoods] = useState<FoodOption[]>(
    () => loadStored(source.id) ?? source.foods,
  )
  const [isCustomized, setIsCustomized] = useState(
    () => loadStored(source.id) !== null,
  )
  const [syncState, setSyncState] = useState<SyncState>(
    remote ? 'syncing' : 'local',
  )

  // Pull the server copy when the source changes or the user signs in.
  useEffect(() => {
    let cancelled = false
    const local = loadStored(source.id)
    setFoods(local ?? source.foods)
    setIsCustomized(local !== null)

    if (!remote) {
      setSyncState('local')
      return
    }

    setSyncState('syncing')
    api
      .getFoodList(source.id)
      .then(async (list) => {
        if (cancelled) return
        if (list) {
          setFoods(list.foods)
          setIsCustomized(true)
          saveStored(source.id, list.foods)
        } else {
          // First sync for this list: seed the server from local state.
          await api.putFoodList(source.id, local ?? source.foods)
        }
        if (!cancelled) setSyncState('synced')
      })
      .catch(() => {
        // ApiAuthError already cleared the token (drops us to 'local'
        // via the remote flag); anything else is a connectivity error.
        if (!cancelled) setSyncState('error')
      })
    return () => {
      cancelled = true
    }
  }, [source, remote])

  const commit = useCallback(
    (next: FoodOption[]) => {
      setFoods(next)
      setIsCustomized(true)
      saveStored(source.id, next)
      if (!remote) return
      setSyncState('syncing')
      api
        .putFoodList(source.id, next)
        .then(() => setSyncState('synced'))
        .catch(() => setSyncState('error'))
    },
    [source.id, remote],
  )

  const addFood = useCallback(
    (food: { emoji: string; label: string }) => {
      commit([
        ...foods,
        { ...food, tint: TINTS[foods.length % TINTS.length] },
      ])
    },
    [commit, foods],
  )

  const removeFood = useCallback(
    (index: number) => commit(foods.filter((_, i) => i !== index)),
    [commit, foods],
  )

  const resetFoods = useCallback(() => {
    try {
      localStorage.removeItem(storageKey(source.id))
    } catch {
      // ignore
    }
    setFoods(source.foods)
    setIsCustomized(false)
    if (!remote) return
    setSyncState('syncing')
    api
      .deleteFoodList(source.id)
      .then(() => setSyncState('synced'))
      .catch(() => setSyncState('error'))
  }, [source, remote])

  return { foods, addFood, removeFood, resetFoods, isCustomized, syncState }
}
