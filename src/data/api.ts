import { useSyncExternalStore } from 'react'
import type { FoodOption } from '../components/slot-machine'

/**
 * Client for the slottl module of the bookish-doodle personal API
 * (Express platform with OTP/JWT auth). If VITE_API_BASE_URL is unset
 * the app runs fully local (localStorage only) and none of this is used.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')

export function isRemoteEnabled(): boolean {
  return Boolean(BASE_URL)
}

/** Thrown on 401s — the session is gone, so the token is cleared. */
export class ApiAuthError extends Error {}

/** Non-401 API failure, carrying the HTTP status and server error code. */
export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

// --- Auth token (tiny external store so any component can react) -----------

const TOKEN_KEY = 'slottl:token'
const tokenListeners = new Set<() => void>()

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage unavailable: the session just won't survive a reload.
  }
  tokenListeners.forEach((listener) => listener())
}

function subscribeToToken(listener: () => void): () => void {
  tokenListeners.add(listener)
  return () => tokenListeners.delete(listener)
}

/** Reactive auth token — null when signed out. */
export function useAuthToken(): string | null {
  return useSyncExternalStore(subscribeToToken, getToken)
}

// --- Requests ----------------------------------------------------------------

interface ErrorBody {
  error?: string
  code?: string
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!BASE_URL) throw new Error('Remote API not configured')
  const token = getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  if (res.status === 401) {
    // Expired/revoked session: drop the token so the UI returns to
    // signed-out local mode instead of erroring forever.
    setToken(null)
    throw new ApiAuthError('Session expired — please sign in again')
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ErrorBody
    throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status, body.code)
  }
  return (await res.json()) as T
}

// --- Auth flow (single-admin OTP: the code goes to the configured email) ----

export async function requestOtp(): Promise<void> {
  await request<{ success: boolean }>('/auth/request-otp', { method: 'POST' })
}

export async function verifyOtp(code: string): Promise<void> {
  const data = await request<{ success: boolean; token: string }>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
  setToken(data.token)
}

export async function logout(): Promise<void> {
  try {
    await request('/auth/logout', { method: 'POST' })
  } catch {
    // Best effort — clear the local session regardless.
  }
  setToken(null)
}

// --- Food lists ---------------------------------------------------------------

export interface RemoteFoodList {
  id: string
  foods: FoodOption[]
  updatedAt: string
}

/** Returns null when the list doesn't exist on the server yet. */
export async function getFoodList(id: string): Promise<RemoteFoodList | null> {
  try {
    return await request<RemoteFoodList>(`/slottl/food-lists/${id}`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export async function putFoodList(id: string, foods: FoodOption[]): Promise<RemoteFoodList> {
  return request<RemoteFoodList>(`/slottl/food-lists/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ foods }),
  })
}

export async function deleteFoodList(id: string): Promise<void> {
  await request(`/slottl/food-lists/${id}`, { method: 'DELETE' })
}
