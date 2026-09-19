import { getViewer } from "@/lib/data";
import { getSeaScoreForecast } from "@/lib/gosurf";
import { EmptyState } from "@/components/ui";
import { SeaScoreStrip } from "@/components/sea-score-strip";

export default async function HomePage() {
  const viewer = await getViewer();
  if (!viewer?.club) {
    return (
      <EmptyState
        title="אתם עוד לא בקהילה"
        body="בקשו ממנהלת הקהילה את קישור ההצטרפות."
      />
    );
  }

  const seaScoreDays = await getSeaScoreForecast();

  return (
    <div className="space-y-8">
      <SeaScoreStrip days={seaScoreDays} />
    </div>
  );
}
