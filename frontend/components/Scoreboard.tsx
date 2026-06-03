'use client'

/**
 * Scoreboard
 * Displays live score, quarter, time remaining during replay.
 * Shows team names as home (orange) vs away (cyan).
 */

import type { Play } from '@/types'
import { parseClock, formatPeriod } from '@/lib/api'

interface Props {
  homeTeam: string
  awayTeam: string
  currentPlay: Play | null
  homeWin: boolean | null
  isFinished: boolean
}

export default function Scoreboard({
  homeTeam,
  awayTeam,
  currentPlay,
  homeWin,
  isFinished,
}: Props) {
  const scoreHome = currentPlay?.score_home ?? 0
  const scoreAway = currentPlay?.score_away ?? 0
  const period = currentPlay ? formatPeriod(currentPlay.period) : 'Q1'
  const clock = currentPlay ? parseClock(currentPlay.clock) : '12:00'
  const homeLeading = scoreHome > scoreAway
  const awayLeading = scoreAway > scoreHome

  return (
    <div className="bg-[#0f1117] border border-[#2a2d36] rounded-xl p-5 h-full">
      {/* Period + Clock */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <span className="text-[#f97316] font-mono text-xs font-bold tracking-widest uppercase">
          {isFinished ? 'Final' : period}
        </span>
        {!isFinished && (
          <>
            <span className="text-[#2a2d36]">·</span>
            <span className="text-[#94a3b8] font-mono text-xs tracking-wider">
              {clock}
            </span>
          </>
        )}
      </div>

      {/* Score Row */}
      <div className="flex items-center justify-between gap-4">
        {/* Home Team */}
        <div className="flex-1 text-center">
          <div
            className={`
              text-xs font-mono font-bold tracking-widest uppercase mb-1
              ${homeLeading ? 'text-[#f97316]' : 'text-[#6b7280]'}
            `}
          >
            {homeTeam}
          </div>
          <div
            className={`
              font-mono font-black leading-none transition-all duration-300
              ${homeLeading ? 'text-5xl text-white' : 'text-4xl text-[#6b7280]'}
            `}
          >
            {scoreHome}
          </div>
          <div className="text-[#2a2d36] text-xs mt-1 font-mono">HOME</div>
        </div>

        {/* Divider */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[#374151] font-mono text-2xl font-thin">–</span>
          {isFinished && homeWin !== null && (
            <span className="text-[10px] font-mono text-[#4b5563] tracking-widest">
              {homeWin ? `${homeTeam} W` : `${awayTeam} W`}
            </span>
          )}
        </div>

        {/* Away Team */}
        <div className="flex-1 text-center">
          <div
            className={`
              text-xs font-mono font-bold tracking-widest uppercase mb-1
              ${awayLeading ? 'text-[#64b5f6]' : 'text-[#6b7280]'}
            `}
          >
            {awayTeam}
          </div>
          <div
            className={`
              font-mono font-black leading-none transition-all duration-300
              ${awayLeading ? 'text-5xl text-white' : 'text-4xl text-[#6b7280]'}
            `}
          >
            {scoreAway}
          </div>
          <div className="text-[#2a2d36] text-xs mt-1 font-mono">AWAY</div>
        </div>
      </div>

      {/* Score diff indicator */}
      {currentPlay && !isFinished && (
        <div className="mt-4 text-center">
          {currentPlay.score_diff === 0 ? (
            <span className="text-[#4b5563] font-mono text-xs tracking-widest">TIED</span>
          ) : (
            <span
              className={`font-mono text-xs tracking-wider ${
                currentPlay.score_diff > 0 ? 'text-[#f97316]' : 'text-[#64b5f6]'
              }`}
            >
              {currentPlay.score_diff > 0 ? homeTeam : awayTeam} +
              {Math.abs(currentPlay.score_diff)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
