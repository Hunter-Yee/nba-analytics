'use client'
 
/**
 * GameSelector
 * Renders a styled dropdown of all available games.
 * When the user picks one, it calls onSelect with the game_id.
 */
 
import { useState } from 'react'
import type { GameSummary } from '@/types'
import { ChevronDown } from 'lucide-react'
 
interface Props {
  games: GameSummary[]
  selectedId: string | null
  onSelect: (gameId: string) => void
  loading: boolean
}
 
export default function GameSelector({ games, selectedId, onSelect, loading }: Props) {
  const [open, setOpen] = useState(false)
 
  const selected = games.find((g) => g.game_id === selectedId)
 
  return (
    <div className="relative w-full">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className="
          w-full flex items-center justify-between
          bg-[#0f1117] border border-[#2a2d3e] hover:border-[#f97316]
          rounded-lg px-4 py-3 text-left
          transition-colors duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        <div>
          {loading ? (
            <span className="text-[#9ca3af] font-mono text-sm">Loading games…</span>
          ) : selected ? (
            <div className="flex items-center gap-3">
              <span className="text-[#f97316] font-bold font-mono text-sm tracking-wide">
                {selected.home_team}
              </span>
              <span className="text-white font-mono font-bold text-sm">
                {selected.home_score}
              </span>
              <span className="text-[#9ca3af] font-mono text-sm font-medium">vs</span>
              <span className="text-white font-mono font-bold text-sm">
                {selected.away_score}
              </span>
              <span className="text-[#94a3b8] font-bold font-mono text-sm tracking-wide">
                {selected.away_team}
              </span>
              <span className="ml-2 text-[#9ca3af] text-sm font-mono">
                {selected.total_plays} plays
              </span>
            </div>
          ) : (
            <span className="text-[#9ca3af] font-mono text-sm">
              Select a game to replay…
            </span>
          )}
        </div>
        <ChevronDown
          size={18}
          className={`text-[#9ca3af] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
 
      {open && (
        <div
          className="
            absolute z-50 w-full mt-1
            bg-[#0f1117] border border-[#2a2d3e]
            rounded-lg shadow-2xl
            max-h-64 overflow-y-auto
            scrollbar-thin
          "
        >
          {games.map((game) => (
            <button
              key={game.game_id}
              onClick={() => {
                onSelect(game.game_id)
                setOpen(false)
              }}
              className={`
                w-full flex items-center justify-between
                px-4 py-3 text-left
                hover:bg-[#1a1d27] transition-colors duration-100
                border-b border-[#1e2130] last:border-0
                ${game.game_id === selectedId ? 'bg-[#1a1d27]' : ''}
              `}
            >
              <div className="flex items-center gap-3">
                {/* Win indicator dot */}
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    game.home_win ? 'bg-[#f97316]' : 'bg-[#64b5f6]'
                  }`}
                />
                <span className="text-[#f97316] font-mono font-semibold text-sm w-10">
                  {game.home_team}
                </span>
                <span className="text-white font-mono font-bold text-sm">
                  {game.home_score}
                </span>
                <span className="text-[#6b7280] font-mono text-sm">–</span>
                <span className="text-white font-mono font-bold text-sm">
                  {game.away_score}
                </span>
                <span className="text-[#94a3b8] font-mono font-semibold text-sm w-10">
                  {game.away_team}
                </span>
              </div>
              <span className="text-[#9ca3af] font-mono text-xs">
                {game.total_plays}p
              </span>
            </button>
          ))}
        </div>
      )}
 
      {/* Backdrop to close dropdown */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  )
}