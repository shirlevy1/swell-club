import { getViewer, getMetPeople } from "@/lib/data";
import { getWaveForecast, getBestSwimDays } from "@/lib/gosurf";
import { EmptyState } from "@/components/ui";
import { WaveForecastStrip } from "@/components/wave-forecast-strip";
import { BestSwimDaysCard } from "@/components/best-swim-days";
import { KnownPeopleStrip } from "@/components/known-people-strip";

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

  const [waveDays, bestDays, knownPeople] = await Promise.all([
    getWaveForecast(),
    getBestSwimDays(),
    getMetPeople(viewer.userId),
  ]);

  return (
    <div className="space-y-8">
      <WaveForecastStrip days={waveDays} />
      <BestSwimDaysCard days={bestDays} />
      <KnownPeopleStrip people={knownPeople} />
    </div>
  );
}
