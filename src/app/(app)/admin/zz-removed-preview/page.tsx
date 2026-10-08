import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data";
import { BackLink, Card, Notice } from "@/components/ui";

/**
 * עמוד זמני להשוואת 3 הצעות לאיך לסמן בעמוד הפרופיל שמישהו/י כבר
 * לא בקהילה - למחוק אחרי שמחליטים. לא נגיש משום מקום באתר, רק
 * לינק ישיר.
 */
export default async function PreviewPage() {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const name = "נעמה לביא";
  const dateText = "08.10.2026";

  return (
    <div className="space-y-10">
      <BackLink href="/admin">לניהול</BackLink>
      <h1 className="text-xl font-bold">3 הצעות - סימון שחבר/ה כבר לא בקהילה</h1>

      {/* אפשרות א: באנר למעלה */}
      <section className="space-y-2">
        <p className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
          אפשרות א - הודעה למעלה
        </p>
        <Card className="space-y-4">
          <Notice tone="info">הוסרה מהקהילה ב-{dateText}</Notice>
          <header className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--color-line) bg-(--color-haze)" />
            <div className="min-w-0">
              <h2 className="truncate font-[family-name:var(--font-display)] text-2xl font-bold">
                {name}
              </h2>
              <p className="text-sm text-(--color-ink-soft)">הייתה איתנו ב-3 מפגשים</p>
            </div>
          </header>
        </Card>
      </section>

      {/* אפשרות ב: תגית קטנה ליד השם */}
      <section className="space-y-2">
        <p className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
          אפשרות ב - תגית ליד השם
        </p>
        <Card>
          <header className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--color-line) bg-(--color-haze)" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate font-[family-name:var(--font-display)] text-2xl font-bold">
                  {name}
                </h2>
                <span className="shrink-0 rounded-full border border-(--color-line) bg-(--color-haze) px-2.5 py-1 text-xs font-semibold text-(--color-ink-faint)">
                  הוסרה
                </span>
              </div>
              <p className="text-sm text-(--color-ink-soft)">
                הייתה איתנו ב-3 מפגשים · הוסרה ב-{dateText}
              </p>
            </div>
          </header>
        </Card>
      </section>

      {/* אפשרות ג: כל הכרטיס עמום/מושתק */}
      <section className="space-y-2">
        <p className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
          אפשרות ג - הכרטיס כולו &quot;עמום&quot;
        </p>
        <Card className="opacity-70">
          <header className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--color-line) bg-(--color-haze) grayscale" />
            <div className="min-w-0">
              <h2 className="truncate font-[family-name:var(--font-display)] text-2xl font-bold text-(--color-ink-faint)">
                {name}
              </h2>
              <p className="text-sm text-(--color-ink-faint)">
                הוסרה מהקהילה ב-{dateText} · הייתה איתנו ב-3 מפגשים
              </p>
            </div>
          </header>
        </Card>
      </section>
    </div>
  );
}
