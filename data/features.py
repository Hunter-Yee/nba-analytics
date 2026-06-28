# data/features.py
import pandas as pd
import numpy as np
import re

def parse_clock(clock_str: str, period: int) -> float:
    """
    Convert NBA API clock format to total seconds remaining in the game
    Convert it to total game seconds remaining so the model sees
    a single number counting down from 2880 (48 min) to 0.
    """
    if not clock_str or pd.isna(clock_str):
        return 0.0

    # Extract minutes and seconds from clock format from NBA API
    # Ex: PT10M30.00S means 10 minutes and 30 seconds left in the quarter
    match = re.match(r'PT(\d+)M([\d.]+)S', clock_str)
    if not match:
        return 0.0

    minutes = int(match.group(1))
    seconds = float(match.group(2))
    clock_seconds = minutes * 60 + seconds  # seconds left in the quarter

    # Number of full quarters still ahead:
    regulation_periods = 4
    period_duration = 12 * 60 

    if period <= regulation_periods:
        # if game is in Q1, Q2, Q3, or Q4
        full_periods_remaining = regulation_periods - period
        total_seconds_remaining = (full_periods_remaining * period_duration) + clock_seconds
    else:
        # Overtime:
        ot_period_duration = 5 * 60
        full_ot_remaining = 0 # for now not looking ahead in OT for simplicity
        total_seconds_remaining = clock_seconds

    return float(total_seconds_remaining)


def compute_score_diff(row: pd.Series, home_team_id: str) -> int:
    """
    Score differential from the home team's perspective.
    Positive = home team leading, Negative = home team trailing.
    """
    try:
        home = int(row['scoreHome']) if row['scoreHome'] != '' else 0
        away = int(row['scoreAway']) if row['scoreAway'] != '' else 0
        return home - away
    except (ValueError, TypeError):
        return 0


def compute_momentum(df: pd.DataFrame, window_seconds: float = 120.0) -> pd.Series:
    """
    Momentum: net points scored by the home team in the last 2 minutes.
    Uses 'points_this_play' which we compute from score changes, NOT pointsTotal.
    Positive = home team on a run, Negative = away team on a run.
    """
    momentum = []

    for idx, row in df.iterrows():
        current_time = row['seconds_remaining']
        window_start = current_time + window_seconds  # earlier plays have MORE seconds remaining

        window_plays = df[
            (df['seconds_remaining'] <= window_start) &
            (df['seconds_remaining'] >= current_time)
        ]

        home_pts = window_plays['home_scored'].sum()
        away_pts = window_plays['away_scored'].sum()
        momentum.append(int(np.clip(home_pts - away_pts, -8, 8)))

    return pd.Series(momentum, index=df.index)


