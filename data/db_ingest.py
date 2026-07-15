# data/db_ingest.py
import os
import sys
import time
import pandas as pd
from nba_api.stats.endpoints import boxscoresummaryv2
from sqlalchemy.orm import Session
from sqlalchemy.orm import Session

# Add backend and ml to sys.path to import db models and features
sys.path.append(os.path.join(os.path.dirname(__file__), "../backend"))
sys.path.append(os.path.join(os.path.dirname(__file__), "../ml"))
from database import SessionLocal
from models_db import Team, Game, Play
from features import engineer_features

RAW_DIR = os.path.join(os.path.dirname(__file__), "raw")

def ingest_csvs_to_db():
    db: Session = SessionLocal()
    raw_files = [f for f in os.listdir(RAW_DIR) if f.startswith("pbp_")]
    
    print(f"Found {len(raw_files)} games to ingest.")
    
    for filename in raw_files:
        game_id = filename.replace("pbp_", "").replace(".csv", "")
        
        # Check if game already exists and has season
        existing = db.query(Game).filter(Game.id == game_id).first()
        if existing and existing.season:
            print(f"Skipping {game_id}, already in DB with metadata.")
            continue
            
        print(f"Ingesting/Updating {game_id}...")
        
        # Parse season and season_type from game_id
        # e.g., 0021500855
        # [0:2] = 00
        # [2] = 2 (Season type: 1=Preseason, 2=Regular, 3=All-Star, 4=Playoffs, 5=Play-In)
        # [3:5] = 15 (Year)
        type_map = {'1': 'Preseason', '2': 'Regular Season', '3': 'All-Star', '4': 'Playoffs', '5': 'Play-In'}
        season_type = type_map.get(game_id[2], 'Unknown')
        
        year_suffix = int(game_id[3:5])
        start_year = 2000 + year_suffix if year_suffix < 90 else 1900 + year_suffix
        season = f"{start_year}-{str(start_year+1)[-2:]}"
        
        # Fetch date from NBA API
        game_date = None
        try:
            summary = boxscoresummaryv2.BoxScoreSummaryV2(game_id=game_id)
            df_sum = summary.game_summary.get_data_frame()
            if not df_sum.empty:
                raw_date = df_sum['GAME_DATE_EST'].iloc[0] # e.g. 2001-02-21T00:00:00
                game_date = raw_date.split('T')[0]
            time.sleep(0.6) # rate limit
        except Exception as e:
            print(f"Warning: Could not fetch date for {game_id}: {repr(e)}")
            time.sleep(1)

        # If it exists but was missing metadata, just update it and continue
        if existing:
            existing.season = season
            existing.season_type = season_type
            existing.game_date = game_date
            db.commit()
            print(f"Updated metadata for {game_id}.")
            continue

        try:
            pbp = pd.read_csv(os.path.join(RAW_DIR, filename))
            
            # Detect home team
            home_rows = pbp[pbp['location'] == 'h']
            if len(home_rows) == 0:
                valid = pbp[pbp['teamTricode'].notna() & (pbp['teamTricode'] != '')]
                unique_teams = valid['teamId'].unique()
                home_team_id = str(unique_teams[1] if len(unique_teams) >= 2 else unique_teams[0])
            else:
                home_team_id = str(home_rows['teamId'].iloc[0])
                
            valid_teams = pbp[pbp['teamTricode'].notna() & (pbp['teamTricode'] != '')]
            tricodes = valid_teams.drop_duplicates('teamId')[['teamId', 'teamTricode']]
            home_tricode = tricodes[tricodes['teamId'] == int(home_team_id)]['teamTricode'].values[0]
            away_row = tricodes[tricodes['teamId'] != int(home_team_id)]
            
            if len(away_row) > 0:
                away_team_id = str(away_row['teamId'].values[0])
                away_tricode = away_row['teamTricode'].values[0]
            else:
                continue # Bad data
                
            # Insert teams if missing
            if not db.query(Team).filter(Team.id == home_team_id).first():
                db.add(Team(id=home_team_id, tricode=home_tricode))
            if not db.query(Team).filter(Team.id == away_team_id).first():
                db.add(Team(id=away_team_id, tricode=away_tricode))
            db.commit()
            
            # Engineer features
            features = engineer_features(pbp, home_team_id=int(home_team_id))
            
            if len(features) < 10:
                continue
                
            final_home = int(features['scoreHome'].iloc[-1])
            final_away = int(features['scoreAway'].iloc[-1])
            home_win = int(features['score_diff'].iloc[-1]) > 0
            
            # Insert Game
            game_record = Game(
                id=game_id,
                home_team_id=home_team_id,
                away_team_id=away_team_id,
                home_score=final_home,
                away_score=final_away,
                home_win=home_win,
                total_plays=len(features),
                season=season,
                season_type=season_type,
                game_date=game_date
            )
            db.add(game_record)
            db.commit()

            
            # Insert Plays
            plays_to_insert = []
            for _, row in features.iterrows():
                plays_to_insert.append(Play(
                    game_id=game_id,
                    action_number=int(row.get('actionNumber', 0)),
                    period=int(row['period']),
                    clock=str(row.get('clock', '')),
                    seconds_remaining=float(row['seconds_remaining']),
                    score_home=int(row.get('scoreHome', 0)),
                    score_away=int(row.get('scoreAway', 0)),
                    score_diff=int(row['score_diff']),
                    momentum=float(row['momentum']),
                    description=str(row.get('description', '')),
                    action_type=str(row.get('actionType', '')),
                    player_name=str(row.get('playerName', '')),
                    team_tricode=str(row.get('teamTricode', ''))
                ))
            db.bulk_save_objects(plays_to_insert)
            db.commit()
            
        except Exception as e:
            db.rollback()
            print(f"Error ingesting {game_id}: {repr(e)}")

    db.close()
    print("Ingestion complete.")

if __name__ == "__main__":
    ingest_csvs_to_db()
