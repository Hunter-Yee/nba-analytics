# data/ingest_games.py
import argparse
import os
import time
import pandas as pd
from nba_api.stats.endpoints import playbyplayv3, leaguegamefinder
from nba_api.stats.static import teams

def get_team_id(team_abbreviation: str) -> str:
    """
    Look up a team's NBA API ID by its abbreviation, e.g. 'LAL'
    """
    nba_teams = teams.get_teams()
    team = next(t for t in nba_teams if t["abbreviation"] == team_abbreviation)
    return team["id"]


def fetch_all_season_games(season: str = "2025-26", playoffs_only: bool = False) -> pd.DataFrame:
    """
    Fetch game schedule for a given NBA season.
    If playoffs_only=True, fetches Playoffs and Play-In Tournament games.
    Otherwise fetches Regular Season + Playoffs + Play-In.
    """
    season_types = ["Playoffs", "PlayIn"] if playoffs_only else ["Regular Season", "Playoffs", "PlayIn"]
    
    dfs = []
    for stype in season_types:
        try:
            print(f"Fetching game schedule for {season} ({stype})...")
            finder = leaguegamefinder.LeagueGameFinder(
                season_nullable=season,
                season_type_nullable=stype,
                league_id_nullable="00"  # NBA League ID
            )
            df = finder.get_data_frames()[0]
            if not df.empty:
                dfs.append(df)
            time.sleep(0.8)
        except Exception as e:
            print(f"Warning: Could not fetch {stype} list for {season}: {e}")
            
    if not dfs:
        return pd.DataFrame()
        
    combined = pd.concat(dfs, ignore_index=True)
    # Deduplicate by GAME_ID (LeagueGameFinder returns 2 rows per game):
    unique_games = combined.drop_duplicates(subset=["GAME_ID"]).copy()
    return unique_games


def fetch_play_by_play(game_id: str) -> pd.DataFrame:
    """
    Pull full play-by-play data for a single game
    """
    pbp = playbyplayv3.PlayByPlayV3(game_id=game_id)
    df = pbp.get_data_frames()[0]
    return df


def ingest_full_season(season: str, playoffs_only: bool = False, max_games: int = None):
    """
    Ingest games for an NBA season into data/raw/ CSV files.
    """
    raw_dir = os.path.join(os.path.dirname(__file__), "raw")
    os.makedirs(raw_dir, exist_ok=True)

    games = fetch_all_season_games(season=season, playoffs_only=playoffs_only)
    total_games = len(games)
    
    type_desc = "Playoffs & Play-In" if playoffs_only else "Regular Season + Playoffs"
    print(f"Found {total_games} total unique games ({type_desc}) for season {season}.")

    if total_games == 0:
        print(f"No games found for season {season}. Check the season format (e.g., '2025-26').")
        return

    if max_games:
        games = games.head(max_games)
        print(f"Limiting to first {max_games} games...")

    success = 0
    skipped = 0

    for i, (_, row) in enumerate(games.iterrows(), start=1):
        game_id = str(row['GAME_ID'])
        out_path = os.path.join(raw_dir, f"pbp_{game_id}.csv")

        if os.path.exists(out_path):
            skipped += 1
            continue

        try:
            matchup = row.get('MATCHUP', 'Game')
            gdate = row.get('GAME_DATE', '')
            print(f"  [{i}/{len(games)}] Fetching {game_id} — {matchup} ({gdate})...")
            pbp = fetch_play_by_play(game_id)
            pbp.to_csv(out_path, index=False)
            success += 1
            print(f"         Saved {len(pbp)} plays")
        except Exception as e:
            print(f"         Failed {game_id}: {e}")

        time.sleep(0.8)  # NBA API rate limit protection

    print(f"\nDone! Ingested {success} new games ({skipped} skipped as already existing).")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest NBA games and play-by-play data.")
    parser.add_argument("--season", type=str, default="2025-26", help="NBA Season in YYYY-YY format, e.g. 2025-26")
    parser.add_argument("--playoffs-only", action="store_true", help="Ingest only Playoffs & Play-In games")
    parser.add_argument("--max-games", type=int, default=None, help="Limit number of games to download")
    args = parser.parse_args()

    print(f"\n{'='*50}")
    desc = "Playoffs & Play-In" if args.playoffs_only else "Full Season (Regular Season + Playoffs)"
    print(f"Ingesting {desc}: {args.season}")
    print(f"{'='*50}\n")

    ingest_full_season(season=args.season, playoffs_only=args.playoffs_only, max_games=args.max_games)