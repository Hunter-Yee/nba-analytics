# backend/routers/predict.py
from fastapi import APIRouter, HTTPException
from schemas import PredictRequest, PredictResponse
from model import win_prob_model
import numpy as np

router = APIRouter(prefix="/predict", tags=["prediction"])

@router.post("/win-probability", response_model=PredictResponse)
def predict_win_probability(request: PredictRequest):
    """
    Given a game state snapshot, return win probability for both teams.

    Example request body:
    {
        "seconds_remaining": 120,
        "score_diff": 5,
        "momentum": 3,
        "period": 4,
        "is_overtime": 0
    }
    """
    try:
        return win_prob_model.predict(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/win-probability/batch", response_model=list[PredictResponse])
def predict_batch(requests: list[PredictRequest]):
    """
    Predict win probability for a list of game states at once.
    This is what the frontend calls when loading a full game replay —
    it sends all plays at once and gets all probabilities back in one shot,
    rather than making hundreds of individual requests.
    """
    if len(requests) > 1000:
        raise HTTPException(
            status_code=400,
            detail="Batch size too large. Maximum 1000 plays per request."
        )
    try:
        return [win_prob_model.predict(r) for r in requests]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))