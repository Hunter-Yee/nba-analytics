'use client'

/**
 * ReplayControls
 * Play/Pause, speed selector, and scrubber bar.
 * Parent owns the state; this component just fires callbacks.
 */

import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'

interface Props {
  isPlaying: boolean
  speed: number
  currentPlayIndex: number
  totalPlays: number
  onPlayPause: () => void
  onSpeedChange: (speed: number) => void
  onScrub: (index: number) => void
  onSkipToStart: () => void
  onSkipToEnd: () => void
}

const SPEED_OPTIONS = [0.5, 1, 2, 4]

export default function ReplayControls({
  isPlaying,
  speed,
  currentPlayIndex,
  totalPlays,
  onPlayPause,
  onSpeedChange,
  onScrub,
  onSkipToStart,
  onSkipToEnd,
}: Props) {
  const progressPercent =
    totalPlays > 0 ? ((currentPlayIndex + 1) / totalPlays) * 100 : 0

  return (
    <div className="bg-[#0f1117] border border-[#2a2d36] rounded-xl px-5 py-4">
      {/* Controls row */}
      <div className="flex items-center gap-4">
        {/* Skip to start */}
        <button
          onClick={onSkipToStart}
          disabled={totalPlays === 0}
          className="
            text-[#4b5563] hover:text-[#94a3b8]
            transition-colors duration-150
            disabled:opacity-30 disabled:cursor-not-allowed
          "
          title="Jump to start"
        >
          <SkipBack size={16} />
        </button>

        {/* Play / Pause */}
        <button
          onClick={onPlayPause}
          disabled={totalPlays === 0}
          className="
            w-10 h-10 rounded-full flex items-center justify-center
            bg-[#f97316] hover:bg-[#ea6e0b] active:scale-95
            transition-all duration-150
            disabled:opacity-30 disabled:cursor-not-allowed
            shadow-lg shadow-orange-900/30
          "
        >
          {isPlaying ? (
            <Pause size={18} fill="white" color="white" />
          ) : (
            <Play size={18} fill="white" color="white" className="ml-0.5" />
          )}
        </button>

        {/* Skip to end */}
        <button
          onClick={onSkipToEnd}
          disabled={totalPlays === 0}
          className="
            text-[#4b5563] hover:text-[#94a3b8]
            transition-colors duration-150
            disabled:opacity-30 disabled:cursor-not-allowed
          "
          title="Jump to final"
        >
          <SkipForward size={16} />
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Play counter */}
        <span className="text-[#374151] font-mono text-xs tabular-nums">
          {currentPlayIndex + 1} / {totalPlays || '–'}
        </span>

        {/* Speed selector */}
        <div className="flex items-center gap-1">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`
                font-mono text-xs px-2 py-1 rounded
                transition-colors duration-150
                ${
                  speed === s
                    ? 'bg-[#f97316] text-white font-bold'
                    : 'text-[#4b5563] hover:text-[#94a3b8] hover:bg-[#1e2130]'
                }
              `}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Scrubber */}
      <div className="mt-4">
        <input
          type="range"
          min={0}
          max={Math.max(0, totalPlays - 1)}
          value={currentPlayIndex}
          onChange={(e) => onScrub(Number(e.target.value))}
          disabled={totalPlays === 0}
          className="
            w-full h-1.5 rounded-full appearance-none cursor-pointer
            disabled:cursor-not-allowed disabled:opacity-30
            accent-[#f97316]
          "
          style={{
            background: `linear-gradient(to right, #f97316 ${progressPercent}%, #1e2130 ${progressPercent}%)`,
          }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[#2a2d36] font-mono text-[10px]">Start</span>
          <span className="text-[#2a2d36] font-mono text-[10px]">End</span>
        </div>
      </div>
    </div>
  )
}
