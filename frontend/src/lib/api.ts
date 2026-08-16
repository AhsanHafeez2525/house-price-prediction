export type HouseFeatures = {
  area_sqft: number;
  bedrooms: number;
  bathrooms: number;
  age_years: number;
  waterfront: number;
  floors: number;
  condition: number;
  grade: number;
};

export type PredictResponse = {
  predicted_price: number;
};

export type Prediction = HouseFeatures & {
  id: number;
  predicted_price: number;
  created_at: string;
};

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { detail?: unknown };
    if (typeof data.detail === "string") return data.detail;
    if (data.detail != null) return JSON.stringify(data.detail);
  } catch {
    /* ignore parse errors */
  }
  return `Request failed (${res.status})`;
}

export async function predictPrice(
  features: HouseFeatures,
): Promise<PredictResponse> {
  const res = await fetch(`${getApiBaseUrl()}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(features),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json() as Promise<PredictResponse>;
}

export async function fetchPredictions(limit = 20): Promise<Prediction[]> {
  const res = await fetch(`${getApiBaseUrl()}/predictions?limit=${limit}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json() as Promise<Prediction[]>;
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
