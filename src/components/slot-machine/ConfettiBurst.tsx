import { useMemo } from 'react'
import { motion } from 'framer-motion'

const PALETTE = ['#f59e0b', '#fb7185', '#34d399', '#60a5fa', '#f97316', '#a78bfa']

interface Particle {
  dx: number
  dyPeak: number
  dyEnd: number
  rotate: number
  size: number
  color: string
  duration: number
  delay: number
}

function makeParticles(count = 24): Particle[] {
  return Array.from({ length: count }, () => {
    const r = Math.random
    return {
      dx: (r() - 0.5) * 280,
      dyPeak: -(30 + r() * 110), // pop upward first...
      dyEnd: 90 + r() * 70, // ...then fall past the origin (gravity)
      rotate: (r() - 0.5) * 720,
      size: 5 + r() * 6,
      color: PALETTE[Math.floor(r() * PALETTE.length)],
      duration: 0.9 + r() * 0.6,
      delay: r() * 0.12,
    }
  })
}

/**
 * A lightweight celebratory burst from the center of the reel window —
 * no confetti library needed. Mount it fresh (via `key`) for each win;
 * particle trajectories are generated once per mount.
 */
export function ConfettiBurst() {
  const particles = useMemo(() => makeParticles(), [])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute top-1/2 left-1/2 rounded-[2px]"
          style={{ width: p.size, height: p.size, backgroundColor: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: p.dx,
            y: [0, p.dyPeak, p.dyEnd],
            opacity: [1, 1, 0],
            rotate: p.rotate,
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}
