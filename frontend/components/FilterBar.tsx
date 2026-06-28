import React, { useState } from 'react'

export interface FilterState {
  season: string
  seasonType: string
  team: string
  search: string
}

interface FilterBarProps {
  initialFilters: FilterState
  onApply: (filters: FilterState) => void
  onReset: () => void
  availableSeasons: string[]
  availableTeams: string[]
}

const FilterBar: React.FC<FilterBarProps> = ({
  initialFilters,
  onApply,
  onReset,
  availableSeasons,
  availableTeams,
}) => {
  const [filters, setFilters] = useState<FilterState>(initialFilters)

  const handleApply = () => {
    onApply(filters)
  }

  const handleReset = () => {
    const defaultFilters = {
      season: 'All Seasons',
      seasonType: 'All Types',
      team: 'All Teams',
      search: '',
    }
    setFilters(defaultFilters)
    onReset()
  }

  const inputClasses =
    'bg-[#0f1117] text-gray-200 border border-[#1e2130] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-[#f97316] w-full placeholder-gray-500 transition-colors'

  return (
    <div className="flex flex-col md:flex-row items-center gap-4 bg-[#0a0c10] border border-[#1e2130] p-3 rounded-lg shadow-sm">
      
      {/* Season */}
      <div className="flex flex-col gap-1 w-full md:w-36">
        <label className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
          Season
        </label>
        <select
          value={filters.season}
          onChange={(e) => setFilters({ ...filters, season: e.target.value })}
          className={inputClasses}
        >
          <option value="All Seasons">All Seasons</option>
          {availableSeasons.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Game Type */}
      <div className="flex flex-col gap-1 w-full md:w-40">
        <label className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
          Game Type
        </label>
        <select
          value={filters.seasonType}
          onChange={(e) => setFilters({ ...filters, seasonType: e.target.value })}
          className={inputClasses}
        >
          <option value="All Types">All Types</option>
          <option value="Preseason">Preseason</option>
          <option value="Regular Season">Regular Season</option>
          <option value="All-Star">All-Star</option>
          <option value="Playoffs">Playoffs</option>
          <option value="Play-In">Play-In</option>
        </select>
      </div>

      {/* Team */}
      <div className="flex flex-col gap-1 w-full md:w-48">
        <label className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
          Team
        </label>
        <select
          value={filters.team}
          onChange={(e) => setFilters({ ...filters, team: e.target.value })}
          className={inputClasses}
        >
          <option value="All Teams">All Teams</option>
          {availableTeams.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-1 flex-1 w-full">
        <label className="text-[10px] text-[#0a0c10] font-mono tracking-widest uppercase select-none">
          Spacer
        </label>
        <div className="relative">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search teams, players, or matchups..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className={`${inputClasses} pl-9`}
            onKeyDown={(e) => { if (e.key === 'Enter') handleApply() }}
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-end gap-2 w-full md:w-auto mt-4 md:mt-0">
        <button
          onClick={handleReset}
          className="px-6 py-1.5 border border-[#1e2130] text-gray-300 rounded-md text-sm hover:bg-[#1e2130] transition-colors h-[34px] self-end"
        >
          Reset
        </button>
        <button
          onClick={handleApply}
          className="px-6 py-1.5 bg-[#f97316] text-white rounded-md text-sm font-medium hover:bg-[#ea580c] transition-colors shadow-lg shadow-orange-500/20 h-[34px] self-end"
        >
          Apply
        </button>
      </div>

    </div>
  )
}

export default FilterBar
