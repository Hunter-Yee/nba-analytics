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


if __name__ == "__main__":
    # Test: fetch Bulls' 1997-98 season games
    bulls_id = get_team_id("CHI")
    print(f"Chicago Bulls team ID: {bulls_id}")

    games = fetch_games_for_team(bulls_id, "1997-98")
    print(f"Found {len(games)} games")
    print(games[["GAME_ID", "GAME_DATE", "MATCHUP", "WL", "PTS"]].head(10))

    # Save to CSV so it can be inpsected
    os.makedirs("data/raw", exist_ok=True)
    games.to_csv("data/raw/bulls_1997_98_games.csv", index=False)
    print("Saved to data/raw/bulls_1997_98_games.csv")

    # Fetch play-by-play for the FIRST game as a test
    first_game_id = games["GAME_ID"].iloc[0]
    print(f"\nFetching play-by-play for game: {first_game_id}")
    time.sleep(1) # avoid API throttle

    pbp = fetch_play_by_play(first_game_id)
    print(f"Play-by-play rows: {len(pbp)}")
    # print(list(pbp.columns))
    print(pbp[["actionNumber", "period", "clock", "description", "scoreHome", "scoreAway"]].head(20))

    pbp.to_csv(f"data/raw/pbp_{first_game_id}.csv", index=False)
    print(f"Saved play-by-play to data/raw/pbp_{first_game_id}.csv")