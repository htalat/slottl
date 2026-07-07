import { useState, type FormEvent } from 'react'
import * as api from '../../data/api'
import type { SyncState } from '../../data/useFoodList'

interface SyncPanelProps {
  syncState: SyncState
}

type Step = 'collapsed' | 'request' | 'verify'

/**
 * Sign-in + sync status for the bookish-doodle backend. Single-admin
 * OTP flow: the server only ever emails the configured admin address,
 * so there is no email field — just "send me a code" then the code.
 *
 * Renders nothing when no API is configured (pure local mode).
 */
export function SyncPanel({ syncState }: SyncPanelProps) {
  const token = api.useAuthToken()
  const [step, setStep] = useState<Step>('collapsed')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!api.isRemoteEnabled()) return null

  const fail = (err: unknown) =>
    setError(err instanceof Error ? err.message : 'Something went wrong')

  const handleRequestCode = async () => {
    setBusy(true)
    setError(null)
    try {
      await api.requestOtp()
      setStep('verify')
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault()
    if (code.trim().length === 0) return
    setBusy(true)
    setError(null)
    try {
      await api.verifyOtp(code.trim())
      setStep('collapsed')
      setCode('')
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  if (token) {
    const label =
      syncState === 'syncing'
        ? 'Syncing…'
        : syncState === 'error'
          ? 'Offline — changes saved on this device'
          : 'Synced'
    return (
      <div className="flex items-center gap-2 text-sm font-semibold text-stone-500">
        <span role="status">
          <span aria-hidden>{syncState === 'error' ? '⚠️' : '☁️'}</span> {label}
        </span>
        <button
          type="button"
          onClick={() => void api.logout()}
          className="font-bold text-orange-500 outline-none hover:text-orange-600 focus-visible:underline"
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2 text-sm">
      {step === 'collapsed' && (
        <button
          type="button"
          onClick={() => setStep('request')}
          className="font-bold text-orange-500 outline-none hover:text-orange-600 focus-visible:underline"
        >
          Sign in to sync your lists
        </button>
      )}

      {step === 'request' && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void handleRequestCode()}
            disabled={busy}
            className="rounded-full bg-white px-4 py-2 font-bold text-stone-700 shadow ring-1 ring-orange-200 outline-none hover:bg-orange-50 focus-visible:ring-4 focus-visible:ring-orange-300 disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Email me a sign-in code'}
          </button>
          <button
            type="button"
            onClick={() => setStep('collapsed')}
            className="font-semibold text-stone-400 outline-none hover:text-stone-600 focus-visible:underline"
          >
            Cancel
          </button>
        </div>
      )}

      {step === 'verify' && (
        <form onSubmit={handleVerify} className="flex items-center gap-2">
          <label htmlFor="otp-code" className="sr-only">
            Sign-in code from your email
          </label>
          <input
            id="otp-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            maxLength={6}
            className="w-32 rounded-full bg-white px-4 py-2 text-center font-bold text-stone-700 shadow-inner ring-1 ring-orange-200 outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          />
          <button
            type="submit"
            disabled={busy || code.trim().length === 0}
            className="rounded-full bg-orange-500 px-4 py-2 font-extrabold text-white shadow outline-none hover:bg-orange-600 focus-visible:ring-4 focus-visible:ring-orange-300 disabled:opacity-50"
          >
            {busy ? 'Checking…' : 'Verify'}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="font-semibold text-rose-500">
          {error}
        </p>
      )}
    </div>
  )
}
