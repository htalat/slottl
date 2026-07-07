import { useState } from 'react'
import { FoodListEditor } from '../components/food-editor/FoodListEditor'
import { SlotMachine } from '../components/slot-machine'
import { SyncPanel } from '../components/sync/SyncPanel'
import { FOOD_SOURCES, getFoodSource } from '../data/foodSources'
import { useFoodList } from '../data/useFoodList'

export function HomePage() {
  const [sourceId, setSourceId] = useState(FOOD_SOURCES[0].id)
  const [editing, setEditing] = useState(false)
  const source = getFoodSource(sourceId)
  const { foods, addFood, removeFood, resetFoods, isCustomized, syncState } =
    useFoodList(source)

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-linear-to-b from-amber-50 via-orange-50 to-rose-50 p-4 py-8">
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
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          aria-expanded={editing}
          className={`rounded-full px-4 py-2 text-sm font-bold shadow ring-1 ring-orange-200 transition outline-none focus-visible:ring-4 focus-visible:ring-orange-300 ${
            editing
              ? 'bg-orange-500 text-white hover:bg-orange-600'
              : 'bg-white text-stone-700 hover:bg-orange-50'
          }`}
        >
          {editing ? 'Done' : 'Edit foods'}
        </button>
      </div>

      {foods.length >= 2 ? (
        // key remounts the machine when the source or list size changes:
        // reel geometry is derived from the list length, so a fresh mount
        // is the safe way to swap lists.
        <SlotMachine key={`${source.id}:${foods.length}`} foods={foods} />
      ) : (
        <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-amber-100 to-orange-100 p-10 text-center shadow-xl shadow-orange-200/60 ring-1 ring-orange-200">
          <p className="text-4xl" aria-hidden>
            🍽️
          </p>
          <p className="mt-3 font-bold text-stone-600">
            This list needs at least 2 foods before the reel can spin.
          </p>
        </div>
      )}

      {editing && (
        <FoodListEditor
          sourceName={source.name}
          foods={foods}
          onAdd={addFood}
          onRemove={removeFood}
          onReset={resetFoods}
          isCustomized={isCustomized}
        />
      )}

      <SyncPanel syncState={syncState} />
    </main>
  )
}
