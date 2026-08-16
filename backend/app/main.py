"""FastAPI service that loads model.pkl and serves house-price predictions."""

from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = ROOT / "ml" / "artifacts" / "model.pkl"

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

model: Any = None


class HouseFeatures(BaseModel):
    """Request body — must match training features in ml/FEATURES.md."""

    area_sqft: float = Field(..., gt=0, description="Living area in square feet")
    bedrooms: float = Field(..., ge=0)
    bathrooms: float = Field(..., ge=0)
    age_years: float = Field(..., ge=0, description="Years since construction at sale")
    waterfront: int = Field(..., ge=0, le=1)
    floors: float = Field(..., gt=0)
    condition: int = Field(..., ge=1, le=5)
    grade: int = Field(..., ge=1, le=13)


class PredictResponse(BaseModel):
    predicted_price: float


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global model
    if MODEL_PATH.exists():
        model = joblib.load(MODEL_PATH)
    else:
        model = None
    yield
    model = None


app = FastAPI(title="House Price Prediction API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", model_loaded=model is not None)


@app.post("/predict", response_model=PredictResponse)
def predict(features: HouseFeatures) -> PredictResponse:
    if model is None:
        raise HTTPException(
            status_code=503,
            detail=f"Model not loaded. Train first (python ml/train.py); expected {MODEL_PATH}",
        )
    row = pd.DataFrame([{col: getattr(features, col) for col in FEATURE_COLS}])
    predicted = float(model.predict(row)[0])
    return PredictResponse(predicted_price=predicted)
