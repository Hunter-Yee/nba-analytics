export interface Play {
  action_number: number
  period: number
  clock: string
  seconds_remaining: number
  score_home: number
  score_away: number
  score_diff: number
  momentum: number
  description: string
  action_type: string | null
  player_name: string | null
  team_tricode: string | null
}

export interface GameSummary {
  game_id: string
  home_team: string
  away_team: string
  home_score: number
  away_score: number
  home_win: boolean
  total_plays: number
}

export interface GameDetail {
  game_id: string
  home_team: string
  away_team: string
  home_score: number
  away_score: number
  home_win: boolean
  plays: Play[]
}

export interface ChartDataPoint {
  play_index: number
  seconds_remaining: number
  home_win_probability: number
  away_win_probability: number
  description: string
  score_home: number
  score_away: number
  period: number
}

export interface WinProbabilityBatchRequest {
  plays: Array<{
    seconds_remaining: number
    score_diff: number
    momentum: number
    period: number
    is_overtime: number
  }>
}

export interface WinProbabilityResponse {
  home_win_probability: number
  away_win_probability: number
  seconds_remaining: number
  score_diff: number
}
