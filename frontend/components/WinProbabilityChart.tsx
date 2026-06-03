'use client'

/**
 * WinProbabilityChart
 * Recharts LineChart showing home win probability over all plays.
 * Only renders data up to currentPlayIndex to simulate live reveal.
 * Reference lines at 25%, 50%, 75%.
 * Tooltip shows play description + score at that moment.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import type { ChartDataPoint } from '@/types'
import { formatPeriod } from '@/lib/api'

interface Props {
  data: ChartDataPoint[]
  currentPlayIndex: number
  homeTeam: string
  awayTeam: string
}

// Custom tooltip that appears when hovering over the chart
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const d: ChartDataPoint = payload[0].payload
  const homeProb = Math.round(d.home_win_probability * 100)
  const awayProb = 100 - homeProb

  return (
    <div className="bg-[#0a0c10] border border-[#2a2d36] rounded-lg p-3 max-w-xs shadow-2xl">
      <div className="text-[#6b7280] font-mono text-[10px] mb-1 tracking-wider">
        {formatPeriod(d.period)} · Play #{d.play_index + 1}
      </div>
      <div className="text-[#e2e8f0] font-mono text-xs mb-2 leading-snug">
        {d.description}
      </div>
      <div className="text-[#4b5563] font-mono text-[10px] mb-1">
        Score: {d.score_home} – {d.score_away}
      </div>
      <div className="flex gap-3 mt-1">
        <div>
          <div className="text-[#f97316] font-mono text-xs font-bold">{homeProb}%</div>
          <div className="text-[#4b5563] font-mono text-[10px]">HOME WIN</div>
        </div>
        <div>
          <div className="text-[#64b5f6] font-mono text-xs font-bold">{awayProb}%</div>
          <div className="text-[#4b5563] font-mono text-[10px]">AWAY WIN</div>
        </div>
      </div>
    </div>
  )
}

export default function WinProbabilityChart({
  data,
  currentPlayIndex,
  homeTeam,
  awayTeam,
}: Props) {
  // Only show data up to the current play during replay
  const visibleData = data.slice(0, currentPlayIndex + 1)

  if (data.length === 0) {
    return (
      <div className="bg-[#0f1117] border border-[#2a2d36] rounded-xl p-5 h-full flex items-center justify-center">
        <span className="text-[#374151] font-mono text-sm">
          Select a game to load win probability
        </span>
      </div>
    )
  }

  // Determine current win probability to color the chart
  const current = visibleData[visibleData.length - 1]
  const homeLeading = current ? current.home_win_probability > 0.5 : true

  return (
    <div className="bg-[#0f1117] border border-[#2a2d36] rounded-xl p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[#6b7280] font-mono text-xs tracking-widest uppercase">
          Win Probability
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#f97316]" />
            <span className="text-[#f97316] font-mono text-xs">{homeTeam}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#64b5f6]" />
            <span className="text-[#64b5f6] font-mono text-xs">{awayTeam}</span>
          </div>
        </div>
      </div>

      {/* Current probability display */}
      {current && (
        <div className="flex items-center gap-4 mb-3">
          <div>
            <span
              className={`font-mono font-black text-2xl ${
                homeLeading ? 'text-[#f97316]' : 'text-[#374151]'
              }`}
            >
              {Math.round(current.home_win_probability * 100)}%
            </span>
            <span className="text-[#374151] font-mono text-xs ml-1">{homeTeam}</span>
          </div>
          <span className="text-[#2a2d36] font-mono">|</span>
          <div>
            <span
              className={`font-mono font-black text-2xl ${
                !homeLeading ? 'text-[#64b5f6]' : 'text-[#374151]'
              }`}
            >
              {Math.round((1 - current.home_win_probability) * 100)}%
            </span>
            <span className="text-[#374151] font-mono text-xs ml-1">{awayTeam}</span>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={visibleData}
            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="homeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            {/* Reference lines */}
            <ReferenceLine y={0.75} stroke="#2a2d36" strokeDasharray="3 3" />
            <ReferenceLine y={0.5} stroke="#374151" strokeWidth={1} />
            <ReferenceLine y={0.25} stroke="#2a2d36" strokeDasharray="3 3" />

            <XAxis
              dataKey="play_index"
              tick={false}
              axisLine={{ stroke: '#1e2130' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 1]}
              tickFormatter={(v) => `${Math.round(v * 100)}%`}
              tick={{ fill: '#374151', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
            />
            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="home_win_probability"
              stroke="#f97316"
              strokeWidth={2}
              fill="url(#homeGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#f97316', stroke: '#0f1117', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Play progress bar */}
      <div className="mt-2">
        <div className="h-0.5 bg-[#1e2130] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#f97316] to-[#64b5f6] transition-all duration-200"
            style={{
              width: `${data.length > 0 ? ((currentPlayIndex + 1) / data.length) * 100 : 0}%`,
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[#2a2d36] font-mono text-[10px]">Tip-off</span>
          <span className="text-[#2a2d36] font-mono text-[10px]">Final</span>
        </div>
      </div>
    </div>
  )
}
