import type { FoodOption } from '../components/slot-machine'
import { CLASSICS } from './sources/classics'
import { FRIDGE } from './sources/fridge'
import { RECIPES } from './sources/recipes'

/**
 * A named list of foods the slot machine can spin over.
 *
 * `foods` is a plain sync array for now. When a source needs to come
 * from somewhere real (localStorage, an API, a file), turn this into an
 * async loader and fetch it in the route's TanStack Router `loader` —
 * the SlotMachine component itself must stay data-agnostic and keep
 * receiving a ready `FoodOption[]` prop.
 */
export interface FoodSource {
  id: string
  /** Shown in the source picker. */
  name: string
  foods: FoodOption[]
}

/**
 * Registry of all available sources. To add your own list:
 *   1. Create src/data/sources/<your-source>.ts exporting a FoodOption[]
 *   2. Add it to this array
 * It appears in the picker automatically. Sources need >= 2 foods to spin.
 */
export const FOOD_SOURCES: FoodSource[] = [
  { id: 'classics', name: 'Classics', foods: CLASSICS },
  { id: 'fridge', name: 'My Fridge', foods: FRIDGE },
  { id: 'recipes', name: 'My Recipes', foods: RECIPES },
]

export function getFoodSource(id: string): FoodSource {
  return FOOD_SOURCES.find((s) => s.id === id) ?? FOOD_SOURCES[0]
}
