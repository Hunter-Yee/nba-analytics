import React, { useMemo } from 'react'
import type { Play } from '@/types'

interface TeamStats {
  fgm: number
  fga: number
  fg3m: number
  fg3a: number
  ftm: number
  fta: number
  reb: number
  ast: number
  stl: number
  blk: number
  tov: number
}

interface Props {
  plays: Play[]
  currentPlayIndex: number
  homeTeam: string
  awayTeam: string
}

function calculateStats(plays: Play[], homeTeam: string, awayTeam: string): { home: TeamStats, away: TeamStats } {
  const home = { fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0 }
  const away = { ...home }

  plays.forEach((play) => {
    const isHome = play.team_tricode === homeTeam
    const isAway = play.team_tricode === awayTeam
    if (!isHome && !isAway) return

    const team = isHome ? home : away
    const desc = play.description?.toLowerCase() || ''
    const act = play.action_type?.toLowerCase() || ''

    if (desc.includes('turnover') || act.includes('turnover')) {
      team.tov++
    }
    
    if (desc.includes('rebound') || act.includes('rebound')) {
      team.reb++
    }
    
    if (desc.includes('ast)')) {
      team.ast++
    }
    
    if (desc.includes('steal')) {
      team.stl++
    }
    
    if (desc.includes('block')) {
      team.blk++
    }

    if (desc.includes('free throw') || act.includes('free throw')) {
      team.fta++
      if (!desc.includes('miss')) {
        team.ftm++
      }
    } else if (desc.includes('shot') || desc.includes('layup') || desc.includes('dunk')) {
      team.fga++
      const is3pt = desc.includes('3pt')
      const isMade = !desc.includes('miss')
      
      if (is3pt) team.fg3a++
      if (isMade) {
        team.fgm++
        if (is3pt) team.fg3m++
      }
    }
  })

  return { home, away }
}

function formatPct(made: number, att: number): string {
  if (att === 0) return '0%'
  return `${Math.round((made / att) * 100)}%`
}

export default function TeamStatsTable({ plays, currentPlayIndex, homeTeam, awayTeam }: Props) {
  const visiblePlays = useMemo(() => {
    return plays.slice(0, currentPlayIndex + 1)
  }, [plays, currentPlayIndex])

  const { home, away } = useMemo(() => calculateStats(visiblePlays, homeTeam, awayTeam), [visiblePlays, homeTeam, awayTeam])

  const stats = [
    { label: 'FIELD GOAL %', homeVal: `${formatPct(home.fgm, home.fga)} (${home.fgm}/${home.fga})`, awayVal: `${formatPct(away.fgm, away.fga)} (${away.fgm}/${away.fga})` },
    { label: '3 POINTER %', homeVal: `${formatPct(home.fg3m, home.fg3a)} (${home.fg3m}/${home.fg3a})`, awayVal: `${formatPct(away.fg3m, away.fg3a)} (${away.fg3m}/${away.fg3a})` },
    { label: 'FREE THROW %', homeVal: `${formatPct(home.ftm, home.fta)} (${home.ftm}/${home.fta})`, awayVal: `${formatPct(away.ftm, away.fta)} (${away.ftm}/${away.fta})` },
    { label: 'REBOUNDS', homeVal: home.reb, awayVal: away.reb },
    { label: 'ASSISTS', homeVal: home.ast, awayVal: away.ast },
    { label: 'STEALS', homeVal: home.stl, awayVal: away.stl },
    { label: 'BLOCKS', homeVal: home.blk, awayVal: away.blk },
    { label: 'TURNOVERS', homeVal: home.tov, awayVal: away.tov },
  ]

  return (
    <div className="bg-[#0f1117] border border-[#1e2130] rounded-xl flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 py-1.5 border-b border-[#2a2d3e] flex-shrink-0 flex items-center justify-between">
        <span className="text-[#9ca3af] font-mono text-[10px] tracking-widest uppercase font-semibold">
          Team Stats
        </span>
      </div>
 
      {/* Table Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col">
        <div className="flex justify-between items-center mb-2 flex-shrink-0">
          <span className="text-[#f97316] font-mono font-bold text-sm">{homeTeam}</span>
          <span className="text-[#64b5f6] font-mono font-bold text-sm">{awayTeam}</span>
        </div>

        <div className="flex-1 flex flex-col justify-evenly min-h-0">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex justify-between items-center text-xs font-mono">
              <span className="text-gray-300 w-1/3 text-left">{stat.homeVal}</span>
              <span className="text-gray-500 w-1/3 text-center tracking-wider">{stat.label}</span>
              <span className="text-gray-300 w-1/3 text-right">{stat.awayVal}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
