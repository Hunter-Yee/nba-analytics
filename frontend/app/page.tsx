'use client'
 
/**
 * app/page.tsx
 * Main dashboard page. Owns all state and replay logic.
 *
 * State flow:
 * 1. On mount → fetch game list
 * 2. On game select → fetch play-by-play + batch win probabilities
 * 3. On play → setInterval advances currentPlayIndex at chosen speed
 * 4. All child components receive read-only props derived from state
 */
 
import { useState, useEffect, useRef, useCallback } from 'react'
import type { GameSummary, GameDetail, ChartDataPoint } from '@/types'
import {
  fetchGames,
  fetchGame,
  fetchWinProbabilityBatch,
} from '@/lib/api'
 
import GameSelector from '@/components/GameSelector'
import FilterBar, { FilterState } from '@/components/FilterBar'
import Scoreboard from '@/components/Scoreboard'
import WinProbabilityChart from '@/components/WinProbabilityChart'
import PlayFeed from '@/components/PlayFeed'
import MomentumBar from '@/components/MomentumBar'
import ReplayControls from '@/components/ReplayControls'
import TeamStatsTable from '@/components/TeamStatsTable'
 
// How many milliseconds between each play advance (at 1x speed)
const BASE_INTERVAL_MS = 800
 
export default function HomePage() {
  // ─── Game list ──────────────────────────────────────────────────────────────
  const [games, setGames] = useState<GameSummary[]>([])
  const [allGames, setAllGames] = useState<GameSummary[]>([]) // For extracting options
  const [gamesLoading, setGamesLoading] = useState(true)
  const [gamesError, setGamesError] = useState<string | null>(null)

  const [filters, setFilters] = useState<FilterState>({
    season: 'All Seasons',
    seasonType: 'All Types',
    team: 'All Teams',
    search: '',
  })

  // Derive dropdown options from allGames
  const availableSeasons = Array.from(new Set(allGames.map(g => g.season).filter(Boolean) as string[])).sort().reverse()
  const availableTeams = Array.from(new Set(allGames.flatMap(g => [g.home_team, g.away_team]))).sort()

 
  // ─── Selected game ──────────────────────────────────────────────────────────
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [gameDetail, setGameDetail] = useState<GameDetail | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [gameLoading, setGameLoading] = useState(false)
  const [gameError, setGameError] = useState<string | null>(null)
 
  // ─── Replay state ────────────────────────────────────────────────────────────
  const [currentPlayIndex, setCurrentPlayIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
 
  // Ref to hold the interval so we can clear it
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
 
  // ─── Load game list on mount and when filters change ─────────────────────────
  const fetchGamesData = async (currentFilters?: FilterState) => {
    setGamesLoading(true)
    setGamesError(null)
    try {
      const data = await fetchGames(currentFilters)
      setGames(data)
      if (!currentFilters) {
        setAllGames(data) // Save all games once on initial load
      }
      setGamesLoading(false)
    } catch (err: any) {
      setGamesError(err.message)
      setGamesLoading(false)
    }
  }

  useEffect(() => {
    fetchGamesData() // initial load without filters
  }, [])

  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters)
    fetchGamesData(newFilters)
  }

  const handleResetFilters = () => {
    const defaultFilters = { season: 'All Seasons', seasonType: 'All Types', team: 'All Teams', search: '' }
    setFilters(defaultFilters)
    fetchGamesData(defaultFilters)
  }
 
  // ─── Load game when selected ─────────────────────────────────────────────────
  const handleGameSelect = useCallback(async (gameId: string) => {
    // Stop any running replay
    setIsPlaying(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
 
    setSelectedGameId(gameId)
    setGameLoading(true)
    setGameError(null)
    setCurrentPlayIndex(0)
    setChartData([])
 
    try {
      // 1. Fetch play-by-play
      const detail = await fetchGame(gameId)
      // setGameDetail(detail)
 
      // 2. Build the batch prediction request from all plays
      const batchPayload = detail.plays.map((play) => ({
        seconds_remaining: play.seconds_remaining,
        score_diff: play.score_diff,
        momentum: play.momentum,
        period: play.period,
        is_overtime: play.period > 4 ? 1 : 0,
      }))
 
      // 3. Get all win probabilities in one request.
      // If the ML endpoint is down or errors, fall back to 0.5 for all plays
      // so the chart still renders — don't let one failing endpoint block the UI.
      let predictions: { home_win_probability: number; away_win_probability: number }[] = []
      let probError: string | null = null
      try {
        predictions = await fetchWinProbabilityBatch(batchPayload)
      } catch (err: any) {
        probError = err.message
        // Fall back: flat 50/50 so chart shows play-by-play with no model data
        predictions = detail.plays.map(() => ({
          home_win_probability: 0.5,
          away_win_probability: 0.5,
        }))
      }
 
      // 4. Merge plays + predictions into chart data
      let lastHomeScore = 0
      let lastAwayScore = 0

      const chart: ChartDataPoint[] = detail.plays.map((play, i) => {
        const isLastPlay = i === detail.plays.length - 1

        // Carry forward the last known score if this play has no score data
        if (play.score_home > 0 || play.score_away > 0) {
          lastHomeScore = play.score_home
          lastAwayScore = play.score_away
        }

        return {
          play_index: i,
          seconds_remaining: play.seconds_remaining,
          home_win_probability: isLastPlay
            ? (detail.home_win ? 1 : 0)
            : (predictions[i]?.home_win_probability ?? 0.5),
          away_win_probability: isLastPlay
            ? (detail.home_win ? 0 : 1)
            : (predictions[i]?.away_win_probability ?? 0.5),
          description: play.description,
          score_home: lastHomeScore,
          score_away: lastAwayScore,
          period: play.period,
        }
      })

      setGameDetail(detail)
      setChartData(chart)
      // Surface the model error as a non-blocking warning (reuse gameError for now)
      if (probError) {
        setGameError(`Win probability model unavailable (${probError}) — showing 50/50 baseline`)
      }
      setGameLoading(false)
    } catch (err: any) {
      setGameError(err.message)
      setGameLoading(false)
    }
  }, [])
 
  // ─── Replay interval ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
 
    if (isPlaying && gameDetail) {
      intervalRef.current = setInterval(() => {
        setCurrentPlayIndex((prev) => {
          const next = prev + 1
          if (next >= gameDetail.plays.length) {
            // Reached end — stop
            setIsPlaying(false)
            return prev
          }
          return next
        })
      }, BASE_INTERVAL_MS / speed)
    }
 
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, speed, gameDetail])
 
  // ─── Derived values ──────────────────────────────────────────────────────────
  const currentPlay = gameDetail?.plays[currentPlayIndex] ?? null
  const isFinished =
    gameDetail !== null && currentPlayIndex >= gameDetail.plays.length - 1

  const currentScore = chartData[currentPlayIndex]
  const displayScoreHome = currentScore?.score_home ?? 0
  const displayScoreAway = currentScore?.score_away ?? 0
 
  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handlePlayPause = () => {
    if (!gameDetail) return
    // If at end, restart from beginning
    if (isFinished && !isPlaying) {
      setCurrentPlayIndex(0)
    }
    setIsPlaying((v) => !v)
  }
 
  const handleSpeedChange = (s: number) => setSpeed(s)
 
  const handleScrub = (index: number) => {
    setCurrentPlayIndex(index)
    setIsPlaying(false)
  }
 
  const handleSkipToStart = () => {
    setIsPlaying(false)
    setCurrentPlayIndex(0)
  }
 
  const handleSkipToEnd = () => {
    setIsPlaying(false)
    if (gameDetail) setCurrentPlayIndex(gameDetail.plays.length - 1)
  }
 
  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <main className="h-screen w-screen bg-[#080a0e] text-white flex flex-col overflow-hidden">
      {/* Top nav bar */}
      <header className="border-b border-[#1e2130] px-6 py-2 flex items-center justify-between bg-red-900 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#f97316] shadow-lg shadow-orange-500/50" />
          <span className="font-mono text-2xl md:text-3xl font-bold tracking-wide text-white uppercase">
            NBA Game Analytics Dashboard
          </span>
        </div>
        <div className="flex items-center gap-2">
          {gameLoading && (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-ping" />
              <span className="text-[#f97316] font-mono text-xs">Loading game…</span>
            </div>
          )}
          {/* Updated to lighter text-gray-400 and slightly larger text-sm */}
          <span className="text-gray-400 font-mono text-sm">
            {games.length} games
          </span>
        </div>
      </header>
 
      <div className="px-4 py-3 flex flex-col flex-1 min-h-0 w-full gap-3 overflow-y-auto">
        {/* Error states */}
        {gamesError && (
          <div className="bg-red-950/30 border border-red-900 rounded-lg px-4 py-3">
            <span className="text-red-400 font-mono text-sm">
              ⚠ Could not load games: {gamesError}
            </span>
            <span className="text-red-600 font-mono text-xs ml-2">
              Is the backend running? (uvicorn main:app --port 8000)
            </span>
          </div>
        )}
 
        {gameError && (
          <div className="bg-red-950/30 border border-red-900 rounded-lg px-4 py-3">
            <span className="text-red-400 font-mono text-sm">
              ⚠ Game load failed: {gameError}
            </span>
          </div>
        )}
 
        {/* Row 1: Filter Bar */}
        <FilterBar 
          initialFilters={filters}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          availableSeasons={availableSeasons}
          availableTeams={availableTeams}
        />

        {/* Row 2: Game Selector */}
        <GameSelector
          games={games}
          selectedId={selectedGameId}
          onSelect={handleGameSelect}
          loading={gamesLoading}
        />
 
        {/* Row 2: Scoreboard + Win Probability Chart */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ minHeight: 220 }}>
          <div className="md:col-span-1">
            <Scoreboard
              homeTeam={gameDetail?.home_team ?? '–'}
              awayTeam={gameDetail?.away_team ?? '–'}
              currentPlay={currentPlay}
              scoreHome={displayScoreHome}
              scoreAway={displayScoreAway}
              homeWin={gameDetail?.home_win ?? null}
              isFinished={isFinished}
            />
          </div>
          <div className="md:col-span-2" style={{ minHeight: 220 }}>
            <WinProbabilityChart
              data={chartData}
              currentPlayIndex={currentPlayIndex}
              homeTeam={gameDetail?.home_team ?? 'HOME'}
              awayTeam={gameDetail?.away_team ?? 'AWAY'}
            />
          </div>
        </div>

        {/* Row 3: Replay Controls */}
        <div className="py-1 shrink-0">
          <ReplayControls
            isPlaying={isPlaying}
            speed={speed}
            currentPlayIndex={currentPlayIndex}
            totalPlays={gameDetail?.plays.length ?? 0}
            onPlayPause={handlePlayPause}
            onSpeedChange={handleSpeedChange}
            onScrub={handleScrub}
            onSkipToStart={handleSkipToStart}
            onSkipToEnd={handleSkipToEnd}
          />
        </div>
 
        {/* Row 4: Bottom Section (3 columns) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
          
          {/* Left: Momentum Bar & Mini Stats */}
          <div className="flex flex-col gap-4 overflow-y-auto pr-2">
            <MomentumBar
              momentum={currentPlay?.momentum ?? 0}
              homeTeam={gameDetail?.home_team ?? 'HOME'}
              awayTeam={gameDetail?.away_team ?? 'AWAY'}
            />
            {/* Mini stats placeholder */}
          </div>

          {/* Center: Team Stats Table */}
          <div className="overflow-hidden flex flex-col">
            <TeamStatsTable
              plays={gameDetail?.plays ?? []}
              currentPlayIndex={currentPlayIndex}
              homeTeam={gameDetail?.home_team ?? 'HOME'}
              awayTeam={gameDetail?.away_team ?? 'AWAY'}
            />
          </div>

          {/* Right: Play Feed */}
          <div className="overflow-hidden flex flex-col">
            <PlayFeed
              plays={gameDetail?.plays ?? []}
              chartData={chartData}
              currentPlayIndex={currentPlayIndex}
              homeTeam={gameDetail?.home_team ?? 'HOME'}
              awayTeam={gameDetail?.away_team ?? 'AWAY'}
            />
          </div>
        </div>
      </div>
    </main>
  )
}