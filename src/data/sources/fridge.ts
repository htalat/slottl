import type { FoodOption } from '../../components/slot-machine'

/**
 * Meals you can actually make from what's in the fridge RIGHT NOW.
 * Edit freely — this file is meant to change often. The entries below
 * are placeholders; replace them with your real fridge inventory.
 *
 * `tint` is optional (defaults to bg-orange-50); any Tailwind bg-*-50
 * class looks right on the reel.
 */
export const FRIDGE: FoodOption[] = [
  { emoji: '🍳', label: 'Eggs on toast', tint: 'bg-yellow-50' },
  { emoji: '🥦', label: 'Veggie stir-fry', tint: 'bg-emerald-50' },
  { emoji: '🧀', label: 'Cheese quesadilla', tint: 'bg-amber-50' },
  { emoji: '🍚', label: 'Leftover rice bowl', tint: 'bg-stone-50' },
]
