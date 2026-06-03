/**
 * lib/api.ts
 * All communication with the FastAPI backend lives here.
 * Components never call fetch() directly — they go through these functions.
 */

import type {
  GameSummary,
  GameDetail,
  WinProbabilityResponse,
} from '@/types'

const BASE_URL = 'http://localhost:8000'

// ─── Games ────────────────────────────────────────────────────────────────────

/** Fetch the list of all 120 available games */
export async function fetchGames(): Promise<GameSummary[]> {
  const res = await fetch(`${BASE_URL}/games/`)
  if (!res.ok) throw new Error(`Failed to fetch games: ${res.status}`)
  return res.json()
}

/** Fetch full play-by-play data for one game */
export async function fetchGame(gameId: string): Promise<GameDetail> {
  const res = await fetch(`${BASE_URL}/games/${gameId}`)
  if (!res.ok) throw new Error(`Failed to fetch game ${gameId}: ${res.status}`)
  return res.json()
}

// ─── Win Probability ──────────────────────────────────────────────────────────

/** Send all plays at once, get back all win probabilities in one shot */
export async function fetchWinProbabilityBatch(
  plays: Array<{
    seconds_remaining: number
    score_diff: number
    momentum: number
    period: number
    is_overtime: number
  }>
): Promise<WinProbabilityResponse[]> {
  const res = await fetch(`${BASE_URL}/predict/win-probability/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plays }),
  })
  if (!res.ok) throw new Error(`Batch prediction failed: ${res.status}`)
  return res.json()
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse ISO 8601 clock string from the NBA API into display format.
 * "PT10M26.00S" → "10:26"
 */
export function parseClock(clock: string): string {
  const match = clock.match(/PT(\d+)M([\d.]+)S/)
  if (!match) return '0:00'
  const minutes = match[1]
  const seconds = Math.floor(parseFloat(match[2])).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

/**
 * Returns a human-readable quarter label.
 * 1→"Q1", 5→"OT", 6→"2OT", etc.
 */
export function formatPeriod(period: number): string {
  if (period <= 4) return `Q${period}`
  if (period === 5) return 'OT'
  return `${period - 4}OT`
}
