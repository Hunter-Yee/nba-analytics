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
    <div className="bg-[#0a0c10] border border-[#2a2d3e] rounded-lg p-3 max-w-xs shadow-2xl">
      <div className="text-[#9ca3af] font-mono text-xs mb-1 tracking-wider">
        {formatPeriod(d.period)} · Play #{d.play_index + 1}
      </div>
      <div className="text-[#e2e8f0] font-mono text-xs mb-2 leading-snug">
        {d.description}
      </div>
      <div className="text-[#9ca3af] font-mono text-xs mb-1">
        Score: {d.score_home} – {d.score_away}
      </div>
      <div className="flex gap-3 mt-1">
        <div>
          <div className="text-[#f97316] font-mono text-xs font-bold">{homeProb}%</div>
          <div className="text-[#9ca3af] font-mono text-[10px]">{d.home_team_tricode ?? 'HOME'} WIN</div>
        </div>
        <div>
          <div className="text-[#64b5f6] font-mono text-xs font-bold">{awayProb}%</div>
          <div className="text-[#9ca3af] font-mono text-[10px]">{d.away_team_tricode ?? 'AWAY'} WIN</div>
        </div>
      </div>
    </div>
  )
}

function getFormattedProb(prob: number) {
  return `${Math.round(prob * 100)}%`
}
 
export default function WinProbabilityChart({
  data,
  currentPlayIndex,
  homeTeam,
  awayTeam,
}: Props) {
  const chartData = data.map((d, i) => ({
    ...d,
    home_win_probability: i <= currentPlayIndex ? d.home_win_probability : null,
    away_win_probability: i <= currentPlayIndex ? (d.away_win_probability ?? (1 - d.home_win_probability)) : null,
    home_team_tricode: homeTeam,
    away_team_tricode: awayTeam,
  }))
 
  if (data.length === 0) {
    const isGameSelected = homeTeam !== 'HOME' && homeTeam !== '–'
    return (
      <div className="bg-[#0f1117] border border-[#2a2d3e] rounded-xl p-5 h-full flex items-center justify-center">
        {isGameSelected ? (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-ping" />
            <span className="text-[#9ca3af] font-mono text-sm">Loading win probability…</span>
          </div>
        ) : (
          <span className="text-[#6b7280] font-mono text-sm">
            Select a game to load win probability
          </span>
        )}
      </div>
    )
  }
 
  // Determine current win probability to color the chart
  const current = data[currentPlayIndex]
  const homeLeading = current ? current.home_win_probability > 0.5 : true
 
  return (
    <div className="bg-[#0f1117] border border-[#2a2d36] rounded-xl p-5 h-full flex flex-col">
      {/* Header & Current probability inline */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-6">
          <span className="text-[#9ca3af] font-mono text-xs tracking-widest uppercase font-semibold">
            Win Probability
          </span>
          {current && (
            <div className="flex items-center gap-3">
              <div>
                <span className={`font-mono font-black text-xl ${homeLeading ? 'text-[#f97316]' : 'text-[#6b7280]'}`}>
                  {getFormattedProb(current.home_win_probability)}
                </span>
                <span className="text-[#9ca3af] font-mono text-[10px] ml-1">{homeTeam}</span>
              </div>
              <span className="text-[#4b5563] font-mono">|</span>
              <div>
                <span className={`font-mono font-black text-xl ${!homeLeading ? 'text-[#64b5f6]' : 'text-[#6b7280]'}`}>
                  {getFormattedProb(1 - current.home_win_probability)}
                </span>
                <span className="text-[#9ca3af] font-mono text-[10px] ml-1">{awayTeam}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#f97316]" />
            <span className="text-[#f97316] font-mono text-xs font-semibold">{homeTeam}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#64b5f6]" />
            <span className="text-[#64b5f6] font-mono text-xs font-semibold">{awayTeam}</span>
          </div>
        </div>
      </div>
 
      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            {/* Reference lines */}
            <ReferenceLine y={1} stroke="#2a2d36" strokeDasharray="3 3" />
            <ReferenceLine y={0.5} stroke="#374151" strokeDasharray="3 3" />
            <ReferenceLine y={0} stroke="#2a2d36" strokeDasharray="3 3" />
 
            <XAxis
              dataKey="play_index"
              domain={[0, data.length - 1]}
              type="number"
              tick={false}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 1]}
              tickFormatter={(v) => `${Math.round(v * 100)}%`}
              tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
              ticks={[0, 0.5, 1]}
            />
            <Tooltip content={<CustomTooltip />} />
 
            <Line
              type="monotone"
              dataKey="home_win_probability"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#f97316', stroke: '#0f1117', strokeWidth: 2 }}
              isAnimationActive={false}
              connectNulls={false}
            />
            
            <Line
              type="monotone"
              dataKey="away_win_probability"
              stroke="#64b5f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#64b5f6', stroke: '#0f1117', strokeWidth: 2 }}
              isAnimationActive={false}
              connectNulls={false}
            />
          </LineChart>
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
          <span className="text-[#6b7280] font-mono text-[10px]">Tip-off</span>
          <span className="text-[#6b7280] font-mono text-[10px]">Final</span>
        </div>
      </div>
    </div>
  )
}