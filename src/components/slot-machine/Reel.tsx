import { useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react'
import {
  motion,
  useMotionTemplate,
  useTransform,
  useVelocity,
  type MotionValue,
} from 'framer-motion'
import { ITEM_HEIGHT, VISIBLE_ROWS } from './selection'
import type { FoodOption } from './types'

interface ReelProps {
  foods: FoodOption[]
  /** How many times the food list is repeated in the strip. */
  copies: number
  /** The strip's translateY, driven by useReelSpin. */
  y: MotionValue<number>
  /** Absolute step of the winner instance to glow, or null while spinning. */
  highlightStep: number | null
  /** Pointer/keyboard handlers from useReelSpin's browseHandlers. */
  browseHandlers?: HTMLAttributes<HTMLDivElement>
  /** Wheel scrubbing callback (wired as a non-passive native listener). */
  onScrub?: (deltaY: number) => void
  /** Disables the grab cursor while the reel is spinning. */
  spinning?: boolean
  /** Overlays (confetti) rendered inside the window. */
  children?: ReactNode
}

/**
 * Presentation plus raw input wiring: a 3-row window onto a vertically
 * scrolling strip. The strip is offset down by one row (`top: ITEM_HEIGHT`)
 * so that when the strip sits at `y = -step * ITEM_HEIGHT`, item `step`
 * lands in the CENTER row rather than the top one.
 *
 * What the reel does with drags/keys/wheel lives in useReelSpin; this
 * component only attaches the handlers.
 */
export function Reel({
  foods,
  copies,
  y,
  highlightStep,
  browseHandlers,
  onScrub,
  spinning = false,
  children,
}: ReelProps) {
  // Motion blur proportional to reel speed: |velocity| px/s → 0–2.5px of
  // blur. It fades in during spin-up and back out as the ease-out tail
  // slows the reel, with no extra state — it's derived from y itself.
  const velocity = useVelocity(y)
  const blur = useTransform(velocity, (v) => Math.min(Math.abs(v) / 2400, 2.5))
  const filter = useMotionTemplate`blur(${blur}px)`

  // Wheel must be a native non-passive listener: React's synthetic onWheel
  // can't reliably preventDefault, and we need to stop the page scrolling
  // while the pointer is over the reel.
  const windowRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = windowRef.current
    if (!el || !onScrub) return
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      onScrub(e.deltaY)
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [onScrub])

  return (
    <div
      ref={windowRef}
      role="group"
      aria-label="Food reel. Use the arrow keys, or drag, to browse the options."
      tabIndex={0}
      {...browseHandlers}
      className={`relative touch-none overflow-hidden rounded-2xl bg-white shadow-inner ring-1 ring-orange-200/70 outline-none select-none focus-visible:ring-4 focus-visible:ring-orange-300 ${
        spinning ? '' : 'cursor-grab active:cursor-grabbing'
      }`}
      style={{ height: ITEM_HEIGHT * VISIBLE_ROWS }}
    >
      {/* The moving strip is decorative for assistive tech; results and
          browsing positions are announced via the live region instead. */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 will-change-transform"
        style={{ y, filter, top: ITEM_HEIGHT }}
      >
        {Array.from({ length: copies }, (_, copy) =>
          foods.map((food, i) => (
            <ReelItem
              key={copy * foods.length + i}
              food={food}
              isWinner={copy * foods.length + i === highlightStep}
            />
          )),
        )}
      </motion.div>

      {/* Center selection band */}
      <div
        className="pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2 rounded-2xl ring-2 ring-orange-300/80"
        style={{ height: ITEM_HEIGHT - 8 }}
      />
      {/* Soft fades so rows appear to emerge from / sink into the machine */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-linear-to-b from-white to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-linear-to-t from-white to-transparent" />

      {children}
    </div>
  )
}

function ReelItem({ food, isWinner }: { food: FoodOption; isWinner: boolean }) {
  return (
    <div
      className="flex items-center justify-center px-4"
      style={{ height: ITEM_HEIGHT }}
    >
      <motion.div
        animate={isWinner ? { scale: [1, 1.12, 1] } : { scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`flex w-full items-center gap-4 rounded-xl px-5 py-2.5 ${food.tint ?? 'bg-orange-50'} ${
          isWinner
            ? 'shadow-[0_0_26px_6px_rgba(251,146,60,0.45)] ring-2 ring-amber-400'
            : ''
        }`}
      >
        <span className="text-4xl leading-none">{food.emoji}</span>
        <span className="truncate text-lg font-extrabold text-stone-700">
          {food.label}
        </span>
      </motion.div>
    </div>
  )
}
