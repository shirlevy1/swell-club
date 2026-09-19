import { getViewer } from "@/lib/data";
import { getSeaScoreForecast } from "@/lib/gosurf";
import { EmptyState } from "@/components/ui";
import { SeaScoreStrip } from "@/components/sea-score-strip";
import { SeaScoreWordStrip } from "@/components/sea-score-word-strip";

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
      {/* שתי גרסאות זו לצד זו, זמנית — עד שיוחלט איזו נשארת. שתיהן
          כבר כוללות את שם הגרסה בכותרת שלהן, כדי שיהיה ברור מה מה. */}
      <SeaScoreStrip days={seaScoreDays} />
      <SeaScoreWordStrip days={seaScoreDays} />
    </div>
  );
}
