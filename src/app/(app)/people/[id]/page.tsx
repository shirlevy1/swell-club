import { notFound, redirect } from "next/navigation";
import {
  getViewer,
  getPersonCard,
  getSelfieHistory,
  getMyAttendedEventIds,
  getEventPhotoCollages,
} from "@/lib/data";
import { instagramUrl, whatsappUrl } from "@/lib/format";
import { facePositionStyle } from "@/lib/face-position";
import { BackLink, Notice } from "@/components/ui";
import { SelfieHistory } from "@/components/selfie-history";
import { InstagramIcon, WhatsAppIcon } from "@/components/social-icons";

/**
 * עמוד של חבר קהילה אחר, שנפתח מלחיצה על שם ברשימת "מי מתכוון להגיע".
 *
 * ⚠️ **שם זה לא פנים.** מי שעוד לא נכח איתכם באותו מפגש מוצג בשם בלבד —
 * בלי תמונות, בלי אינסטגרם ובלי וואטסאפ. זה אותו כלל שמחזיק את המוצר,
 * פשוט במקום נוסף בממשק, ונאכף גם ב־`person_card()` וגם ב-RLS על
 * attendances.
 *
 * הצד הניהולי הוא עמוד נפרד (`/admin/members/[id]`) עם טלפון ועם כל
 * הסלפים — למנהלת יש הרשאה רחבה יותר, ולא צריך לערבב את השניים.
 */
export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  /** `from` הוא event_id בלבד — משמש לחיפוש בתוך shots, לא ל-redirect
      וגם לא מוצג בשום מקום, ולכן אין צורך לחטא אותו כמו את `?next=`. */
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (id === viewer.userId) redirect("/profile");
  // למנהלת יש כבר עמוד חבר מלא — טלפון, אינסטגרם וכל הסלפים. אין טעם
  // לשכפל כאן גרסה מצומצמת שתיראה לה שבורה.
  if (viewer.role === "organizer") redirect(`/admin/members/${id}`);

  const person = await getPersonCard(id, viewer.userId);
  if (!person) notFound();

  // הסלפים של אדם אחר — רק ממפגשים שנכחנו בהם יחד. במצב אמיתי גם
  // ה-RLS מסנן, אבל בהדגמה אין RLS, ובלי הסינון כאן היא הייתה מציגה
  // התנהגות שונה מהמוצר.
  const met = person.sharedCount > 0;
  const [allShots, mine] = await Promise.all([
    met ? getSelfieHistory(id) : Promise.resolve([]),
    getMyAttendedEventIds(viewer.userId),
  ]);
  const shots = allShots.filter((s) => mine.has(s.eventId));
  // הסלפי מהמפגש שממנו הגענו — לא סתם "הכי עדכני". נופל חזרה לראשון
  // ברשימה אם הגעתם ישירות לעמוד, או אם אותו מפגש לא נמצא ברשימה.
  const headerShot = (from && shots.find((s) => s.eventId === from)) || shots[0];
  const albumsByEvent = await getEventPhotoCollages(shots.map((s) => s.eventId));

  const ig = instagramUrl(person.instagram);
  const wa = whatsappUrl(person.phone);

  return (
    <div className="space-y-6">
      <BackLink href="/events">לכל המפגשים</BackLink>

      <header className="flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-(--color-line) bg-(--color-haze)">
          {headerShot?.selfieUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={headerShot.selfieUrl}
              alt={person.fullName}
              className="size-full object-cover"
              style={facePositionStyle(headerShot.faceX, headerShot.faceY)}
            />
          ) : (
            <span
              aria-hidden
              className="font-[family-name:var(--font-display)] text-2xl font-bold text-(--color-sea)"
            >
              {person.fullName.trim()[0]}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-[family-name:var(--font-display)] text-2xl font-bold">
            {person.fullName}
          </h1>
          <p className="text-sm text-(--color-ink-soft)">
            {person.attendedCount === 0
              ? "עוד לא נכח במפגש"
              : person.attendedCount === 1
                ? "נכח במפגש אחד"
                : `נכח ב־${person.attendedCount} מפגשים`}
          </p>
        </div>
      </header>

      {met ? (
        <>
          {(wa || ig) && (
            <div className="flex gap-2">
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-(--color-line) bg-(--color-haze) text-sm font-semibold text-(--color-verified) transition hover:border-(--color-verified)/50 hover:bg-(--color-verified)/10"
                >
                  <WhatsAppIcon className="size-4" />
                  וואטסאפ
                </a>
              )}
              {ig && (
                <a
                  href={ig}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-(--color-line) bg-(--color-haze) text-sm font-semibold text-(--color-sea) transition hover:border-(--color-sea)/50 hover:bg-(--color-sea)/10"
                >
                  <InstagramIcon className="size-4" />
                  אינסטגרם
                </a>
              )}
            </div>
          )}

          <section className="space-y-3">
            <div className="space-y-0.5">
              <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
                מהמפגשים שהייתם בהם יחד
              </h2>
              <p className="text-xs text-(--color-ink-faint)">
                {person.sharedCount === 1
                  ? "נכחתם יחד במפגש אחד."
                  : `נכחתם יחד ב־${person.sharedCount} מפגשים.`}
              </p>
            </div>
            <SelfieHistory shots={shots} albumsByEvent={albumsByEvent} />
          </section>
        </>
      ) : (
        <Notice>
          עוד לא נכחתם יחד באף מפגש, ולכן אתם רואים רק את השם. סמנו הגעה
          לאותו מפגש — ואז גם הפנים.
        </Notice>
      )}
    </div>
  );
}
