import { notFound, redirect } from "next/navigation";
import {
  getViewer,
  getMemberProfile,
  getMembership,
  getPersonCard,
  getSelfieHistory,
  getEventPhotoCollages,
  removalVerb,
} from "@/lib/data";
import {
  instagramUrl,
  whatsappUrl,
  byGender,
  formatDateNumericPadded,
} from "@/lib/format";
import { BackLink, Card, cx } from "@/components/ui";
import { SelfieHistory, SelfieAvatarButton } from "@/components/selfie-history";
import {
  swimLevelLabel,
  SWIM_LEVEL_COLOR,
  swimLevelBadgeStyle,
} from "@/lib/swim-level";
import { WhatsAppIcon, InstagramIcon, WaveIcon } from "@/components/social-icons";
import { RemoveMemberButton } from "@/components/remove-member-button";

export default async function AdminMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  /** מגיע מההפניה האוטומטית ב-people/[id]/page.tsx כשמנהלת ניגשת
      לעמוד "חבר קהילה" רגיל דרך מפגש (attendee-grid/going-list) או
      דרך "חברים שלי מסוואל קלאב" בעמוד הבית — כדי שכפתור החזרה כאן
      ידע שהיא לא הגיעה מהניהול. */
  searchParams: Promise<{ from?: string; fromId?: string }>;
}) {
  const { id } = await params;
  const { from, fromId } = await searchParams;
  // מועבר הלאה כ-pfrom/pfromId בקישור למפגש (SelfieHistory למטה), כדי
  // שכפתור החזרה שם ידע לחזור לכאן עם אותו from/fromId בדיוק — אחרת
  // חזרה ממפגש שני (שנפתח מתוך הסלפים המשותפים כאן) הייתה "שוכחת"
  // מאיפה המנהלת הגיעה לעמוד הזה מלכתחילה (בית/ניהול/תמונות ממתינות/
  // מפגש אחר).
  const relay = from ? `&pfrom=${from}${fromId ? `&pfromId=${fromId}` : ""}` : "";
  const back =
    from === "event" && fromId
      ? { href: `/events/${fromId}`, label: "בחזרה למפגש" }
      : from === "home"
        ? { href: "/home", label: "בחזרה לבית" }
        : from === "admin-photos"
          ? { href: "/admin#pending-photos", label: "לניהול" }
          : from === "admin-removed"
            ? { href: "/admin/removed", label: "לאקסים" }
            : from === "admin-core"
              ? { href: "/admin/core", label: "לגרעין" }
              : from === "admin-outreach"
              ? { href: "/admin/outreach", label: "לאורחים" }
              : from === "admin-ghosts"
                ? { href: "/admin/ghosts", label: "לרוח רפאים" }
                : from === "admin-members"
                ? { href: "/admin/members", label: "לכל חברי הקהילה" }
                : from === "admin-insights-gender"
                  ? { href: "/admin/insights/gender", label: "לנשים מול גברים" }
                  : from === "admin-insights-tenure"
                    ? { href: "/admin/insights/tenure", label: "לותק חברים" }
                    : { href: "/admin#members", label: "לניהול" };
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const [profile, shots, person, membership] = await Promise.all([
    getMemberProfile(id),
    getSelfieHistory(id),
    getPersonCard(id, viewer.userId),
    getMembership(viewer.club.id, id),
  ]);
  if (!profile) notFound();
  const albumsByEvent = await getEventPhotoCollages(shots.map((s) => s.eventId));

  const ig = instagramUrl(profile.instagram);
  const wa = whatsappUrl(profile.phone);

  // אופציה ג מתוך 3 הצעות שהוצגו לשיר: כל הכרטיס "עמום" (לא באנר,
  // לא תגית) - תמונה בשחור-לבן, טקסט דהוי, וסיבה+תאריך כשורה רגילה
  // מתחת לשם. בלי המילה "מהקהילה" בניסוח, לפי בקשתה המפורשת.
  const isRemoved = membership?.status === "removed";
  const removedCaption =
    isRemoved && membership.removedReason && membership.removedAt
      ? `${removalVerb(membership.removedReason, profile.gender)} ב-${formatDateNumericPadded(membership.removedAt)}`
      : null;

  return (
    <div className="space-y-6">
      <BackLink href={back.href}>{back.label}</BackLink>

      <header className={cx("flex items-center gap-4", isRemoved && "opacity-70")}>
        <SelfieAvatarButton
          shots={shots}
          fullName={profile.full_name}
          className={cx(
            "flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--color-line) bg-(--color-haze)",
            isRemoved && "grayscale",
          )}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1
              className={cx(
                "truncate font-[family-name:var(--font-display)] text-2xl font-bold",
                isRemoved && "text-(--color-ink-faint)",
              )}
            >
              {profile.full_name}
            </h1>
            {profile.swim_level && (
              <span
                className="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-semibold text-(--color-ink)"
                style={swimLevelBadgeStyle(profile.swim_level)}
              >
                <WaveIcon
                  className="size-3.5"
                  style={{ color: SWIM_LEVEL_COLOR[profile.swim_level] }}
                />
                {swimLevelLabel(profile.swim_level)}
              </span>
            )}
          </div>
          <p
            className={cx(
              "text-sm text-(--color-ink-soft)",
              isRemoved && "text-(--color-ink-faint)",
            )}
          >
            {removedCaption && <>{removedCaption} · </>}
            {!person || person.attendedCount === 0
              ? byGender(profile.gender, "עוד לא היה איתנו", "עוד לא הייתה איתנו")
              : person.attendedCount === 1
                ? byGender(profile.gender, "היה איתנו במפגש אחד", "הייתה איתנו במפגש אחד")
                : (
                    <>
                      {byGender(profile.gender, "היה איתנו", "הייתה איתנו")} ב־
                      <span className="ltr-nums">{person.attendedCount}</span>{" "}
                      מפגשים
                    </>
                  )}
          </p>
        </div>
      </header>

      {(wa || ig) && (
        <Card className="flex gap-2">
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
        </Card>
      )}

      <section className="space-y-3">
        <div className="space-y-0.5">
          <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
            הסוואל המשותף שלכם
          </h2>
          <p className="text-xs text-(--color-ink-faint)">
            רגעים מהמפגשים שהייתם בהם ביחד.
          </p>
        </div>
        <SelfieHistory
          shots={shots}
          albumsByEvent={albumsByEvent}
          eventLinkQuery={`from=admin-member&fromId=${id}${relay}`}
        />
      </section>

      {/* מנהלת לא יכולה להסיר מנהלת/עצמה ככה — קהילה בלי אף מנהלת
          נעולה לגמרי. נאכף שוב בשרת ב-remove_member(). וגם לא על
          מי שכבר הוסר/ה/עזב/ה - אין טעם בכפתור "הסרה" שמציע להסיר
          מישהו שכבר לא בקהילה. */}
      {membership?.role !== "organizer" && membership?.status === "approved" && (
        <RemoveMemberButton
          profileId={id}
          fullName={profile.full_name}
          gender={profile.gender}
        />
      )}
    </div>
  );
}
