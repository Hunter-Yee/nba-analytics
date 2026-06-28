# data/db_ingest.py
import os
import sys
import pandas as pd
from sqlalchemy.orm import Session

# Add backend to sys.path to import db models
sys.path.append(os.path.join(os.path.dirname(__file__), "../backend"))
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
        
        # Check if game already exists
        if db.query(Game).filter(Game.id == game_id).first():
            print(f"Skipping {game_id}, already in DB.")
            continue
            
        print(f"Ingesting {game_id}...")
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
                total_plays=len(features)
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
