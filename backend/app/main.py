"""FastAPI service that loads model.pkl and serves house-price predictions."""

import os
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.db import Base, engine, get_db
from backend.app.models import Prediction

ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = ROOT / "ml" / "artifacts" / "model.pkl"

DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


def cors_origins() -> list[str]:
    """Localhost defaults plus comma-separated CORS_ORIGINS (e.g. Vercel URL)."""
    extra = [
        o.strip()
        for o in os.getenv("CORS_ORIGINS", "").split(",")
        if o.strip()
    ]
    return list(dict.fromkeys([*DEFAULT_CORS_ORIGINS, *extra]))

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


class PredictionOut(BaseModel):
    id: int
    area_sqft: float
    bedrooms: float
    bathrooms: float
    age_years: float
    waterfront: int
    floors: float
    condition: int
    grade: int
    predicted_price: float
    created_at: datetime

    model_config = {"from_attributes": True}


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global model
    Base.metadata.create_all(bind=engine)
    if MODEL_PATH.exists():
        model = joblib.load(MODEL_PATH)
    else:
        model = None
    yield
    model = None


app = FastAPI(title="House Price Prediction API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", model_loaded=model is not None)


@app.post("/predict", response_model=PredictResponse)
def predict(
    features: HouseFeatures,
    db: Session = Depends(get_db),
) -> PredictResponse:
    if model is None:
        raise HTTPException(
            status_code=503,
            detail=f"Model not loaded. Train first (python ml/train.py); expected {MODEL_PATH}",
        )
    row = pd.DataFrame([{col: getattr(features, col) for col in FEATURE_COLS}])
    predicted = float(model.predict(row)[0])

    record = Prediction(
        **features.model_dump(),
        predicted_price=predicted,
    )
    db.add(record)
    db.commit()

    return PredictResponse(predicted_price=predicted)


@app.get("/predictions", response_model=list[PredictionOut])
def list_predictions(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[Prediction]:
    stmt = (
        select(Prediction)
        .order_by(Prediction.created_at.desc(), Prediction.id.desc())
        .limit(limit)
    )
    return list(db.scalars(stmt).all())
