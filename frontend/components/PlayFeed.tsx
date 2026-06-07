'use client'
 
/**
 * PlayFeed
 * Scrolling log of play descriptions.
 * Color-coded by action type. Auto-scrolls to current play.
 */
 
import { useEffect, useRef } from 'react'
import type { Play } from '@/types'
import { formatPeriod } from '@/lib/api'
 
interface Props {
  plays: Play[]
  currentPlayIndex: number
  homeTeam: string
  awayTeam: string
}
 
// Color coding rules per action type
function getPlayStyle(actionType: string | null) {
  if (!actionType) return { dot: 'bg-[#4b5563]', text: 'text-[#9ca3af]' }
 
  const t = actionType.toLowerCase()
 
  if (t.includes('made shot') || t.includes('dunk'))
    return { dot: 'bg-emerald-500', text: 'text-emerald-400' }
 
  if (t.includes('missed shot') || t.includes('miss'))
    return { dot: 'bg-[#4b5563]', text: 'text-[#9ca3af]' }
 
  if (t.includes('turnover'))
    return { dot: 'bg-red-500', text: 'text-red-400' }
 
  if (t.includes('foul'))
    return { dot: 'bg-yellow-500', text: 'text-yellow-400' }
 
  if (t.includes('free throw'))
    return { dot: 'bg-teal-400', text: 'text-teal-300' }
 
  if (t.includes('rebound'))
    return { dot: 'bg-purple-400', text: 'text-purple-300' }
 
  if (t.includes('timeout'))
    return { dot: 'bg-[#4b5563]', text: 'text-[#6b7280]' }
 
  if (t.includes('period') || t.includes('jump ball'))
    return { dot: 'bg-[#f97316]', text: 'text-[#f97316]' }
 
  return { dot: 'bg-[#4b5563]', text: 'text-[#9ca3af]' }
}
 
export default function PlayFeed({
  plays,
  currentPlayIndex,
  homeTeam,
  awayTeam,
}: Props) {
  const currentRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
 
  // Keep the container scrolled to the top as new plays come in
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    }
  }, [currentPlayIndex])
 
  // Only show plays up to currentPlayIndex
  const visiblePlays = plays.slice(0, currentPlayIndex + 1).reverse()

  return (
    <div className="bg-[#0f1117] border border-[#2a2d3e] rounded-xl flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#2a2d3e] flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#9ca3af] font-mono text-xs tracking-widest uppercase font-semibold">
            Play Feed
          </span>
          <span className="text-[#9ca3af] font-mono text-sm font-medium">
            {currentPlayIndex + 1} / {plays.length}
          </span>
        </div>
 
        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {[
            { dot: 'bg-emerald-500', label: 'Made' },
            { dot: 'bg-red-500', label: 'Turnover' },
            { dot: 'bg-yellow-500', label: 'Foul' },
            { dot: 'bg-teal-400', label: 'FT' },
            { dot: 'bg-purple-400', label: 'Rebound' },
          ].map(({ dot, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
              <span className="text-[#9ca3af] font-mono text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>
 
      {/* Scrollable feed — newest plays at bottom */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-y-auto px-3 py-2 space-y-0.5"
      >
        {visiblePlays.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[#6b7280] font-mono text-sm">
              Press play to begin
            </span>
          </div>
        ) : (
          visiblePlays.map((play, i) => {
            // Since the array is reversed, the newest play is ALWAYS at index 0
            const isCurrent = i === 0
            const style = getPlayStyle(play.action_type)
            const isPlayerPlay =
              play.player_name && play.player_name !== 'nan'
            const isNaN_team =
              play.team_tricode === 'nan' || !play.team_tricode
            const teamColor =
              play.team_tricode === homeTeam
                ? 'text-[#f97316]'
                : play.team_tricode === awayTeam
                ? 'text-[#64b5f6]'
                : 'text-[#6b7280]'
 
            return (
              <div
                key={`${play.action_number}-${i}`}
                ref={isCurrent ? currentRef : null}
                className={`
                  flex items-start gap-2.5 px-2 py-2 rounded-md transition-all duration-200
                  ${isCurrent
                    ? 'bg-[#1a1d27] border border-[#2a2d3e]'
                    : 'hover:bg-[#0d0f14]'
                  }
                `}
              >
                {/* Colored dot */}
                <div className="flex-shrink-0 mt-1.5">
                  <span className={`block w-2 h-2 rounded-full ${style.dot}`} />
                </div>
 
                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Period badge + team + player */}
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-[#6b7280] font-mono text-xs font-medium">
                      {formatPeriod(play.period)}
                    </span>
                    {!isNaN_team && (
                      <span className={`font-mono text-xs font-bold ${teamColor}`}>
                        {play.team_tricode}
                      </span>
                    )}
                    {isPlayerPlay && (
                      <span className="text-[#9ca3af] font-mono text-xs truncate">
                        {play.player_name}
                      </span>
                    )}
                  </div>
 
                  {/* Description */}
                  <div
                    className={`font-mono text-sm leading-snug ${
                      isCurrent ? 'text-white font-medium' : style.text
                    }`}
                  >
                    {play.description}
                  </div>
 
                  {/* Score snapshot for current play */}
                  {isCurrent && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[#f97316] font-mono text-xs font-bold">
                        {homeTeam} {play.score_home}
                      </span>
                      <span className="text-[#6b7280] font-mono text-xs">–</span>
                      <span className="text-[#64b5f6] font-mono text-xs font-bold">
                        {play.score_away} {awayTeam}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}