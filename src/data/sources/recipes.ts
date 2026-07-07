import type { FoodOption } from '../../components/slot-machine'

/**
 * Recipes from your personal recipe list. Placeholders for now —
 * replace with the recipes you actually cook. If this ever grows into
 * real recipe data (ingredients, links, steps), keep the reel contract:
 * whatever richer type you build must still map down to
 * { emoji, label, tint? } before it reaches the SlotMachine.
 */
export const RECIPES: FoodOption[] = [
  { emoji: '🍲', label: 'Sunday daal', tint: 'bg-lime-50' },
  { emoji: '🍗', label: 'Sheet-pan chicken', tint: 'bg-orange-50' },
  { emoji: '🍅', label: 'Shakshuka', tint: 'bg-red-50' },
  { emoji: '🥘', label: 'Chana masala', tint: 'bg-amber-50' },
]