def engineer_features(pbp_df: pd.DataFrame, home_team_id: str) -> pd.DataFrame:
    """
    Master function: takes raw play-by-play and returns a feature DataFrame.
    Each row = one game state snapshot (one play).

    home_team_id: the teamId of the home team for this game.
    """
    df = pbp_df.copy()

    # --- 1. Filter to plays that actually change game state ---
    # We only want rows where something scoring-relevant happened
    # or where we have a valid score to work with
    df = df[df['scoreHome'].notna() & df['scoreAway'].notna()]
    df = df[df['scoreHome'] != '']

    # --- 2. Time remaining (our most important feature) ---
    df['seconds_remaining'] = df.apply(
        lambda row: parse_clock(row['clock'], row['period']), axis=1
    )

    # --- 3. Score differential (from home team's perspective) ---
    df['score_diff'] = df.apply(
        lambda row: compute_score_diff(row, home_team_id), axis=1
    )

    # --- 4. Points scored per play ---
    # pointsTotal in V3 is the player's CUMULATIVE total — not useful.
    # Instead, compute how much the score CHANGED on each play.
    df['scoreHome_num'] = pd.to_numeric(df['scoreHome'], errors='coerce').ffill().fillna(0)
    df['scoreAway_num'] = pd.to_numeric(df['scoreAway'], errors='coerce').ffill().fillna(0)

    # Shift by 1 to get the previous row's score, then subtract
    df['home_scored'] = (df['scoreHome_num'] - df['scoreHome_num'].shift(1, fill_value=0)).clip(lower=0)
    df['away_scored'] = (df['scoreAway_num'] - df['scoreAway_num'].shift(1, fill_value=0)).clip(lower=0)

    # --- 5. Momentum (net home points in last 2 minutes) ---
    df['momentum'] = compute_momentum(df, window_seconds=120.0)

    # --- 6. Period (quarter number) ---
    df['period'] = pd.to_numeric(df['period'], errors='coerce').fillna(1)

    # --- 7. Is this an overtime game state? ---
    df['is_overtime'] = (df['period'] > 4).astype(int)

    # --- 8. Keep only the columns we need ---
    feature_cols = [
        'gameId',
        'actionNumber',
        'period',
        'clock',               # keep original for debugging
        'seconds_remaining',   # ML feature
        'score_diff',          # ML feature
        'momentum',            # ML feature
        'is_overtime',         # ML feature
        'scoreHome',
        'scoreAway',
        'description',         # keep for the replay UI later
        'actionType',
        'teamTricode',
        'playerName',
    ]

    # Only keep columns that exist (safety check)
    existing_cols = [c for c in feature_cols if c in df.columns]
    df = df[existing_cols].reset_index(drop=True)

    return df


if __name__ == "__main__":
    # Test it on the CSV we already saved
    import os

    raw_files = [f for f in os.listdir("data/raw") if f.startswith("pbp_")]

    if not raw_files:
        print("No play-by-play files found. Run ingest_games.py first.")
        exit()

    # Load the first game we have
    test_file = f"data/raw/{raw_files[0]}"
    print(f"Loading: {test_file}")
    pbp = pd.read_csv(test_file)

    print(f"Raw rows: {len(pbp)}")
    print(f"Raw columns: {list(pbp.columns)}\n")

    print("Unique values in 'location' column:", pbp['location'].unique())

    # Get the two teams in this game
    teams_in_game = pbp[pbp['teamId'].notna() & (pbp['teamId'] != '')][['teamId', 'teamTricode']].drop_duplicates()
    print("\nTeams in this game:")
    print(teams_in_game.to_string())

    # Try location == 'H' first, fall back to second team if it fails
    home_rows = pbp[pbp['location'] == 'h']
    if len(home_rows) == 0:
        # V3 fallback: home team is typically the second unique team
        # (NBA API lists away team's actions first in early plays)
        valid_teams = pbp[pbp['teamTricode'].notna() & (pbp['teamTricode'] != '')]
        unique_teams = valid_teams['teamId'].unique()
        if len(unique_teams) >= 2:
            home_team_id = unique_teams[1]
        else:
            home_team_id = unique_teams[0]
    else:
        home_team_id = home_rows['teamId'].iloc[0]

    home_tricode = pbp[pbp['teamId'] == home_team_id]['teamTricode'].iloc[0]
    print(f"\nHome team ID: {home_team_id}")
    print(f"Home team: {home_tricode}\n")

    # Run feature engineering
    features = engineer_features(pbp, home_team_id=home_team_id)

    print(f"Feature rows: {len(features)}")
    print("\nFirst 10 plays with features:")
    print(features[['period', 'clock', 'seconds_remaining', 'score_diff', 'momentum', 'description']].head(10).to_string())

    print("\nLast 10 plays (end of game):")
    print(features[['period', 'clock', 'seconds_remaining', 'score_diff', 'momentum', 'description']].tail(10).to_string())

    # Save featured data
    os.makedirs("data/featured", exist_ok=True)
    game_id = raw_files[0].replace("pbp_", "").replace(".csv", "")
    out_path = f"data/featured/features_{game_id}.csv"
    features.to_csv(out_path, index=False)
    print(f"\nSaved features to {out_path}")