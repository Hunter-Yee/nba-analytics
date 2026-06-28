# backend/routers/games.py
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from schemas import GameSummary, GameDetailResponse, Play as PlaySchema
from database import get_db
from models_db import Game, Play, Team

router = APIRouter(prefix="/games", tags=["games"])


@router.get("/", response_model=list[GameSummary])
def list_games(
    season: str = None,
    season_type: str = None,
    team: str = None,
    search: str = None,
    db: Session = Depends(get_db)
):
    """
    Return a list of all available games from the database.
    This is extremely fast compared to reading CSVs.
    """
    query = db.query(Game)
    
    if season:
        query = query.filter(Game.season == season)
    if season_type:
        query = query.filter(Game.season_type == season_type)
    if team and team != "All Teams":
        query = query.filter((Game.home_team_id == team) | (Game.away_team_id == team) | (Game.home_team.has(tricode=team)) | (Game.away_team.has(tricode=team)))
    
    games = query.all()
    
    if search:
        search_lower = search.lower()
        games = [g for g in games if search_lower in g.home_team.tricode.lower() or search_lower in g.away_team.tricode.lower() or search_lower in (g.game_date or "").lower()]
    
    summaries = []
    for g in games:
        summaries.append(GameSummary(
            game_id=g.id,
            home_team=g.home_team.tricode,
            away_team=g.away_team.tricode,
            home_score=g.home_score,
            away_score=g.away_score,
            home_win=g.home_win,
            total_plays=g.total_plays,
            season=g.season,
            season_type=g.season_type,
            game_date=g.game_date,
        ))
        
    # Sort by game_id descending (newest first)
    return sorted(summaries, key=lambda g: g.game_id, reverse=True)


@router.get("/{game_id}", response_model=GameDetailResponse)
def get_game(game_id: str, db: Session = Depends(get_db)):
    """
    Return full play-by-play data for a single game from the database.
    """
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail=f"Game {game_id} not found")

    plays_db = db.query(Play).filter(Play.game_id == game_id).order_by(Play.id).all()
    
    plays = []
    for p in plays_db:
        plays.append(PlaySchema(
            action_number=p.action_number,
            period=p.period,
            clock=p.clock,
            seconds_remaining=p.seconds_remaining,
            score_home=p.score_home,
            score_away=p.score_away,
            score_diff=p.score_diff,
            momentum=p.momentum,
            description=p.description,
            action_type=p.action_type,
            player_name=p.player_name,
            team_tricode=p.team_tricode,
        ))

    return GameDetailResponse(
        game_id=game.id,
        home_team=game.home_team.tricode,
        away_team=game.away_team.tricode,
        home_score=game.home_score,
        away_score=game.away_score,
        home_win=game.home_win,
        plays=plays,
    )