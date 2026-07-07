import { useState } from 'react'
import { ConfettiBurst } from './ConfettiBurst'
import { Reel } from './Reel'
import type { FoodOption } from './types'
import { useReelSpin } from './useReelSpin'
import { useTickSound } from './useTickSound'

export interface SlotMachineProps {
  /**
   * Foods on the reel. Needs at least 2 options to spin.
   * If the list's LENGTH can change while mounted (e.g. switching
   * sources), remount with `key` — reel geometry is derived from length.
   */
  foods: FoodOption[]
  /** Whether tick sounds start enabled (user can toggle). */
  initialSoundOn?: boolean
  /** Called with the winning food once the reel settles. */
  onResult?: (food: FoodOption) => void
  title?: string
}

/**
 * "What Should I Eat?" — composition root. Wires together:
 *  - selection.ts     → deterministic outcome + geometry (pure math)
 *  - useReelSpin      → animation orchestration (accelerate → ease-out → bounce)
 *  - useTickSound     → WebAudio ticks as rows pass the center line
 *  - Reel / Confetti  → presentation
 */
export function SlotMachine({
  foods,
  initialSoundOn = true,
  onResult,
  title = 'What should I eat?',
}: SlotMachineProps) {
  const [soundOn, setSoundOn] = useState(initialSoundOn)
  const [winner, setWinner] = useState<FoodOption | null>(null)
  // Food the user parked the reel on while browsing (drag/wheel/arrows).
  const [browsed, setBrowsed] = useState<FoodOption | null>(null)
  const [spinCount, setSpinCount] = useState(0)

  const tick = useTickSound(soundOn)
  const {
    y,
    phase,
    copies,
    settledStep,
    spin,
    prefersReducedMotion,
    browseHandlers,
    scrubBy,
  } = useReelSpin({
    count: foods.length,
    onTick: tick,
    onSettle: (winnerIndex) => {
      const food = foods[winnerIndex]
      setWinner(food)
      onResult?.(food)
    },
    // Browsing starts a new decision: drop the old result and its glow.
    onBrowseStart: () => {
      setWinner(null)
      setBrowsed(null)
    },
    onBrowseSettle: (index) => setBrowsed(foods[index]),
  })

  const spinning = phase === 'spinning'
  const hasResult = phase === 'settled' && winner !== null

  const handleSpin = () => {
    if (spinning) return
    setWinner(null)
    setBrowsed(null)
    setSpinCount((c) => c + 1)
    void spin()
  }

  return (
    <section
      aria-label={title}
      className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-amber-100 to-orange-100 p-5 shadow-xl shadow-orange-200/60 ring-1 ring-orange-200 sm:p-6"
    >
      <header className="mb-4 text-center">
        <h1 className="text-2xl font-black tracking-tight text-stone-800">
          {title} <span aria-hidden>🍽️</span>
        </h1>
        <p className="mt-1 text-sm font-semibold text-stone-500">
          Spin to decide — or drag the reel to browse
        </p>
      </header>

      <Reel
        foods={foods}
        copies={copies}
        y={y}
        // Don't glow the resting row before the first spin
        highlightStep={spinCount > 0 ? settledStep : null}
        browseHandlers={browseHandlers}
        onScrub={scrubBy}
        spinning={spinning}
      >
        {hasResult && !prefersReducedMotion && spinCount > 0 && (
          <ConfettiBurst key={spinCount} />
        )}
      </Reel>

      {/* Live region: screen readers hear the outcome even though the
          animated reel itself is aria-hidden. */}
      <p
        role="status"
        aria-live="polite"
        className="mt-4 min-h-7 text-center text-lg font-bold text-stone-700"
      >
        {spinning
          ? 'Spinning…'
          : hasResult && spinCount > 0
            ? `You should eat ${winner.label}! ${winner.emoji}`
            : browsed
              ? `Maybe ${browsed.label}? ${browsed.emoji}`
              : ' '}
      </p>

      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleSpin}
          aria-disabled={spinning}
          className={`rounded-full bg-orange-500 px-10 py-3 text-lg font-extrabold text-white shadow-lg shadow-orange-300 transition outline-none hover:bg-orange-600 focus-visible:ring-4 focus-visible:ring-orange-300 active:scale-95 ${
            spinning ? 'cursor-wait opacity-60' : ''
          }`}
        >
          {spinCount === 0 ? 'Spin' : 'Spin Again'}
        </button>

        <button
          type="button"
          onClick={() => setSoundOn((s) => !s)}
          aria-pressed={soundOn}
          aria-label={soundOn ? 'Mute tick sounds' : 'Unmute tick sounds'}
          title={soundOn ? 'Mute tick sounds' : 'Unmute tick sounds'}
          className="rounded-full bg-white/80 p-3 text-xl shadow ring-1 ring-orange-200 transition outline-none hover:bg-white focus-visible:ring-4 focus-visible:ring-orange-300"
        >
          <span aria-hidden>{soundOn ? '🔊' : '🔇'}</span>
        </button>
      </div>
    </section>
  )
}
