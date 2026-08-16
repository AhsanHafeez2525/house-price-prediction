"""Train a house-price regressor, evaluate on a holdout set, save model.pkl."""

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "processed" / "houses_clean.csv"
ARTIFACT_PATH = ROOT / "ml" / "artifacts" / "model.pkl"

TARGET_COL = "price"
FEATURE_COLS = [
    "area_sqft",
    "bedrooms",
    "bathrooms",
    "age_years",
    "waterfront",
    "floors",
    "condition",
    "grade",
]

RANDOM_STATE = 42
TEST_SIZE = 0.2


def load_xy(path: Path = DATA_PATH) -> tuple[pd.DataFrame, pd.Series]:
    if not path.exists():
        raise FileNotFoundError(
            f"Processed CSV not found: {path}. Run python ml/clean_data.py first."
        )
    df = pd.read_csv(path)
    missing = [c for c in FEATURE_COLS + [TARGET_COL] if c not in df.columns]
    if missing:
        raise KeyError(f"Processed CSV missing columns: {missing}")
    X = df[FEATURE_COLS]
    y = df[TARGET_COL]
    print(f"Loaded {path.relative_to(ROOT)} — shape={df.shape}")
    return X, y


def build_model() -> Pipeline:
    # RandomForest needs no scaler; Pipeline keeps a single loadable artifact for the API.
    return Pipeline(
        steps=[
            (
                "model",
                RandomForestRegressor(
                    n_estimators=100,
                    max_depth=16,
                    min_samples_leaf=2,
                    n_jobs=-1,
                    random_state=RANDOM_STATE,
                ),
            )
        ]
    )


def metrics(y_true: pd.Series | np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    mae = mean_absolute_error(y_true, y_pred)
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    r2 = r2_score(y_true, y_pred)
    return {"MAE": mae, "RMSE": rmse, "R2": r2}


def format_metrics(label: str, m: dict[str, float]) -> str:
    return f"{label} MAE={m['MAE']:,.2f}, RMSE={m['RMSE']:,.2f}, R2={m['R2']:.4f}"


def main() -> None:
    X, y = load_xy()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE
    )
    print(f"Train={len(X_train)}, Test={len(X_test)} (test_size={TEST_SIZE})")

    model = build_model()
    model.fit(X_train, y_train)

    train_m = metrics(y_train, model.predict(X_train))
    test_m = metrics(y_test, model.predict(X_test))
    print(format_metrics("Train", train_m))
    print(format_metrics("Test", test_m))
    gap = train_m["R2"] - test_m["R2"]
    print(f"Train−Test R2 gap={gap:.4f} (large gap → possible overfitting)")

    ARTIFACT_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, ARTIFACT_PATH)
    print(f"Saved {ARTIFACT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
