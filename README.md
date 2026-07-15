# NBA Analytics Platform

A full-stack web application for analyzing historical NBA games and live win probabilities. Built with a FastAPI backend, Next.js frontend, and a machine-learning powered win-probability model.

## Features
- **Historical Data**: View detailed play-by-play for historical NBA games.
- **Live Win Probability**: XGBoost machine learning model predicts live win probabilities for any state in the game.
- **Interactive UI**: View momentum shifts, score differentials, and animated win probability charts.

## Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/nba-analytics.git
cd nba-analytics
```

### 2. Environment Variables
Create a `.env` file in the `backend/` directory:
```env
# Optional: Set this to your Supabase connection string.
# Defaults to the local docker-compose postgres DB if not provided.
DATABASE_URL=postgresql://user:password@your_supabase_url:5432/postgres

# Optional: Add your Vercel or frontend URL for CORS.
FRONTEND_URL=http://localhost:3000
```

Create a `.env` file in the `frontend/` directory:
```env
# URL for the FastAPI backend (local or Render URL)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Local Database (Optional)
This repository includes a `docker-compose.yml` to spin up a local PostgreSQL database for testing/development. A `local_backup.sql` is also provided as sample data.
```bash
docker-compose up -d
```

### 4. Run the Backend
```bash
# From the root directory
# (Optional) Create and activate a virtual environment
python -m venv .venv
# Activate on Windows: .venv\Scripts\activate
# Activate on Mac/Linux: source .venv/bin/activate

pip install -r requirements.txt
cd backend
uvicorn main:app --reload
```

### 5. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```
The app will be available at [http://localhost:3000](http://localhost:3000).

---

## Deployment Guide

### Deploying the Backend (Render)
1. Create a new **Web Service** on Render.
2. Connect your GitHub repository.
3. Set the Build Command: `pip install -r requirements.txt`
4. Set the Start Command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add Environment Variables:
   - `DATABASE_URL` = (Your Supabase Database URL)
   - `FRONTEND_URL` = (Your Vercel URL, once deployed)

### Deploying the Frontend (Vercel)
1. Import your repository to Vercel.
2. The framework preset should automatically detect **Next.js**.
3. Set the Root Directory to `frontend`.
4. Add the Environment Variable:
   - `NEXT_PUBLIC_API_URL` = (Your Render backend URL)
5. Click **Deploy**.

---

## Adding More Games (Data Pipeline)
To expand the dataset with new games from the NBA API:
1. Navigate to the `data/` folder and read the [README.md](./data/README.md).
2. Use `ingest_games.py` to download raw play-by-play data.
3. Use `db_ingest.py` to process the data and insert it into your PostgreSQL database.