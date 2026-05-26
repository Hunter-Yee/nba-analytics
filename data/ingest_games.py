# data/ingest_games.py
from nba_api.stats.endpoints import playbyplayv3, leaguegamefinder
from nba_api.stats.static import teams
import pandas as pd
import time
import os

def get_team_id(team_abbreviation: str) -> str:
    """
    Look up a team's NBA API ID by its abbreviation, e.g. 'LAL'
    """
    nba_teams = teams.get_teams()
    team = next(t for t in nba_teams if t["abbreviation"] == team_abbreviation)
    return team["id"]


def fetch_games_for_team(team_id: str, season: str = "1997-98") -> pd.DataFrame:
    """
    Pull all games for a team in a given season, e.g. '1997-98'
    """
    finder = leaguegamefinder.LeagueGameFinder(
        team_id_nullable=team_id,
        season_nullable=season,
        season_type_nullable="Regular Season"
    )
    games = finder.get_data_frames()[0]
    return games


def fetch_play_by_play(game_id: str) -> pd.DataFrame:
    """
    Pull full play-by-play data for a single game
    game_id is always a 10-digit string
    """
    pbp = playbyplayv3.PlayByPlayV3(game_id=game_id)
    df = pbp.get_data_frames()[0]
    return df


def ingest_season_batch(team_abbreviation: str, season: str, max_games: int = 30):
    """
    Pull play-by-play for up to `max_games` games from one team's season.
    Saves each game as a CSV in data/raw/.
    """
    team_id = get_team_id(team_abbreviation)
    games = fetch_games_for_team(team_id, season)
    
    print(f"Found {len(games)} games for {team_abbreviation} {season}")
    print(f"Ingesting up to {max_games} games...\n")

    success = 0
    for i, row in games.head(max_games).iterrows():
        game_id = str(row['GAME_ID'])
        out_path = f"data/raw/pbp_{game_id}.csv"

        # Skip if already downloaded
        if os.path.exists(out_path):
            print(f"  [{i+1}] Already have {game_id}, skipping")
            continue

        try:
            print(f"  [{i+1}] Fetching {game_id} — {row['MATCHUP']} {row['GAME_DATE']}...")
            pbp = fetch_play_by_play(game_id)
            pbp.to_csv(out_path, index=False)
            success += 1
            print(f"         Saved {len(pbp)} plays")
        except Exception as e:
            print(f"         Failed: {e}")

        time.sleep(0.8)  # stay under rate limit

    print(f"\nDone. {success} new games saved to data/raw/")


if __name__ == "__main__":
    os.makedirs("data/raw", exist_ok=True)

    # Pull 30 games each from a few different teams and seasons
    # This gives us variety — different eras, play styles, outcomes
    batches = [
        ("CHI", "1997-98", 30),   # Jordan's last Bulls championship season
        ("LAL", "2000-01", 30),   # Shaq/Kobe Lakers
        ("GSW", "2015-16", 30),   # 73-win Warriors season
        ("CLE", "2015-16", 30),   # LeBron's Cavs — same season, different team
    ]

    for team, season, max_g in batches:
        print(f"\n{'='*50}")
        print(f"Ingesting {team} {season}")
        print(f"{'='*50}")
        ingest_season_batch(team, season, max_games=max_g)