# 🏀 NBA Live Win Probability & Analytics Platform

> **Live Application:** [nba-analytics-dusky.vercel.app](https://nba-analytics-dusky.vercel.app/)

---

## 🎯 Purpose & Motivation

This project was built to combine my passion for **NBA basketball, sports statistics, data science, computer science, and machine learning**.

Basketball is fundamentally a game of dynamic momentum and rapid score swings. Standard box scores summarize *who* won, but they fail to capture the story of *how* win probability fluctuates with every defensive stop, lead change, turnover, and late-game possession.

The mission of this platform is to:
1. **Model in-game dynamics**: Quantify win probability dynamically at any exact play or second in a contest using supervised machine learning.
2. **Deliver intuitive visualization**: Allow fans, analysts, and developers to scrub through an interactive play-by-play timeline and observe real time probability shifts and momentum runs.
3. **Build an end-to-end production architecture**: Demonstrate a complete modern data lifecycle, from raw NBA API extraction and feature engineering to a cloud-native microservice architecture serving ML inference at scale.

---

## ⚡ What the Platform Does

- **Interactive Game Replay & Scrubber**: Step through full historical NBA games play-by-play with synchronized scoreboards, game clocks, and play descriptions.
- **Dynamic Win Probability Graph**: Visualizes real time home vs. away win percentages throughout the entire game.
- **Momentum & Score Differential Tracking**: Monitors in-game scoring runs and score margins to display which team controls game tempo.
- **Game Library & Filtering**: Filter and search games across seasons, regular season vs. playoffs, and specific NBA franchises.

---

## 🧠 How It Works: In-Depth Architecture & FAQ

### *Is win probability pre-calculated in the database or computed on the fly?*
**It is calculated dynamically on-the-fly by an in-memory XGBoost model.**

Here is the exact data & inference lifecycle:

```text
[User Selects Game]
       │
       ▼
[Next.js Frontend (Vercel)] ──▶ GET /games/{id} ──▶ [FastAPI (Render)]
                                                         │
                                             Check Redis Cache
                                              ├── HIT: Return cached plays
                                              └── MISS: Query Supabase Postgres
       │
       ▼
[Frontend receives play-by-play states]
       │
       ▼
[Frontend sends batch payload] ──▶ POST /predict/win-probability/batch
                                                         │
                                               [XGBoost Model (In-Memory)]
                                               Runs batch vector inference:
                                               - seconds_remaining
                                               - score_diff
                                               - momentum
                                               - period
                                               - is_overtime
                                                        │
                                                        ▼
[Frontend renders probability curve & interactive timeline]
```

1. **Database Layer (Supabase PostgreSQL)**: Stores structured historical play-by-play states (action number, clock, team tricode, scores, descriptions, and calculated momentum metrics). It **does not** store static win probabilities.
2. **In-Memory ML Inference (FastAPI)**: At server startup, the serialized XGBoost model (`.pkl`) is loaded directly into backend memory. When a game is loaded, the client dispatches a batch request to `/predict/win-probability/batch`. The model processes all game states simultaneously using vectorized NumPy arrays, providing sub-millisecond per-play inference.
3. **High-Performance Caching (Redis)**: Game metadata (`/games/`) and individual game play-by-play responses (`/games/{id}`) are cached using `fastapi-cache2` backed by Redis. This drastically cuts down cold-read latency and spares Supabase query quotas.

---

## 🛠️ Tech Stack & Infrastructure

### **Frontend**
- **Framework**: [Next.js](https://nextjs.org/) (React)
- **Styling**: Tailwind CSS
- **Visualization**: Recharts for responsive probability & momentum curves
- **Hosting**: [Vercel](https://vercel.com/) (Edge network delivery)

### **Backend & Machine Learning**
- **API Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **ML Engine**: [XGBoost](https://xgboost.readthedocs.io/), Scikit-Learn, NumPy, Pandas
- **ORM & Migrations**: SQLAlchemy & Alembic
- **Caching**: Redis via `fastapi-cache2` (asynchronous caching with graceful fallback resilience)
- **Hosting**: [Render](https://render.com/)

### **Database & Data Pipeline**
- **Database**: [Supabase](https://supabase.com/) (Managed PostgreSQL)
- **Data Source**: NBA Stats API (`nba_api`)
- **Pipeline Scripts**: Custom Python extractors for play-by-play ingestion and rolling momentum calculations.

---

## 📈 Machine Learning Details

The model is an **XGBoost Classifier** trained on historical NBA play-by-play transitions.

### Features
| Feature | Description |
| :--- | :--- |
| `seconds_remaining` | Total regulation/overtime seconds remaining in the game. |
| `score_diff` | Score differential from the perspective of the home team (`home_score - away_score`). |
| `momentum` | Rolling net score differential over the preceding sequence of plays. |
| `period` | Current game quarter (1–4) or overtime period (5+). |
| `is_overtime` | Binary flag (0 or 1) indicating if the game is in an overtime period. |

---

## 🔄 Data Pipeline & Adding Games

The codebase includes an extensible pipeline in the `data/` directory to expand the database with new seasons and games:
1. **`ingest_games.py`**: Interacts with the NBA API to fetch raw play-by-play JSON logs for specified game IDs or schedules.
2. **Feature Engineering**: Calculates rolling momentum, remaining seconds, and possession tracking.
3. **`db_ingest.py`**: Validates schemas and bulk-inserts game headers and play-by-play rows into the Supabase PostgreSQL database.

---

## 💻 Local Development

<details>
<summary>Click to view local development instructions</summary>

### Prerequisites
- Python 3.10+
- Node.js 18+
- Docker (optional for local DB)

### 1. Backend Setup
```bash
git clone https://github.com/yourusername/nba-analytics.git
cd nba-analytics

python -m venv .venv
source .venv/bin/activate # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Configure backend/.env with DATABASE_URL and REDIS_URL
cd backend
uvicorn main:app --reload
```

### 2. Frontend Setup
```bash
cd ../frontend
npm install
# Configure frontend/.env with NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```
</details>