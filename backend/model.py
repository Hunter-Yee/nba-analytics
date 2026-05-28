# backend/model.py
import pickle
import numpy as np
import os
from schemas import PredictRequest, PredictResponse

# Path to the model file — adjust if your folder structure differs
MODEL_PATH = os.path.join(os.path.dirname(__file__), "../ml/win_probability_model.pkl")

class WinProbabilityModel:
    """
    Wrapper around the trained XGBoost model.
    Loads once at startup, stays in memory, handles all predictions.
    """

    def __init__(self):
        self.model = None
        self.feature_cols = None
        self._load()

    def _load(self):
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"Model not found at {MODEL_PATH}. "
                "Run data/train_model.py first."
            )
        with open(MODEL_PATH, "rb") as f:
            data = pickle.load(f)

        self.model = data['xgb_model']
        self.feature_cols = data['feature_cols']
        print(f"Model loaded. Features: {self.feature_cols}")

    def predict(self, request: PredictRequest) -> PredictResponse:
        """Run one prediction and return structured response."""
        X = np.array([[
            request.seconds_remaining,
            request.score_diff,
            request.momentum,
            request.period,
            request.is_overtime,
        ]])

        prob_home = float(self.model.predict_proba(X)[0][1])
        prob_away = round(1.0 - prob_home, 4)
        prob_home = round(prob_home, 4)

        return PredictResponse(
            home_win_probability=prob_home,
            away_win_probability=prob_away,
            seconds_remaining=request.seconds_remaining,
            score_diff=request.score_diff,
        )

# Single global instance — loaded once when the server starts
win_prob_model = WinProbabilityModel()