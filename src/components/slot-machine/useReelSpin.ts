import { useCallback, useEffect, useRef, useState } from 'react'
import {
  animate,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
} from 'framer-motion'
import { createSpinPlan, ITEM_HEIGHT } from './selection'

export type ReelPhase = 'idle' | 'spinning' | 'settled'

interface UseReelSpinOptions {
  /** Number of foods on the reel. */
  count: number
  /** Fired every time a new row crosses the center line (tick sounds). */
  onTick?: () => void
  /** Fired once the reel has fully come to rest on the winner. */
  onSettle?: (winnerIndex: number) => void
  /** User started browsing (dragging/scrolling) — clear any result UI. */
  onBrowseStart?: () => void
  /** Reel snapped to rest on food `index` after browsing. */
  onBrowseSettle?: (index: number) => void
}

/** How hard a drag flick carries after release (seconds of velocity projection). */
const FLICK_PROJECTION = 0.12
/** Drag must travel this many px before it counts as browsing (vs a tap). */
const DRAG_THRESHOLD = 4

/**
 * Owns the reel's motion: a translateY MotionValue plus two ways to move
 * it — the Spin animation and manual browsing (drag / wheel / arrow keys).
 *
 * All spin randomness is delegated to `createSpinPlan`, so by the time
 * any animation starts, the landing pixel is fixed.
 *
 * The reel strip repeats the food list, and at rest we always keep the
 * position inside the SECOND copy (step in [count, 2*count)) so a full
 * copy of items exists above and below the visible window. While the
 * user scrubs, `setWrapped` shifts by whole copies to stay in that band —
 * invisible, because the strip repeats with period count*ITEM_HEIGHT.
 */
