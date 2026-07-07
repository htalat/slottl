import { useCallback, useEffect, useRef } from 'react'

/**
 * A tiny WebAudio "tick" — a short square-wave chirp with a fast
 * exponential decay, like a pawl clicking over reel teeth.
 *
 * The AudioContext is created lazily on the first tick, which always
 * happens after the Spin click, satisfying browser autoplay policies.
 */
export function useTickSound(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null)
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const lastTickAtRef = useRef(0)

  useEffect(
    () => () => {
      void ctxRef.current?.close()
      ctxRef.current = null
    },
    [],
  )

  return useCallback(() => {
    if (!enabledRef.current) return

    // At top speed rows fly by every ~15ms; cap the tick rate so the
    // sound reads as a fast ratchet instead of a solid buzz.
    const now = performance.now()
    if (now - lastTickAtRef.current < 35) return
    lastTickAtRef.current = now

    try {
      const ctx = (ctxRef.current ??= new AudioContext())
      if (ctx.state === 'suspended') void ctx.resume()

      const t = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(2100, t)
      osc.frequency.exponentialRampToValueAtTime(950, t + 0.04)
      gain.gain.setValueAtTime(0.045, t)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.06)
    } catch {
      // Audio unavailable (SSR, restrictive browser) — spin silently.
    }
  }, [])
}
