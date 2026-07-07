/**
 * Pure selection + geometry math for the slot reel.
 *
 * No React and no side effects here. Everything the animation needs —
 * the winner, the exact pixel the reel will rest on, and how long the
 * spin lasts — is decided *before* the reel starts moving. That is what
 * makes the stopping position deterministic: the tween simply travels
 * to a precomputed target instead of "stopping wherever it happens to be".
 */

/** Height of one reel row in px. Single source of truth for all reel geometry. */
export const ITEM_HEIGHT = 76

/** Rows visible in the reel window (the middle row is the selection band). */
export const VISIBLE_ROWS = 3

export interface SpinPlan {
  /** Index of the winning food in the original `foods` array. */
  winnerIndex: number
  /**
   * Absolute step (in rows from the top of the strip) the reel rests on.
   * The reel's resting translateY is exactly `-targetStep * ITEM_HEIGHT`.
   */
  targetStep: number
  /** Duration of the main spin tween, in seconds. */
  duration: number
}

export interface SpinPlanOptions {
  /** Number of foods on the reel. */
  count: number
  /** Step the reel is currently resting on. */
  currentStep: number
  /** Full extra revolutions before landing (inclusive range). */
  minLoops?: number
  maxLoops?: number
  /** Spin duration is picked uniformly from this range (seconds). */
  durationRange?: readonly [number, number]
  /** Injectable RNG for tests. */
  random?: () => number
}

/**
 * Decide the outcome up front and translate it into reel geometry.
 *
 * The strip renders the food list repeated N times, so item
 * `step % count` is centered whenever the strip sits at step `step`.
 * To land on the winner we move forward by:
 *
 *   distance = loops * count + (steps from current item to winner)
 *
 * Always at least one full loop, so even re-rolling the same food
 * produces a real spin rather than a no-op.
 */
export function createSpinPlan({
  count,
  currentStep,
  minLoops = 4,
  maxLoops = 6,
  durationRange = [2.4, 3.6],
  random = Math.random,
}: SpinPlanOptions): SpinPlan {
  const winnerIndex = Math.floor(random() * count)

  // Rows to travel forward from the currently-centered item to the winner.
  const forward = (winnerIndex - (currentStep % count) + count) % count
  const loops = minLoops + Math.floor(random() * (maxLoops - minLoops + 1))
  const distance = loops * count + (forward === 0 ? count : forward)

  const [minDur, maxDur] = durationRange
  return {
    winnerIndex,
    targetStep: currentStep + distance,
    duration: minDur + random() * (maxDur - minDur),
  }
}
