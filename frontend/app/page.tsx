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
import Scoreboard from '@/components/Scoreboard'
import WinProbabilityChart from '@/components/WinProbabilityChart'
import PlayFeed from '@/components/PlayFeed'
import MomentumBar from '@/components/MomentumBar'
import ReplayControls from '@/components/ReplayControls'
 
// How many milliseconds between each play advance (at 1x speed)
const BASE_INTERVAL_MS = 800
 
export default function HomePage() {
  // ─── Game list ──────────────────────────────────────────────────────────────
  const [games, setGames] = useState<GameSummary[]>([])
  const [gamesLoading, setGamesLoading] = useState(true)
  const [gamesError, setGamesError] = useState<string | null>(null)
 
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
 
  // ─── Load game list on mount ─────────────────────────────────────────────────
  useEffect(() => {
    fetchGames()
      .then((data) => {
        setGames(data)
        setGamesLoading(false)
      })
      .catch((err) => {
        setGamesError(err.message)
        setGamesLoading(false)
      })
  }, [])
 
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
      setGameDetail(detail)
 
      // 2. Build the batch prediction request from all plays
      const batchPayload = detail.plays.map((play) => ({
        seconds_remaining: play.seconds_remaining,
        score_diff: play.score_diff,
        momentum: play.momentum,
        period: play.period,
        is_overtime: play.period > 4 ? 1 : 0,
      }))
 
      // 3. Get all win probabilities in one request
      const predictions = await fetchWinProbabilityBatch(batchPayload)
 
      // 4. Merge plays + predictions into chart data
      const chart: ChartDataPoint[] = detail.plays.map((play, i) => ({
        play_index: i,
        seconds_remaining: play.seconds_remaining,
        home_win_probability: predictions[i]?.home_win_probability ?? 0.5,
        away_win_probability: predictions[i]?.away_win_probability ?? 0.5,
        description: play.description,
        score_home: play.score_home,
        score_away: play.score_away,
        period: play.period,
      }))
 
      setChartData(chart)
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
    <main className="min-h-screen bg-[#080a0e] text-white">
      {/* Top nav bar */}
      <header className="border-b border-[#2a2d3e] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#f97316] shadow-lg shadow-orange-500/50" />
          <span className="font-mono text-base font-bold tracking-widest text-white uppercase">
            NBA Live Analytics
          </span>
          <span className="text-[#6b7280] font-mono text-sm">/ Historical Replay</span>
        </div>
        <div className="flex items-center gap-3">
          {gameLoading && (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-ping" />
              <span className="text-[#f97316] font-mono text-sm">Loading game…</span>
            </div>
          )}
          <span className="text-[#9ca3af] font-mono text-sm">
            {games.length} games
          </span>
        </div>
      </header>
 
      <div className="px-4 md:px-6 py-4 space-y-4 max-w-screen-2xl mx-auto">
        {/* Error states */}
        {gamesError && (
          <div className="bg-red-950/30 border border-red-800 rounded-lg px-4 py-3">
            <span className="text-red-400 font-mono text-sm">
              ⚠ Could not load games: {gamesError}
            </span>
            <span className="text-red-500 font-mono text-xs ml-2">
              Is the backend running? (uvicorn main:app --port 8000)
            </span>
          </div>
        )}
 
        {gameError && (
          <div className="bg-red-950/30 border border-red-800 rounded-lg px-4 py-3">
            <span className="text-red-400 font-mono text-sm">
              ⚠ Game load failed: {gameError}
            </span>
          </div>
        )}
 
        {/* Row 1: Game Selector */}
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
 
        {/* Row 3: Momentum Bar */}
        <MomentumBar
          momentum={currentPlay?.momentum ?? 0}
          homeTeam={gameDetail?.home_team ?? 'HOME'}
          awayTeam={gameDetail?.away_team ?? 'AWAY'}
        />
 
        {/* Row 4: Play Feed + Replay Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ minHeight: 340 }}>
          <PlayFeed
            plays={gameDetail?.plays ?? []}
            currentPlayIndex={currentPlayIndex}
            homeTeam={gameDetail?.home_team ?? 'HOME'}
            awayTeam={gameDetail?.away_team ?? 'AWAY'}
          />
          <div className="flex flex-col gap-4">
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
 
            {/* Instructions card — shown when no game selected */}
            {!gameDetail && !gameLoading && (
              <div className="bg-[#0f1117] border border-[#2a2d3e] rounded-xl p-5 flex-1">
                <div className="text-[#9ca3af] font-mono text-xs mb-4 tracking-widest uppercase font-semibold">
                  How to use
                </div>
                <div className="space-y-2.5 text-[#d1d5db] font-mono text-sm leading-relaxed">
                  <div>1. Select a game from the dropdown above</div>
                  <div>2. Wait for plays + win probability to load</div>
                  <div>3. Press ▶ to watch the game replay</div>
                  <div>4. Use the scrubber to jump to any moment</div>
                  <div>5. Change speed to 0.5x / 1x / 2x / 4x</div>
                </div>
                <div className="mt-5 pt-4 border-t border-[#2a2d3e]">
                  <div className="text-[#9ca3af] font-mono text-xs leading-loose space-y-1">
                    <div>
                      <span className="text-emerald-400">■</span>{' '}
                      <span className="text-[#d1d5db]">Made shot</span>
                      &nbsp;&nbsp;
                      <span className="text-red-400">■</span>{' '}
                      <span className="text-[#d1d5db]">Turnover</span>
                      &nbsp;&nbsp;
                      <span className="text-yellow-400">■</span>{' '}
                      <span className="text-[#d1d5db]">Foul</span>
                    </div>
                    <div>
                      <span className="text-teal-400">■</span>{' '}
                      <span className="text-[#d1d5db]">Free throw</span>
                      &nbsp;&nbsp;
                      <span className="text-purple-400">■</span>{' '}
                      <span className="text-[#d1d5db]">Rebound</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
 
            {/* Game stats summary — shown when game is finished */}
            {gameDetail && isFinished && (
              <div className="bg-[#0f1117] border border-[#2a2d3e] rounded-xl p-5 flex-1">
                <div className="text-[#9ca3af] font-mono text-xs mb-4 tracking-widest uppercase font-semibold">
                  Final Result
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-[#f97316] font-mono font-black text-4xl">
                      {gameDetail.home_score}
                    </div>
                    <div className="text-[#d1d5db] font-mono text-sm mt-1.5">
                      {gameDetail.home_team}
                    </div>
                    {gameDetail.home_win && (
                      <div className="text-[#f97316] font-mono text-xs mt-1 font-bold tracking-widest">
                        WINNER
                      </div>
                    )}
                  </div>
                  <div className="text-[#6b7280] font-mono text-3xl">–</div>
                  <div className="text-center">
                    <div className="text-[#64b5f6] font-mono font-black text-4xl">
                      {gameDetail.away_score}
                    </div>
                    <div className="text-[#d1d5db] font-mono text-sm mt-1.5">
                      {gameDetail.away_team}
                    </div>
                    {!gameDetail.home_win && (
                      <div className="text-[#64b5f6] font-mono text-xs mt-1 font-bold tracking-widest">
                        WINNER
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 text-[#9ca3af] font-mono text-sm">
                  {gameDetail.plays.length} plays total
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}