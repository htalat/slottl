import { useState, type FormEvent } from 'react'
import type { FoodOption } from '../slot-machine'

/** Common food emojis offered in the picker (any list edit stays one tap). */
const EMOJI_CHOICES = [
  '🍕', '🍣', '🌮', '🍜', '🍔', '🥗', '🍝', '🍛',
  '🥟', '🥞', '🍳', '🥦', '🧀', '🍚', '🍲', '🍗',
  '🍅', '🥘', '🌯', '🥪', '🍱', '🍤', '🥩', '🌭',
  '🍟', '🥣', '🫓', '🥧', '🥑', '🍎', '🍩', '🍽️',
]

interface FoodListEditorProps {
  /** Shown in the header, e.g. "My Fridge". */
  sourceName: string
  foods: FoodOption[]
  onAdd: (food: { emoji: string; label: string }) => void
  onRemove: (index: number) => void
  onReset: () => void
  /** Whether this list has local edits (enables the reset button). */
  isCustomized: boolean
}

/**
 * Pure presentation for editing a food list: an add form (emoji picker +
 * name) and the current list with per-item remove. Persistence lives in
 * useFoodList; this component only raises events.
 */
export function FoodListEditor({
  sourceName,
  foods,
  onAdd,
  onRemove,
  onReset,
  isCustomized,
}: FoodListEditorProps) {
  const [label, setLabel] = useState('')
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0])

  const trimmed = label.trim()
  const isDuplicate = foods.some(
    (f) => f.label.toLowerCase() === trimmed.toLowerCase(),
  )
  const canAdd = trimmed.length > 0 && !isDuplicate

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!canAdd) return
    onAdd({ emoji, label: trimmed })
    setLabel('')
  }

  return (
    <section
      aria-label={`Edit ${sourceName}`}
      className="w-full max-w-sm rounded-3xl bg-white/80 p-5 shadow-lg shadow-orange-100 ring-1 ring-orange-200"
    >
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-extrabold text-stone-700">
          {sourceName}
          <span className="ml-2 text-sm font-semibold text-stone-400">
            {foods.length} {foods.length === 1 ? 'food' : 'foods'}
          </span>
        </h2>
        {isCustomized && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Reset ${sourceName} to its default list?`))
                onReset()
            }}
            className="text-sm font-bold text-orange-500 outline-none hover:text-orange-600 focus-visible:underline"
          >
            Reset
          </button>
        )}
      </header>

      <form onSubmit={handleSubmit}>
        <label
          htmlFor="new-food-label"
          className="mb-1 block text-sm font-bold text-stone-600"
        >
          Add a food
        </label>
        <div className="flex gap-2">
          <input
            id="new-food-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Leftover biryani"
            maxLength={40}
            className="min-w-0 flex-1 rounded-xl bg-white px-4 py-2.5 font-semibold text-stone-700 shadow-inner ring-1 ring-orange-200 outline-none placeholder:text-stone-400 focus-visible:ring-2 focus-visible:ring-orange-400"
          />
          <button
            type="submit"
            disabled={!canAdd}
            className="rounded-xl bg-orange-500 px-5 font-extrabold text-white shadow transition outline-none hover:bg-orange-600 focus-visible:ring-4 focus-visible:ring-orange-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add
          </button>
        </div>
        {isDuplicate && (
          <p role="alert" className="mt-1 text-sm font-semibold text-rose-500">
            “{trimmed}” is already on the list
          </p>
        )}

        <div
          role="radiogroup"
          aria-label="Emoji for the new food"
          className="mt-3 grid grid-cols-8 gap-1"
        >
          {EMOJI_CHOICES.map((choice) => (
            <button
              key={choice}
              type="button"
              role="radio"
              aria-checked={emoji === choice}
              aria-label={`Emoji ${choice}`}
              onClick={() => setEmoji(choice)}
              className={`rounded-lg py-1 text-xl transition outline-none hover:bg-orange-100 focus-visible:ring-2 focus-visible:ring-orange-400 ${
                emoji === choice ? 'bg-orange-100 ring-2 ring-orange-400' : ''
              }`}
            >
              {choice}
            </button>
          ))}
        </div>
      </form>

      <ul className="mt-4 space-y-1">
        {foods.map((food, i) => (
          <li
            key={`${food.label}-${i}`}
            className={`flex items-center gap-3 rounded-xl px-3 py-1.5 ${food.tint ?? 'bg-orange-50'}`}
          >
            <span className="text-xl">{food.emoji}</span>
            <span className="min-w-0 flex-1 truncate font-bold text-stone-700">
              {food.label}
            </span>
            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label={`Remove ${food.label}`}
              className="rounded-full px-2 py-0.5 text-sm font-extrabold text-stone-400 transition outline-none hover:bg-white/70 hover:text-rose-500 focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {foods.length < 2 && (
        <p className="mt-3 text-center text-sm font-semibold text-stone-500">
          Add at least 2 foods to spin the reel.
        </p>
      )}
    </section>
  )
}
