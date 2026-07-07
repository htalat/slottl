import { useCallback, useEffect, useState } from 'react'
import type { FoodOption } from '../components/slot-machine'
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

/**
 * The editable food list for a source.
 *
 * The static arrays in src/data/sources/ act as SEEDS: until the user
 * edits a list in the app, they see the seed. The first edit copies the
 * list into localStorage (`slottl:foods:<sourceId>`), which wins from
 * then on. `reset` deletes the copy and returns to the seed.
 */
export function useFoodList(source: FoodSource) {
  const [foods, setFoods] = useState<FoodOption[]>(
    () => loadStored(source.id) ?? source.foods,
  )
  const [isCustomized, setIsCustomized] = useState(
    () => loadStored(source.id) !== null,
  )

  // Re-load when the user switches sources.
  useEffect(() => {
    const stored = loadStored(source.id)
    setFoods(stored ?? source.foods)
    setIsCustomized(stored !== null)
  }, [source])

  const commit = useCallback(
    (next: FoodOption[]) => {
      setFoods(next)
      setIsCustomized(true)
      try {
        localStorage.setItem(storageKey(source.id), JSON.stringify(next))
      } catch {
        // Storage full/blocked: the session still works, it just won't persist.
      }
    },
    [source.id],
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
  }, [source])

  return { foods, addFood, removeFood, resetFoods, isCustomized }
}
