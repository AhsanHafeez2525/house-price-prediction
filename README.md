# House Price Prediction

Predict house prices from features using ML (scikit-learn), a FastAPI backend, PostgreSQL history, and a Next.js UI.

## Project layout

| Path | Role |
|------|------|
| `data/` | Raw + cleaned CSV |
| `ml/` | Clean/train scripts; artifacts in `ml/artifacts/` |
| `backend/` | FastAPI app |
| `frontend/` | Next.js + Tailwind UI |
| `docs/` | Phase guides |

## Prerequisites

- Python 3.10+
- Node.js / npm
- PostgreSQL (for later phases)

## Setup

### 1) Python (repo root)

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Quick check:

```bash
python -c "import pandas, numpy, sklearn, fastapi; print('ok')"
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3) Environment

Copy `.env.example` to `.env` and fill in values when you reach DB/API phases:

```bash
cp .env.example .env
```

## How to run (later phases)

### Backend (FastAPI)

```bash
source .venv/bin/activate
uvicorn backend.app.main:app --reload --port 8000
```

- API: http://localhost:8000  
- Docs: http://localhost:8000/docs  

### ML (clean + train)

```bash
source .venv/bin/activate
python ml/clean_data.py
python ml/train.py
```

Model artifact path: `ml/artifacts/model.pkl` (`.pkl` files are gitignored).

## Docs

See [docs/phases/00-overview.md](docs/phases/00-overview.md) for the full stack and phase order.
