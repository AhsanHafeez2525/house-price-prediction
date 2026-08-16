"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { useState, type FormEvent } from "react";
import { Line } from "react-chartjs-2";

import {
  fetchPredictions,
  formatDateTime,
  formatPrice,
  predictPrice,
  type HouseFeatures,
  type Prediction,
} from "@/lib/api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
);

const DEFAULT_FEATURES: HouseFeatures = {
  area_sqft: 2000,
  bedrooms: 3,
  bathrooms: 2,
  age_years: 10,
  waterfront: 0,
  floors: 2,
  condition: 3,
  grade: 7,
};

type FieldConfig = {
  key: keyof HouseFeatures;
  label: string;
  hint: string;
  min: number;
  max?: number;
  step: number;
};

const FIELDS: FieldConfig[] = [
  {
    key: "area_sqft",
    label: "Living area (sqft)",
    hint: "Must be greater than 0",
    min: 1,
    step: 1,
  },
  {
    key: "bedrooms",
    label: "Bedrooms",
    hint: "0 or more",
    min: 0,
    step: 1,
  },
  {
    key: "bathrooms",
    label: "Bathrooms",
    hint: "Allows half baths",
    min: 0,
    step: 0.25,
  },
  {
    key: "age_years",
    label: "Age (years)",
    hint: "Years since construction",
    min: 0,
    step: 1,
  },
  {
    key: "floors",
    label: "Floors",
    hint: "Must be greater than 0",
    min: 0.5,
    step: 0.5,
  },
  {
    key: "condition",
    label: "Condition",
    hint: "1 (poor) – 5 (excellent)",
    min: 1,
    max: 5,
    step: 1,
  },
  {
    key: "grade",
    label: "Building grade",
    hint: "1 – 13",
    min: 1,
    max: 13,
    step: 1,
  },
];

type PredictionAppProps = {
  initialHistory: Prediction[];
  initialHistoryError: string | null;
};