export function useReelSpin({
  count,
  onTick,
  onSettle,
  onBrowseStart,
  onBrowseSettle,
}: UseReelSpinOptions) {
  const spinningRef = useRef(false)
  const animRef = useRef<AnimationPlaybackControls | null>(null)
  const mountedRef = useRef(true)
  const dragRef = useRef<{
    pointerId: number
    lastClientY: number
    /** Total distance moved; browsing only "starts" past DRAG_THRESHOLD. */
    travelled: number
    started: boolean
  } | null>(null)
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const y = useMotionValue(-count * ITEM_HEIGHT)
  const [phase, setPhase] = useState<ReelPhase>('idle')
  // How many copies of the food list the strip renders. 3 is enough at
  // rest and while browsing; during a spin it grows to cover the travel.
  const [copies, setCopies] = useState(3)
  // Absolute step to highlight once settled (identifies the exact winner
  // instance in the strip, since the winner appears once per copy).
  const [settledStep, setSettledStep] = useState<number | null>(count)

  const prefersReducedMotion = useReducedMotion() ?? false

  // Keep callbacks fresh without re-subscribing listeners.
  const onTickRef = useRef(onTick)
  const onSettleRef = useRef(onSettle)
  const onBrowseStartRef = useRef(onBrowseStart)
  const onBrowseSettleRef = useRef(onBrowseSettle)
  onTickRef.current = onTick
  onSettleRef.current = onSettle
  onBrowseStartRef.current = onBrowseStart
  onBrowseSettleRef.current = onBrowseSettle

  // Emit a tick whenever the row under the center line changes. Changes
  // that are a whole number of copies are wrap/normalize jumps, not real
  // movement, so they stay silent.
  useEffect(() => {
    let lastRow = Math.round(-y.get() / ITEM_HEIGHT)
    return y.on('change', (v) => {
      const row = Math.round(-v / ITEM_HEIGHT)
      if (row !== lastRow) {
        if ((row - lastRow) % count !== 0) onTickRef.current?.()
        lastRow = row
      }
    })
  }, [y, count])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      animRef.current?.stop()
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current)
    }
  }, [])

  /** Set y, shifted by whole copies to stay inside the second-copy band. */
  const setWrapped = useCallback(
    (v: number) => {
      const period = count * ITEM_HEIGHT
      const min = -2 * count * ITEM_HEIGHT // band: [min, min + period)
      while (v < min) v += period
      while (v >= min + period) v -= period
      y.set(v)
    },
    [count, y],
  )

  /** Spring-snap to `row`, then normalize back into the second copy. */
  const settleTo = useCallback(
    async (row: number, announce = true) => {
      // Stay within the 3 rendered copies (rows 0 .. 3*count-1, with one
      // row of margin for the visible window above/below the center).
      const target = Math.max(1, Math.min(row, 3 * count - 2))
      const controls = animate(y, -target * ITEM_HEIGHT, {
        type: 'spring',
        stiffness: 260,
        damping: 26,
      })
      animRef.current = controls
      await controls
      // Bail if the user grabbed the reel again or a spin took over.
      if (!mountedRef.current || spinningRef.current || dragRef.current) return
      y.jump(-(count + (target % count)) * ITEM_HEIGHT)
      if (announce) onBrowseSettleRef.current?.(target % count)
    },
    [count, y],
  )

  /** Interrupt whatever is settling and mark the reel as being browsed. */
  const beginBrowse = useCallback(() => {
    if (spinningRef.current) return false
    animRef.current?.stop()
    if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current)
    setSettledStep(null)
    setPhase('idle')
    onBrowseStartRef.current?.()
    return true
  }, [])

  // --- Drag (mouse / touch, via pointer events) ---------------------------

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (spinningRef.current) return
      // Grabbing mid-snap should stop the snap immediately, but a plain
      // tap shouldn't clear the result — browsing starts on real movement.
      animRef.current?.stop()
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current)
      dragRef.current = {
        pointerId: e.pointerId,
        lastClientY: e.clientY,
        travelled: 0,
        started: false,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current
      if (!d || d.pointerId !== e.pointerId) return
      const dy = e.clientY - d.lastClientY
      d.lastClientY = e.clientY
      d.travelled += Math.abs(dy)
      if (!d.started) {
        if (d.travelled < DRAG_THRESHOLD) return
        d.started = true
        beginBrowse()
      }
      setWrapped(y.get() + dy)
    },
    [beginBrowse, setWrapped, y],
  )

  const onPointerEnd = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current
      if (!d || d.pointerId !== e.pointerId) return
      dragRef.current = null
      if (d.started) {
        // Flick: project the release velocity a little into the future,
        // then snap to whichever row that lands nearest.
        const projected = y.get() + y.getVelocity() * FLICK_PROJECTION
        void settleTo(Math.round(-projected / ITEM_HEIGHT))
      } else if (Math.abs(-y.get() / ITEM_HEIGHT - Math.round(-y.get() / ITEM_HEIGHT)) > 0.01) {
        // A tap interrupted a snap mid-flight: finish settling quietly.
        void settleTo(Math.round(-y.get() / ITEM_HEIGHT), false)
      }
    },
    [settleTo, y],
  )

  // --- Wheel / trackpad ----------------------------------------------------

  const scrubBy = useCallback(
    (deltaY: number) => {
      if (!beginBrowse()) return
      // Scroll down = reel advances to the next food (strip moves up).
      setWrapped(y.get() - deltaY)
      // Snap once the wheel goes quiet.
      wheelTimerRef.current = setTimeout(() => {
        void settleTo(Math.round(-y.get() / ITEM_HEIGHT))
      }, 140)
    },
    [beginBrowse, setWrapped, settleTo, y],
  )

  // --- Keyboard -------------------------------------------------------------

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const rows = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
      if (rows === 0) return
      e.preventDefault()
      if (!beginBrowse()) return
      void settleTo(Math.round(-y.get() / ITEM_HEIGHT) + rows)
    },
    [beginBrowse, settleTo, y],
  )

  // --- Spin ------------------------------------------------------------------

  const spin = useCallback(async () => {
    if (spinningRef.current || count < 2) return
    spinningRef.current = true

    // Take over from any in-progress browsing.
    animRef.current?.stop()
    if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current)
    dragRef.current = null

    // 1. Predetermine the outcome. Nothing after this point is random.
    //    The current step is read live so spins started right after a
    //    browse (even mid-snap) still land exactly on the winner.
    const plan = createSpinPlan({
      count,
      currentStep: Math.round(-y.get() / ITEM_HEIGHT),
      // Reduced motion: no decorative revolutions, one quick settle.
      minLoops: prefersReducedMotion ? 0 : 4,
      maxLoops: prefersReducedMotion ? 0 : 6,
      durationRange: prefersReducedMotion ? [0.4, 0.4] : [2.4, 3.6],
    })

    setPhase('spinning')
    setSettledStep(null)
    // Render enough list copies for the strip to scroll through
    // (+2 rows of buffer for the visible window and the bounce overshoot).
    setCopies(Math.ceil((plan.targetStep + 2) / count) + 1)

    const targetY = -plan.targetStep * ITEM_HEIGHT

    if (prefersReducedMotion) {
      const controls = animate(y, targetY, { duration: plan.duration, ease: 'easeOut' })
      animRef.current = controls
      await controls
    } else {
      // 2. Main travel — one cubic-bezier tween. The curve eases in
      //    (spin-up, ~first 20% of the time) then spends the rest in a
      //    long tail (natural deceleration), and it deliberately stops
      //    ~28% of a row PAST the target...
      const overshootY = targetY - ITEM_HEIGHT * 0.28
      const travel = animate(y, overshootY, {
        duration: plan.duration,
        ease: [0.32, 0, 0.13, 1],
      })
      animRef.current = travel
      await travel

      // 3. ...so this spring can pull the reel back onto the winner,
      //    reading as a satisfying mechanical bounce. Low damping lets
      //    it wobble once or twice before resting exactly on targetY.
      const settle = animate(y, targetY, {
        type: 'spring',
        stiffness: 320,
        damping: 13,
        mass: 0.9,
      })
      animRef.current = settle
      await settle
    }

    if (!mountedRef.current) return

    // 4. Normalize: the strip repeats with period count*ITEM_HEIGHT, so
    //    jumping back by whole copies is visually a no-op. This keeps the
    //    DOM small and lets the next spin start from a low step.
    const restStep = count + (plan.targetStep % count)
    y.jump(-restStep * ITEM_HEIGHT)
    setCopies(3)
    setSettledStep(restStep)
    setPhase('settled')
    spinningRef.current = false
    onSettleRef.current?.(plan.winnerIndex)
  }, [count, prefersReducedMotion, y])

  return {
    y,
    phase,
    copies,
    settledStep,
    spin,
    prefersReducedMotion,
    /** Spread onto the reel window to enable browsing. */
    browseHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
      onKeyDown,
    },
    /** Wire to a non-passive wheel listener (Reel does this). */
    scrubBy,
  }
}
