"""Load King County house sales CSV, clean features/label, write processed CSV."""

from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW_PATH = ROOT / "data" / "raw" / "houses.csv"
OUT_PATH = ROOT / "data" / "processed" / "houses_clean.csv"

TARGET_COL = "price"
# Final training columns (see FEATURES.md)
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


def load_raw(path: Path = RAW_PATH) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Raw CSV not found: {path}")
    df = pd.read_csv(path)
    print(f"Loaded {path.relative_to(ROOT)} — shape={df.shape}")
    print("Nulls:\n", df.isnull().sum().to_string())
    print("Dtypes:\n", df.dtypes.to_string())
    return df


def clean(df: pd.DataFrame) -> pd.DataFrame:
    required = ["price", "bedrooms", "bathrooms", "sqft_living", "yr_built", "waterfront"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise KeyError(
            f"Raw CSV missing columns {missing}. "
            "Expected King County schema (sqft_living, yr_built, waterfront, …)."
        )

    out = pd.DataFrame(index=df.index)
    out[TARGET_COL] = pd.to_numeric(df["price"], errors="coerce")
    out["area_sqft"] = pd.to_numeric(df["sqft_living"], errors="coerce")
    out["bedrooms"] = pd.to_numeric(df["bedrooms"], errors="coerce")
    out["bathrooms"] = pd.to_numeric(df["bathrooms"], errors="coerce")
    out["waterfront"] = pd.to_numeric(df["waterfront"], errors="coerce")
    out["floors"] = pd.to_numeric(df.get("floors", 1), errors="coerce")
    out["condition"] = pd.to_numeric(df.get("condition", 3), errors="coerce")
    out["grade"] = pd.to_numeric(df.get("grade", 7), errors="coerce")

    # Age at sale: prefer sale-year from `date`, else assume 2015 (dataset window)
    yr_built = pd.to_numeric(df["yr_built"], errors="coerce")
    if "date" in df.columns:
        sale_year = pd.to_datetime(df["date"], errors="coerce").dt.year
    else:
        sale_year = pd.Series(2015, index=df.index)
    out["age_years"] = sale_year - yr_built

    before = len(out)
    out = out.dropna(subset=[TARGET_COL])
    print(f"Dropped {before - len(out)} rows with missing price")

    for col in FEATURE_COLS:
        nulls = out[col].isna().sum()
        if nulls:
            if col == "waterfront":
                fill = 0
            else:
                fill = out[col].median()
            out[col] = out[col].fillna(fill)
            print(f"Imputed {nulls} nulls in {col} with {fill}")

    # Waterfront must be 0/1
    out["waterfront"] = out["waterfront"].clip(0, 1).astype(int)

    before = len(out)
    out = out[
        (out["area_sqft"].between(200, 10_000))
        & (out["bedrooms"].between(1, 10))
        & (out["bathrooms"].between(0.5, 8))
        & (out["age_years"].between(0, 150))
        & (out["floors"].between(1, 4))
        & (out["condition"].between(1, 5))
        & (out["grade"].between(1, 13))
        & (out["price"].between(50_000, 3_000_000))
    ]
    print(f"Dropped {before - len(out)} outlier rows")

    out = out[FEATURE_COLS + [TARGET_COL]]
    assert out.isnull().sum().sum() == 0, "Cleaned frame still has nulls"
    return out.reset_index(drop=True)


def main() -> None:
    raw = load_raw()
    clean_df = clean(raw)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    clean_df.to_csv(OUT_PATH, index=False)
    print(f"Wrote {OUT_PATH.relative_to(ROOT)} — shape={clean_df.shape}")
    print("Columns:", clean_df.columns.tolist())
    print(clean_df.head(3).to_string(index=False))


if __name__ == "__main__":
    main()
