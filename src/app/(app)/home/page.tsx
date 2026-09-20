import { getViewer, getMetPeople } from "@/lib/data";
import { getWaveForecast } from "@/lib/gosurf";
import { EmptyState } from "@/components/ui";
import { WaveForecastStrip } from "@/components/wave-forecast-strip";
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

  const [waveDays, knownPeople] = await Promise.all([
    getWaveForecast(),
    getMetPeople(viewer.userId),
  ]);

  return (
    <div className="space-y-8">
      <WaveForecastStrip days={waveDays} />
      <KnownPeopleStrip people={knownPeople} />
    </div>
  );
}
