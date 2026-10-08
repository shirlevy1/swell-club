"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import type { AdminMember } from "@/lib/data";
import { ageInYears, instagramUrl, whatsappUrl } from "@/lib/format";
import { facePositionStyle } from "@/lib/face-position";
import {
  swimLevelLabel,
  SWIM_LEVEL_COLOR,
  swimLevelBadgeStyle,
} from "@/lib/swim-level";
import { InstagramIcon, WhatsAppIcon, WaveIcon } from "./social-icons";
import { Card, Input, EmptyState } from "./ui";

/**
 * שדה חיפוש לפי שם מעל רשימת חברי הקהילה. חיפוש בצד לקוח בלבד
 * (הרשימה המלאה כבר מגיעה מהשרת) — פשוט ומיידי, בלי ניווט/טעינה
 * מחדש לכל הקשה. תוצאות מוצגות בזרימה הרגילה של העמוד (בלי קופסת
 * גלילה פנימית משלהן) - ⚠️ נוסה בעבר (גובה קבוע + overflow-y-auto)
 * והתנגש עם PullToRefresh (גלילת-המשיכה-לרענון המותאמת-אישית של
 * כל עמוד) בצורה שהתנהגה אחרת בכל דפדפן/מכשיר ולא התייצבה אחרי כמה
 * סבבי תיקון - התברר שלא היה שווה את זה.
 *
 * whenEmpty: מוצג במקום הרשימה המלאה כש-query ריק - לעמוד הניהול
 * הראשי, שלא רוצה להציג שם את כל 300 החברים (קישור ל"כל חברי
 * הקהילה" בפועל, ראו admin/page.tsx). בלי זה (undefined) - מציגים
 * את כל הרשימה כש-query ריק, כמו בעמוד הייעודי admin/members.
 *
 * renderBefore: תוכן אופציונלי בקצה הימני של כל שורה (מימין לתמונת
 * הפרופיל), לפי profile.id - נקודת-הרחבה גנרית, לא ספציפית לשום
 * שימוש. כרגע רק admin/outreach משתמש בזה (תיבת "דיברתי איתו/ה").
 * מתקבל כ-Map של אלמנטים *כבר-מצוירים* (לא כפונקציה!) - MemberSearchList
 * הוא "use client", ורכיב שרת לא יכול להעביר function כ-prop לרכיב
 * לקוח (אי אפשר לסדרן אותה) - רק JSX כבר-מוכן, שיכול להכיל בתוכו
 * רכיבי-לקוח אחרים (כמו OutreachCheckbox) בלי בעיה.
 *
 * backFrom: ה-?from= שמועבר לכל קישור לפרופיל חבר/ה (נקרא ב-
 * admin/members/[id]/page.tsx כדי לדעת לאן כפתור "חזור" שם אמור
 * להוביל). חובה, לא אופציונלי בכוונה - כדי שאי אפשר יהיה להוסיף
 * כאן בעתיד עוד מקום-קריאה חדש בלי לחשוב מפורשות "לאן חזרה מכאן
 * אמורה להוביל" (זו בדיוק התקלה שתוקנה כאן - שיר גילתה שחזרה
 * מ"נשים מול גברים" נחתה ב"לניהול" במקום בחזרה לעוגה עצמה, כי
 * הקישור כאן לא העביר שום from).
 */
export function MemberSearchList({
  members,
  whenEmpty,
  renderBefore,
  backFrom,
}: {
  members: AdminMember[];
  whenEmpty?: ReactNode;
  renderBefore?: Map<string, ReactNode>;
  backFrom: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return members;
    return members.filter((m) => m.profile.full_name.includes(q));
  }, [members, query]);

  const isEmptyQuery = query.trim().length === 0;

  return (
    <div className="space-y-3">
      <Input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="חיפוש לפי שם..."
        aria-label="חיפוש חבר/ת קהילה לפי שם"
      />

      {isEmptyQuery && whenEmpty ? (
        whenEmpty
      ) : filtered.length === 0 ? (
        <EmptyState title="לא נמצא/ה" body="אף חבר/ת קהילה לא תואם/ת את החיפוש." />
      ) : (
        <Card className="divide-y divide-(--color-line)/50 p-0">
          {filtered.map((m) => {
            const age = ageInYears(m.profile.birth_date);
            const wa = whatsappUrl(m.profile.phone);
            const ig = instagramUrl(m.profile.instagram);

            return (
              <div
                key={m.profile.id}
                className="flex items-center gap-2 px-3 py-2.5 transition hover:bg-(--color-haze)/60"
              >
                {renderBefore?.get(m.profile.id)}
                <Link
                  href={`/admin/members/${m.profile.id}?from=${backFrom}`}
                  className="flex min-w-0 flex-1 items-center gap-2"
                >
                  <div className="size-9 shrink-0 overflow-hidden rounded-full border border-(--color-line) bg-(--color-haze)">
                    {m.latestSelfieUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.latestSelfieUrl}
                        alt={m.profile.full_name}
                        className="size-full object-cover"
                        loading="lazy"
                        style={facePositionStyle(m.latestFaceX, m.latestFaceY)}
                      />
                    ) : null}
                  </div>
                  <p className="flex min-w-0 items-baseline gap-1 text-sm font-semibold">
                    <span className="truncate">{m.profile.full_name}</span>
                    <span className="shrink-0 whitespace-nowrap font-normal text-(--color-ink-faint)">
                      {age !== null && <>· {age} </>}
                      · <span className="ltr-nums">{m.attendedCount}</span>
                    </span>
                  </p>
                </Link>

                <div className="flex shrink-0 items-center gap-1">
                  {m.profile.swim_level && (
                    <span
                      className="flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[0.7rem] font-semibold text-(--color-ink)"
                      style={swimLevelBadgeStyle(m.profile.swim_level)}
                    >
                      <WaveIcon
                        className="size-2.5"
                        style={{ color: SWIM_LEVEL_COLOR[m.profile.swim_level] }}
                      />
                      {swimLevelLabel(m.profile.swim_level)}
                    </span>
                  )}

                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`וואטסאפ עם ${m.profile.full_name}`}
                      className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-(--color-line) bg-(--color-haze) text-(--color-verified) transition hover:border-(--color-verified)/50 hover:bg-(--color-verified)/10"
                    >
                      <WhatsAppIcon className="size-3" />
                    </a>
                  )}
                  {ig && (
                    <a
                      href={ig}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`אינסטגרם של ${m.profile.full_name}`}
                      className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-(--color-line) bg-(--color-haze) text-(--color-sea) transition hover:border-(--color-sea)/50 hover:bg-(--color-sea)/10"
                    >
                      <InstagramIcon className="size-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
