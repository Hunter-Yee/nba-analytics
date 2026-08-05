# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from routers import games, predict

app = FastAPI(
    title="NBA Analytics API",
    description="Win probability modeling and game replay for historical NBA games",
    version="0.1.0",
)

# CORS — allows your React frontend (localhost:3000) or Vercel URL to call this API
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
origins = [
    frontend_url,
    "http://localhost:3000",
    "http://localhost:3001"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://nba-analytics-dusky.vercel.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(games.router)
app.include_router(predict.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "NBA Analytics API is running"}
