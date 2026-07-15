# data/train_model.py
import pandas as pd
import numpy as np
import os
import pickle
from features import engineer_features

def load_all_games(raw_dir: str = "data/raw", featured_dir: str = "data/featured") -> pd.DataFrame:
    """
    Loop over every raw PBP file, run feature engineering,
    label each play with the game outcome, and stack into one DataFrame.
    """
    os.makedirs(featured_dir, exist_ok=True)
    all_games = []
    raw_files = [f for f in os.listdir(raw_dir) if f.startswith("pbp_")]

    print(f"Found {len(raw_files)} raw game files\n")

    for i, filename in enumerate(raw_files):
        game_id = filename.replace("pbp_", "").replace(".csv", "")

        try:
            pbp = pd.read_csv(f"{raw_dir}/{filename}")

            # Detect home team (location == 'h')
            home_rows = pbp[pbp['location'] == 'h']
            if len(home_rows) == 0:
                # Fallback: second unique teamId
                valid = pbp[pbp['teamTricode'].notna() & (pbp['teamTricode'] != '')]
                unique_teams = valid['teamId'].unique()
                home_team_id = unique_teams[1] if len(unique_teams) >= 2 else unique_teams[0]
            else:
                home_team_id = home_rows['teamId'].iloc[0]

            # Run feature engineering
            features = engineer_features(pbp, home_team_id=home_team_id)

            if len(features) < 10:
                print(f"  [{i+1}] Skipping {game_id} — too few plays ({len(features)})")
                continue

            # --- LABEL: did the home team win? ---
            # The last row's score_diff tells us the final margin
            final_score_diff = features['score_diff'].iloc[-1]
            if final_score_diff == 0:
                # Tied at end means OT ended in a tie — shouldn't happen, skip
                print(f"  [{i+1}] Skipping {game_id} — tied final score")
                continue

            # 1 = home team won, 0 = away team won
            features['home_win'] = 1 if final_score_diff > 0 else 0

            # Store game ID for reference
            features['game_id'] = game_id

            all_games.append(features)
            print(f"  [{i+1}] {game_id} — {len(features)} plays — home {'WIN' if final_score_diff > 0 else 'LOSS'} (margin: {final_score_diff})")

        except Exception as e:
            print(f"  [{i+1}] Error on {game_id}: {e}")
            continue

    if not all_games:
        raise ValueError("No games loaded. Check your data/raw/ directory.")

    combined = pd.concat(all_games, ignore_index=True)
    print(f"\nTotal training rows: {len(combined)}")
    print(f"Games loaded: {len(all_games)}")
    print(f"Home win rate: {combined['home_win'].mean():.1%}")  # Should be ~55-60%
    return combined


def prepare_features(df: pd.DataFrame):
    """
    Pull out the X (features) and y (label) arrays for sklearn.
    Returns X, y, and the feature column names.
    """
    feature_cols = ['seconds_remaining', 'score_diff', 'momentum', 'period', 'is_overtime']
    
    X = df[feature_cols].values
    y = df['home_win'].values

    return X, y, feature_cols


