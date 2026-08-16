import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer, getAdminData } from "@/lib/data";
import { formatDateTime, formatPhone, normalizeInstagram } from "@/lib/format";
import { checkInWindow } from "@/lib/checkin";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { ExportButton } from "@/components/export-button";

function InstagramGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="size-3 shrink-0"
      aria-hidden
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.6" cy="6.4" r="1.2" fill="currentColor" />
    </svg>
  );
}

export default async function AdminPage() {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const { events, members } = await getAdminData(viewer.club.id);

  // המכנה של אחוז ההגעה הוא מפגשים שכבר **אפשר היה** לסמן בהם נוכחות,
  // כלומר שחלון הצ'ק־אין שלהם נפתח — ולא רק מפגשים שהסתיימו. אחרת מי
  // שסימן הגעה למפגש שנפתח עכשיו מקבל "3 מתוך 2".
  const heldCount = events.filter(
    (e) => checkInWindow(e).status !== "before",
  ).length;

  const csv = [
    ["שם", "טלפון", "אינסטגרם", "מפגשים", "אחוז הגעה"],
    ...members.map((m) => [
      m.profile.full_name,
      formatPhone(m.profile.phone) ?? "",
      // מנורמל: בטופס אנשים הכניסו גם קישורים מלאים וגם שמות משתמש
      normalizeInstagram(m.profile.instagram) ?? "",
      String(m.attendedCount),
      `${heldCount ? Math.round((m.attendedCount / heldCount) * 100) : 0}%`,
    ]),
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="ניהול"
        subtitle={[
          members.length === 1 ? "חבר אחד" : `${members.length} חברים`,
          events.length === 1 ? "מפגש אחד" : `${events.length} מפגשים`,
        ].join(" · ")}
        action={
          <LinkButton href="/admin/events/new" className="min-h-10 px-4 text-sm">
            מפגש חדש
          </LinkButton>
        }
      />

      <section className="space-y-3">
        <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
          מפגשים
        </h2>
        {events.length === 0 ? (
          <EmptyState
            title="עוד אין מפגשים"
            body="פתחו מפגש ראשון והקהילה תראה אותו מיד."
          />
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <li key={event.id}>
                <Link href={`/events/${event.id}`}>
                  <Card className="space-y-3 transition hover:border-(--color-line)">
                    <div>
                      <p className="font-[family-name:var(--font-display)] text-lg font-bold">
                        {event.title}
                      </p>
                      <p className="text-xs text-(--color-ink-faint)">
                        {formatDateTime(event.starts_at)}
                      </p>
                    </div>
                    <div className="flex gap-6">
                      <div>
                        <p className="ltr-nums text-2xl font-bold text-(--color-ink-soft)">
                          {event.goingCount}
                        </p>
                        <p className="text-[0.7rem] text-(--color-ink-faint)">
                          סימנו שיגיעו
                        </p>
                      </div>
                      <div>
                        <p className="ltr-nums text-2xl font-bold text-(--color-verified)">
                          {event.cameCount}
                        </p>
                        <p className="text-[0.7rem] text-(--color-ink-faint)">
                          הגיעו בפועל
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-ink-faint)">
            חברי הקהילה
          </h2>
          <ExportButton rows={csv} filename="swell-members.csv" />
        </div>

        <Card className="divide-y divide-(--color-line)/50 p-0">
          {members.map((m) => (
            <Link
              key={m.profile.id}
              href={`/admin/members/${m.profile.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-(--color-haze)/60"
            >
              {/* פנים ברשימה — המנהלת מזהה אנשים ככה, לא לפי שם */}
              <div className="size-11 shrink-0 overflow-hidden rounded-full border border-(--color-line) bg-(--color-haze)">
                {m.latestSelfieUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.latestSelfieUrl}
                    alt={m.profile.full_name}
                    className="size-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="truncate text-sm font-semibold">
                  {m.profile.full_name}
                </p>
                <p
                  dir="ltr"
                  className="truncate text-start text-xs text-(--color-ink-faint)"
                >
                  {formatPhone(m.profile.phone) ?? "—"}
                </p>
                {/* טקסט ולא קישור: השורה כולה כבר עוגן, ועוגן בתוך
                    עוגן אינו HTML תקין. הקישור עצמו בעמוד החבר. */}
                {normalizeInstagram(m.profile.instagram) ? (
                  <p
                    dir="ltr"
                    className="flex items-center gap-1 text-start text-xs font-semibold text-(--color-sea)"
                  >
                    <InstagramGlyph />@{normalizeInstagram(m.profile.instagram)}
                  </p>
                ) : (
                  <p className="text-xs text-(--color-ink-faint)">
                    בלי אינסטגרם
                  </p>
                )}
              </div>
              <span className="ltr-nums shrink-0 text-sm font-bold text-(--color-ink-soft)">
                {m.attendedCount}
                <span className="text-(--color-ink-faint)">/{heldCount}</span>
              </span>
            </Link>
          ))}
        </Card>
      </section>
    </div>
  );
}