export default function PredictionApp({
  initialHistory,
  initialHistoryError,
}: PredictionAppProps) {
  const [features, setFeatures] = useState<HouseFeatures>(DEFAULT_FEATURES);
  const [predictedPrice, setPredictedPrice] = useState<number | null>(null);
  const [history, setHistory] = useState<Prediction[]>(initialHistory);
  const [submitting, setSubmitting] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(
    initialHistoryError,
  );

  async function loadHistory() {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const rows = await fetchPredictions(20);
      setHistory(rows);
    } catch (err) {
      setHistoryError(
        err instanceof Error ? err.message : "Failed to load prediction history",
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  function updateField(key: keyof HouseFeatures, raw: string) {
    const value = Number(raw);
    setFeatures((prev) => ({
      ...prev,
      [key]: Number.isFinite(value) ? value : prev[key],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await predictPrice(features);
      setPredictedPrice(result.predicted_price);
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prediction failed");
    } finally {
      setSubmitting(false);
    }
  }

  const chartRows = [...history].reverse();
  const chartData: ChartData<"line"> = {
    labels: chartRows.map((row) => formatDateTime(row.created_at)),
    datasets: [
      {
        label: "Predicted price",
        data: chartRows.map((row) => row.predicted_price),
        borderColor: "#0f766e",
        backgroundColor: "rgba(15, 118, 110, 0.12)",
        pointBackgroundColor: "#0f766e",
        pointRadius: 4,
        tension: 0.25,
        fill: true,
      },
    ],
  };

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => formatPrice(Number(ctx.parsed.y)),
        },
      },
    },
    scales: {
      x: {
        ticks: { maxRotation: 45, minRotation: 0, autoSkip: true, maxTicksLimit: 6 },
        grid: { display: false },
      },
      y: {
        ticks: {
          callback: (value) => formatPrice(Number(value)),
        },
        grid: { color: "rgba(15, 23, 42, 0.06)" },
      },
    },
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">
          House Price Prediction
        </p>
        <h1 className="font-display text-3xl tracking-tight text-slate-900 sm:text-4xl">
          Estimate a sale price
        </h1>
        <p className="max-w-2xl text-base text-slate-600">
          Enter property features, get a live model estimate, and review recent
          predictions from the API history.
        </p>
      </header>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <label key={field.key} className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-800">
                  {field.label}
                </span>
                <input
                  type="number"
                  name={field.key}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  required
                  value={features[field.key]}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                />
                <span className="block text-xs text-slate-500">{field.hint}</span>
              </label>
            ))}

            <fieldset className="space-y-1.5 sm:col-span-2">
              <legend className="text-sm font-medium text-slate-800">
                Waterfront
              </legend>
              <div className="flex gap-4 pt-1">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="waterfront"
                    checked={features.waterfront === 0}
                    onChange={() =>
                      setFeatures((prev) => ({ ...prev, waterfront: 0 }))
                    }
                    className="accent-teal-700"
                  />
                  No
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="waterfront"
                    checked={features.waterfront === 1}
                    onChange={() =>
                      setFeatures((prev) => ({ ...prev, waterfront: 1 }))
                    }
                    className="accent-teal-700"
                  />
                  Yes
                </label>
              </div>
            </fieldset>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {submitting ? "Estimating…" : "Get price estimate"}
          </button>
        </form>

        <aside className="flex flex-col justify-center gap-4 rounded-2xl border border-teal-900/10 bg-gradient-to-br from-teal-800 to-slate-900 p-6 text-white shadow-sm">
          <p className="text-sm font-medium tracking-wide text-teal-100/90 uppercase">
            Predicted price
          </p>
          {predictedPrice == null ? (
            <p className="font-display text-3xl text-teal-50/80 sm:text-4xl">
              Submit the form to see an estimate
            </p>
          ) : (
            <p className="font-display text-4xl tracking-tight sm:text-5xl">
              {formatPrice(predictedPrice)}
            </p>
          )}
          <p className="text-sm text-teal-100/80">
            Powered by the trained scikit-learn model via FastAPI. Each estimate
            is stored in PostgreSQL for the history below.
          </p>
        </aside>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-slate-900">
              Recent predictions
            </h2>
            <p className="text-sm text-slate-600">
              Last 20 estimates from <code className="text-xs">GET /predictions</code>
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadHistory()}
            disabled={loadingHistory}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {loadingHistory ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {historyError ? (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {historyError}
          </p>
        ) : null}

        <div className="h-64 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur">
          {loadingHistory && history.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-slate-500">
              Loading chart…
            </p>
          ) : history.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-slate-500">
              No predictions yet. Submit an estimate to populate the chart.
            </p>
          ) : (
            <Line data={chartData} options={chartOptions} />
          )}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs tracking-wide text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Area</th>
                <th className="px-4 py-3 font-semibold">Beds</th>
                <th className="px-4 py-3 font-semibold">Baths</th>
                <th className="px-4 py-3 font-semibold">Age</th>
                <th className="px-4 py-3 font-semibold">WF</th>
                <th className="px-4 py-3 font-semibold">Floors</th>
                <th className="px-4 py-3 font-semibold">Cond</th>
                <th className="px-4 py-3 font-semibold">Grade</th>
                <th className="px-4 py-3 font-semibold">Price</th>
              </tr>
            </thead>
            <tbody>
              {loadingHistory && history.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    Loading history…
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No rows yet.
                  </td>
                </tr>
              ) : (
                history.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="px-4 py-3">{row.area_sqft}</td>
                    <td className="px-4 py-3">{row.bedrooms}</td>
                    <td className="px-4 py-3">{row.bathrooms}</td>
                    <td className="px-4 py-3">{row.age_years}</td>
                    <td className="px-4 py-3">
                      {row.waterfront ? "Yes" : "No"}
                    </td>
                    <td className="px-4 py-3">{row.floors}</td>
                    <td className="px-4 py-3">{row.condition}</td>
                    <td className="px-4 py-3">{row.grade}</td>
                    <td className="px-4 py-3 font-medium text-teal-800">
                      {formatPrice(row.predicted_price)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