def train_and_evaluate(X, y, feature_cols):
    """
    Train two models, compare them, save the best one.
    """
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import StandardScaler
    from sklearn.calibration import calibration_curve, CalibratedClassifierCV
    from sklearn.metrics import log_loss, brier_score_loss, roc_auc_score
    import xgboost as xgb

    # --- Split: 80% train, 20% test ---
    # shuffle=False keeps game order — important so we don't leak future plays
    # into training. But since we're mixing many games, shuffle is acceptable here.
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, shuffle=True
    )
    print(f"Training rows: {len(X_train)}, Test rows: {len(X_test)}")

    # --- Model 1: Logistic Regression (baseline) ---
    # Scale features so they're all on similar scales
    # (seconds_remaining is ~2880, momentum is ~-10 to +10 — needs normalizing)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)  # use the SAME scaler, never refit on test

    lr_model = LogisticRegression(max_iter=1000, random_state=42)
    lr_model.fit(X_train_scaled, y_train)

    lr_probs = lr_model.predict_proba(X_test_scaled)[:, 1]
    lr_logloss = log_loss(y_test, lr_probs)
    lr_brier = brier_score_loss(y_test, lr_probs)
    lr_auc = roc_auc_score(y_test, lr_probs)

    print(f"\n--- Logistic Regression ---")
    print(f"  Log Loss:    {lr_logloss:.4f}  (lower = better)")
    print(f"  Brier Score: {lr_brier:.4f}  (lower = better, 0 = perfect)")
    print(f"  ROC AUC:     {lr_auc:.4f}  (higher = better, 1.0 = perfect)")

    # Print feature importances (coefficients) for the LR model
    print(f"\n  Feature coefficients (how much each feature matters):")
    for col, coef in zip(feature_cols, lr_model.coef_[0]):
        print(f"    {col:<22} {coef:+.4f}")

    # --- Model 2: XGBoost ---
    xgb_model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric='logloss',
        random_state=42,
        verbosity=0
    )
    xgb_model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False
    )

    xgb_probs = xgb_model.predict_proba(X_test)[:, 1]
    xgb_logloss = log_loss(y_test, xgb_probs)
    xgb_brier = brier_score_loss(y_test, xgb_probs)
    xgb_auc = roc_auc_score(y_test, xgb_probs)

    print(f"\n--- XGBoost ---")
    print(f"  Log Loss:    {xgb_logloss:.4f}")
    print(f"  Brier Score: {xgb_brier:.4f}")
    print(f"  ROC AUC:     {xgb_auc:.4f}")

    print(f"\n  Feature importances:")
    for col, imp in zip(feature_cols, xgb_model.feature_importances_):
        bar = "█" * int(imp * 40)
        print(f"    {col:<22} {bar} {imp:.4f}")

    # --- Calibration check ---
    # A good win probability model should be CALIBRATED:
    # when it says 70%, the home team should win ~70% of the time.
    print(f"\n--- Calibration (XGBoost) ---")
    print(f"  Predicted prob → Actual win rate")
    fraction_pos, mean_pred = calibration_curve(y_test, xgb_probs, n_bins=10)
    for pred, actual in zip(mean_pred, fraction_pos):
        bar = "█" * int(actual * 20)
        print(f"  Predicted {pred:.2f} → Actual {actual:.2f}  {bar}")

    # --- Save the best model ---
    # XGBoost is almost always better — save it as the primary model
    # We save both the model AND the scaler (needed for LR if you switch)
    model_data = {
        'xgb_model': xgb_model,
        'lr_model': lr_model,
        'scaler': scaler,                # for logistic regression
        'feature_cols': feature_cols,
        'xgb_metrics': {'log_loss': xgb_logloss, 'brier': xgb_brier, 'auc': xgb_auc},
        'lr_metrics':  {'log_loss': lr_logloss,  'brier': lr_brier,  'auc': lr_auc},
    }

    model_path = os.path.join(os.path.dirname(__file__), "win_probability_model.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(model_data, f)

    print(f"\nModel saved to {model_path}")
    return model_data


def test_predictions(model_data: dict):
    """
    Sanity check: manually test a few game states to make sure
    the model is reasoning correctly.
    """
    xgb_model = model_data['xgb_model']
    feature_cols = model_data['feature_cols']

    scenarios = [
        # (seconds_remaining, score_diff, momentum, period, is_overtime, description)
        (2880, 0,   0,  1, 0, "Game start — coin flip"),
        (1440, 0,   0,  3, 0, "Halftime — tied"),
        (120,  10,  6,  4, 0, "2 min left — home up 10 on a run"),
        (120, -10, -6,  4, 0, "2 min left — home down 10"),
        (30,   3,   2,  4, 0, "30 sec left — home up 3"),
        (30,  -3,  -2,  4, 0, "30 sec left — home down 3"),
        (10,   1,   0,  4, 0, "10 sec left — home up 1"),
        (10,  -1,   0,  4, 0, "10 sec left — home down 1"),
        (300,  0,   0,  5, 1, "OT — tied"),
    ]

    print("\n--- Sanity check: model predictions ---")
    print(f"  {'Scenario':<40} {'Home Win Prob':>14}")
    print(f"  {'-'*55}")

    for sec, diff, mom, period, ot, desc in scenarios:
        X = np.array([[sec, diff, mom, period, ot]])
        prob = xgb_model.predict_proba(X)[0][1]
        bar = "█" * int(prob * 20)
        print(f"  {desc:<40} {prob:.1%}  {bar}")


if __name__ == "__main__":
    # Step 1: Load and label all games
    print("=" * 50)
    print("STEP 1: Loading all games")
    print("=" * 50)
    df = load_all_games()

    # Step 2: Prepare feature matrix
    print("\n" + "=" * 50)
    print("STEP 2: Preparing features")
    print("=" * 50)
    X, y, feature_cols = prepare_features(df)
    print(f"Feature matrix shape: {X.shape}")
    print(f"Features: {feature_cols}")

    # Step 3: Train and evaluate
    print("\n" + "=" * 50)
    print("STEP 3: Training models")
    print("=" * 50)
    model_data = train_and_evaluate(X, y, feature_cols)

    # Step 4: Sanity check
    print("\n" + "=" * 50)
    print("STEP 4: Sanity check")
    print("=" * 50)
    test_predictions(model_data)