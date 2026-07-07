export interface FoodOption {
  /** Emoji shown on the reel, e.g. "🍕" */
  emoji: string
  /** Human-readable name, e.g. "Pizza" — also used for the result announcement */
  label: string
  /** Optional Tailwind background class for the item card, e.g. "bg-rose-50" */
  tint?: string
}
