# backend/routers/games.py
from fastapi import APIRouter, HTTPException
from schemas import GameSummary, GameDetailResponse, Play
import pandas as pd
import os
import sys

# Add data directory to path so we can import features.py
sys.path.append(os.path.join(os.path.dirname(__file__), "../../data"))
from features import engineer_features

router = APIRouter(prefix="/games", tags=["games"])

RAW_DIR = os.path.join(os.path.dirname(__file__), "../../data/raw")


def load_game(game_id: str) -> tuple[pd.DataFrame, str, str]:
    """Load raw PBP, run feature engineering, return (df, home_tricode, away_tricode)."""
    path = os.path.join(RAW_DIR, f"pbp_{game_id}.csv")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Game {game_id} not found")

    pbp = pd.read_csv(path)

    # Detect home team
    home_rows = pbp[pbp['location'] == 'h']
    if len(home_rows) == 0:
        valid = pbp[pbp['teamTricode'].notna() & (pbp['teamTricode'] != '')]
        unique_teams = valid['teamId'].unique()
        home_team_id = unique_teams[1] if len(unique_teams) >= 2 else unique_teams[0]
    else:
        home_team_id = home_rows['teamId'].iloc[0]

    # Get tricodes
    valid_teams = pbp[pbp['teamTricode'].notna() & (pbp['teamTricode'] != '')]
    tricodes = valid_teams.drop_duplicates('teamId')[['teamId', 'teamTricode']]
    home_tricode = tricodes[tricodes['teamId'] == home_team_id]['teamTricode'].values[0]
    away_tricode = tricodes[tricodes['teamId'] != home_team_id]['teamTricode'].values[0]

    features = engineer_features(pbp, home_team_id=home_team_id)
    return features, home_tricode, away_tricode


@router.get("/", response_model=list[GameSummary])
def list_games():
    """
    Return a list of all available games.
    Frontend uses this to populate the game selection dropdown.
    """
    summaries = []
    raw_files = [f for f in os.listdir(RAW_DIR) if f.startswith("pbp_")]

    for filename in raw_files:
        game_id = filename.replace("pbp_", "").replace(".csv", "")
        try:
            features, home_tricode, away_tricode = load_game(game_id)
            if len(features) < 10:
                continue

            final = features.iloc[-1]
            final_home = int(features['scoreHome'].iloc[-1])
            final_away = int(features['scoreAway'].iloc[-1])
            home_win = int(final['score_diff']) > 0

            summaries.append(GameSummary(
                game_id=game_id,
                home_team=home_tricode,
                away_team=away_tricode,
                home_score=final_home,
                away_score=final_away,
                home_win=home_win,
                total_plays=len(features),
            ))
        except Exception:
            continue

    return sorted(summaries, key=lambda g: g.game_id, reverse=True)


@router.get("/{game_id}", response_model=GameDetailResponse)
def get_game(game_id: str):
    """
    Return full play-by-play with features for a single game.
    Frontend calls this when the user selects a game to replay.
    """
    features, home_tricode, away_tricode = load_game(game_id)

    plays = []
    for _, row in features.iterrows():
        plays.append(Play(
            action_number=int(row.get('actionNumber', 0)),
            period=int(row['period']),
            clock=str(row.get('clock', '')),
            seconds_remaining=float(row['seconds_remaining']),
            score_home=int(row.get('scoreHome', 0)),
            score_away=int(row.get('scoreAway', 0)),
            score_diff=int(row['score_diff']),
            momentum=int(row['momentum']),
            description=str(row.get('description', '')),
            action_type=str(row.get('actionType', '')),
            player_name=str(row.get('playerName', '')),
            team_tricode=str(row.get('teamTricode', '')),
        ))

    final_home = int(features['scoreHome'].iloc[-1])
    final_away = int(features['scoreAway'].iloc[-1])

    return GameDetailResponse(
        game_id=game_id,
        home_team=home_tricode,
        away_team=away_tricode,
        home_score=final_home,
        away_score=final_away,
        home_win=final_home > final_away,
        plays=plays,
    )