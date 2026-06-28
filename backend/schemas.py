# backend/schemas.py
from pydantic import BaseModel
from typing import List, Optional

class Play(BaseModel):
    """A single play/event in a game — used for the replay system."""
    action_number: int
    period: int
    clock: str
    seconds_remaining: float
    score_home: int
    score_away: int
    score_diff: int
    momentum: int
    description: str
    action_type: Optional[str] = None
    player_name: Optional[str] = None
    team_tricode: Optional[str] = None

class GameSummary(BaseModel):
    """Lightweight game info for the game selection list."""
    game_id: str
    home_team: str
    away_team: str
    home_score: int
    away_score: int
    home_win: bool
    total_plays: int
    season: Optional[str] = None
    season_type: Optional[str] = None
    game_date: Optional[str] = None

class GameDetailResponse(BaseModel):
    """Full game data including all plays — powers the replay system."""
    game_id: str
    home_team: str
    away_team: str
    home_score: int
    away_score: int
    home_win: bool
    plays: List[Play]

class PredictRequest(BaseModel):
    """Input to the win probability model."""
    seconds_remaining: float
    score_diff: int
    momentum: int
    period: int
    is_overtime: int = 0

class PredictResponse(BaseModel):
    """Model output."""
    home_win_probability: float
    away_win_probability: float
    seconds_remaining: float
    score_diff: int