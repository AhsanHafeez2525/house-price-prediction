"""ORM models for prediction history."""

from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    area_sqft: Mapped[float] = mapped_column(Float, nullable=False)
    bedrooms: Mapped[float] = mapped_column(Float, nullable=False)
    bathrooms: Mapped[float] = mapped_column(Float, nullable=False)
    age_years: Mapped[float] = mapped_column(Float, nullable=False)
    waterfront: Mapped[int] = mapped_column(Integer, nullable=False)
    floors: Mapped[float] = mapped_column(Float, nullable=False)
    condition: Mapped[int] = mapped_column(Integer, nullable=False)
    grade: Mapped[int] = mapped_column(Integer, nullable=False)
    predicted_price: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
