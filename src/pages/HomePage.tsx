import { useState } from 'react'
import { SlotMachine } from '../components/slot-machine'
import { FOOD_SOURCES, getFoodSource } from '../data/foodSources'

export function HomePage() {
  const [sourceId, setSourceId] = useState(FOOD_SOURCES[0].id)
  const source = getFoodSource(sourceId)

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-linear-to-b from-amber-50 via-orange-50 to-rose-50 p-4">
      <div className="flex items-center gap-2">
        <label
          htmlFor="food-source"
          className="text-sm font-bold text-stone-600"
        >
          Picking from
        </label>
        <select
          id="food-source"
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          className="rounded-full bg-white px-4 py-2 text-sm font-bold text-stone-700 shadow ring-1 ring-orange-200 outline-none focus-visible:ring-4 focus-visible:ring-orange-300"
        >
          {FOOD_SOURCES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* key remounts the machine when the source changes: reel geometry
          (steps, strip copies) is derived from the list length, so a
          fresh mount is the safe way to swap lists. */}
      <SlotMachine key={source.id} foods={source.foods} />
    </main>
  )
}
