# backend/models_db.py
from sqlalchemy import Boolean, Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Team(Base):
    __tablename__ = "teams"

    id = Column(String, primary_key=True, index=True) # e.g. "1610612747"
    tricode = Column(String, unique=True, index=True) # e.g. "LAL"

    # Relationships
    home_games = relationship("Game", foreign_keys="[Game.home_team_id]", back_populates="home_team")
    away_games = relationship("Game", foreign_keys="[Game.away_team_id]", back_populates="away_team")


class Game(Base):
    __tablename__ = "games"

    id = Column(String, primary_key=True, index=True) # e.g. "0020000777"
    home_team_id = Column(String, ForeignKey("teams.id"))
    away_team_id = Column(String, ForeignKey("teams.id"))
    home_score = Column(Integer)
    away_score = Column(Integer)
    home_win = Column(Boolean)
    total_plays = Column(Integer)
    
    # Relationships
    home_team = relationship("Team", foreign_keys=[home_team_id], back_populates="home_games")
    away_team = relationship("Team", foreign_keys=[away_team_id], back_populates="away_games")
    plays = relationship("Play", back_populates="game", cascade="all, delete")


class Play(Base):
    __tablename__ = "plays"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(String, ForeignKey("games.id"))
    action_number = Column(Integer)
    period = Column(Integer)
    clock = Column(String)
    seconds_remaining = Column(Float)
    score_home = Column(Integer)
    score_away = Column(Integer)
    score_diff = Column(Integer)
    momentum = Column(Float)
    description = Column(String)
    action_type = Column(String)
    player_name = Column(String)
    team_tricode = Column(String)

    # Relationships
    game = relationship("Game", back_populates="plays")
