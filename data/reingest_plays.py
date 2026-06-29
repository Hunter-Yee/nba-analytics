import os
import sys
import pandas as pd
from sqlalchemy.orm import Session

sys.path.append(os.path.join(os.path.dirname(__file__), "../backend"))
from database import SessionLocal
from models_db import Game, Play
from features import engineer_features

def reingest_plays():
    db: Session = SessionLocal()
    RAW_DIR = "raw"
    
    print("Deleting all plays...")
    db.query(Play).delete()
    db.commit()
    print("Plays deleted. Re-ingesting...")
    
    raw_files = [f for f in os.listdir(RAW_DIR) if f.startswith("pbp_")]
    
    for filename in raw_files:
        game_id = filename.replace("pbp_", "").replace(".csv", "")
        
        game = db.query(Game).filter(Game.id == game_id).first()
        if not game:
            continue
            
        print(f"Processing {game_id}...")
        try:
            pbp = pd.read_csv(os.path.join(RAW_DIR, filename))
            features = engineer_features(pbp, home_team_id=int(game.home_team_id))
            
            if len(features) < 10:
                continue
                
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
            
            # Update total plays in game
            game.total_plays = len(features)
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Error on {game_id}: {e}")
            
    print("Done!")

if __name__ == "__main__":
    reingest_plays()
