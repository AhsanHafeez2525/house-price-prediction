import PredictionApp from "@/components/PredictionApp";
import { fetchPredictions, type Prediction } from "@/lib/api";

export default async function Home() {
  let initialHistory: Prediction[] = [];
  let initialHistoryError: string | null = null;

  try {
    initialHistory = await fetchPredictions(20);
  } catch (err) {
    initialHistoryError =
      err instanceof Error ? err.message : "Failed to load prediction history";
  }

  return (
    <main className="flex flex-1 flex-col">
      <PredictionApp
        initialHistory={initialHistory}
        initialHistoryError={initialHistoryError}
      />
    </main>
  );
}
