# Data Pipeline

This folder contains scripts to ingest new NBA play-by-play data and save it to the Supabase database.

### How to Add More Games

1. **Ingest Raw Data:**
   Run `ingest_games.py` to fetch play-by-play data from the NBA API and save it as CSV files in `data/raw/`.
   You can modify the `batches` list at the bottom of the script to fetch different teams and seasons.
   ```bash
   python data/ingest_games.py
   ```

2. **Process and Upload to Database:**
   Run `db_ingest.py` to parse the CSVs, engineer features (like win probability data), and upload the game and play records to the PostgreSQL/Supabase database.
   ```bash
   python data/db_ingest.py
   ```

*(Note: The ML model training scripts `features.py` and `train_model.py` have been moved to the `ml/` directory).*
