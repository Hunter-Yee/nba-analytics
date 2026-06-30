'use client'
 
import React from 'react'

/**
 * MomentumBar
 * A horizontal bar showing which team is on a run.
 * Momentum ranges roughly -8 to +8 (per backend notes).
 * Positive = home team momentum, negative = away team momentum.
 */

import type { Play } from '@/types'
 
interface Props {
  momentum: number
  homeTeam: string
  awayTeam: string
  plays: Play[]
  currentPlayIndex: number
}

const MAX_MOMENTUM = 8

export default function MomentumBar({ momentum, homeTeam, awayTeam, plays = [], currentPlayIndex = 0 }: Props) {
  // Normalize to 0–100% where 50% = neutral
  const clamped = Math.max(-MAX_MOMENTUM, Math.min(MAX_MOMENTUM, momentum))
  const percent = ((clamped + MAX_MOMENTUM) / (MAX_MOMENTUM * 2)) * 100

  const homeOnRun = momentum > 2
  const awayOnRun = momentum < -2
  const isNeutral = !homeOnRun && !awayOnRun

  const { biggestLead, biggestLeadTeam, leadChanges, timesTied } = React.useMemo(() => {
    let bl = 0;
    let blTeam = 'TIE';
    let lc = 0;
    let tt = 0;
    
    let currentLeader = 0; // 0 = tie, 1 = home, -1 = away
    let previousDiff = 0;
 
    for (let i = 0; i <= currentPlayIndex; i++) {
      const play = plays[i];
      if (!play) continue;
 
      const diff = play.score_diff ?? 0;
      
      // Track biggest lead
      if (Math.abs(diff) > bl) {
        bl = Math.abs(diff);
        blTeam = diff > 0 ? homeTeam : awayTeam;
      }
      
      // If score changed
      if (diff !== previousDiff) {
        if (diff === 0 && previousDiff !== 0) {
          tt++;
        }
        
        const newLeader = diff > 0 ? 1 : diff < 0 ? -1 : 0;
        if (currentLeader !== 0 && newLeader !== 0 && newLeader !== currentLeader) {
          lc++;
        }
        if (newLeader !== 0) {
          currentLeader = newLeader;
        }
      }
      previousDiff = diff;
    }
    
    return { biggestLead: bl, biggestLeadTeam: blTeam, leadChanges: lc, timesTied: tt };
  }, [plays, currentPlayIndex, homeTeam, awayTeam])

  return (
    <div className="bg-[#0f1117] border border-[#2a2d36] rounded-xl px-5 py-3">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[#6b7280] font-mono text-xs tracking-widest uppercase">
            Momentum
          </span>
          {homeOnRun && (
            <span className="text-[#f97316] font-mono text-xs font-bold animate-pulse">
              {homeTeam} ON A RUN
            </span>
          )}
          {awayOnRun && (
            <span className="text-[#64b5f6] font-mono text-xs font-bold animate-pulse">
              {awayTeam} ON A RUN
            </span>
          )}
          {isNeutral && (
            <span className="text-[#9ca3af] font-mono text-xs">BALANCED</span>
          )}
        </div>
        <span className="text-[#9ca3af] font-mono text-xs">
          {momentum > 0 ? `+${momentum}` : momentum}
        </span>
      </div>

      {/* Bar track */}
      <div className="relative h-3 bg-[#1e2130] rounded-full overflow-hidden">
        {/* Center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#2a2d36] z-10" />

        {/* Momentum fill — expands from center */}
        {momentum >= 0 ? (
          // Home momentum: fills right from center
          <div
            className="absolute top-0 bottom-0 transition-all duration-500 ease-out"
            style={{
              left: '50%',
              width: `${(clamped / MAX_MOMENTUM) * 50}%`,
              background: 'linear-gradient(90deg, #c2410c, #f97316)',
              borderRadius: '0 4px 4px 0',
            }}
          />
        ) : (
          // Away momentum: fills left from center
          <div
            className="absolute top-0 bottom-0 transition-all duration-500 ease-out"
            style={{
              right: '50%',
              width: `${(Math.abs(clamped) / MAX_MOMENTUM) * 50}%`,
              background: 'linear-gradient(270deg, #1d4ed8, #64b5f6)',
              borderRadius: '4px 0 0 4px',
            }}
          />
        )}
      </div>

      {/* Team labels */}
      <div className="flex justify-between mt-1.5 mb-4">
        <span
          className={`font-mono text-[10px] tracking-widest ${
            awayOnRun ? 'text-[#64b5f6] font-bold' : 'text-[#9ca3af]'
          }`}
        >
          ← {awayTeam}
        </span>
        <span
          className={`font-mono text-[10px] tracking-widest ${
            homeOnRun ? 'text-[#f97316] font-bold' : 'text-[#9ca3af]'
          }`}
        >
          {homeTeam} →
        </span>
      </div>
 
      {/* Mini Stats (Biggest Lead, Lead Changes, Times Tied) */}
      <div className="flex justify-between items-center border-t border-[#1e2130] pt-3">
        <div className="flex flex-col items-center">
          <span className="text-[#6b7280] font-mono text-[10px] uppercase mb-0.5">Biggest Lead</span>
          <span className="text-white font-mono text-sm font-bold">
            {biggestLead > 0 ? `${biggestLeadTeam} ${biggestLead}` : '0'}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[#6b7280] font-mono text-[10px] uppercase mb-0.5">Lead Changes</span>
          <span className="text-white font-mono text-sm font-bold">{leadChanges}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[#6b7280] font-mono text-[10px] uppercase mb-0.5">Times Tied</span>
          <span className="text-white font-mono text-sm font-bold">{timesTied}</span>
        </div>
      </div>
    </div>
  )
}
