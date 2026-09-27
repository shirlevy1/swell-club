"use client";

import { useMemo, useState } from "react";
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
import { RemoveMemberButton } from "./remove-member-button";

/**
 * שדה חיפוש לפי שם מעל רשימת חברי הקהילה בניהול. חיפוש בצד לקוח
 * בלבד (הרשימה המלאה כבר מגיעה מהשרת) — פשוט ומיידי, בלי ניווט/
 * טעינה מחדש לכל הקשה. אין סף מינימלי להצגה - נשאר עקבי גם בקהילה
 * קטנה, ופשוט לא "עושה כלום" כשהשדה ריק.
 */
export function MemberSearchList({ members }: { members: AdminMember[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return members;
    return members.filter((m) => m.profile.full_name.includes(q));
  }, [members, query]);

  return (
    <div className="space-y-3">
      <Input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="חיפוש לפי שם..."
        aria-label="חיפוש חבר/ת קהילה לפי שם"
      />

      {filtered.length === 0 ? (
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
                className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-(--color-haze)/60"
              >
                <Link
                  href={`/admin/members/${m.profile.id}`}
                  className="flex items-center gap-3"
                >
                  <div className="size-11 shrink-0 overflow-hidden rounded-full border border-(--color-line) bg-(--color-haze)">
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
                  <p className="flex items-baseline gap-1 whitespace-nowrap text-sm font-semibold">
                    <span>{m.profile.full_name}</span>
                    <span className="font-normal text-(--color-ink-faint)">
                      {age !== null && <>· {age} </>}
                      · <span className="ltr-nums">{m.attendedCount}</span>
                    </span>
                  </p>
                </Link>

                <div className="ms-auto flex shrink-0 items-center gap-1.5">
                  {m.profile.swim_level && (
                    <span
                      className="flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[0.72rem] font-semibold text-(--color-ink)"
                      style={swimLevelBadgeStyle(m.profile.swim_level)}
                    >
                      <WaveIcon
                        className="size-2.5"
                        style={{ color: SWIM_LEVEL_COLOR[m.profile.swim_level] }}
                      />
                      {swimLevelLabel(m.profile.swim_level)}
                    </span>
                  )}

                  {(wa || ig) && (
                    <div className="flex shrink-0 gap-1">
                      {wa && (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`וואטסאפ עם ${m.profile.full_name}`}
                          className="flex size-8 items-center justify-center rounded-lg border border-(--color-line) bg-(--color-haze) text-(--color-verified) transition hover:border-(--color-verified)/50 hover:bg-(--color-verified)/10"
                        >
                          <WhatsAppIcon className="size-3.5" />
                        </a>
                      )}
                      {ig && (
                        <a
                          href={ig}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`אינסטגרם של ${m.profile.full_name}`}
                          className="flex size-8 items-center justify-center rounded-lg border border-(--color-line) bg-(--color-haze) text-(--color-sea) transition hover:border-(--color-sea)/50 hover:bg-(--color-sea)/10"
                        >
                          <InstagramIcon className="size-3.5" />
                        </a>
                      )}
                    </div>
                  )}

                  {m.role !== "organizer" && (
                    <RemoveMemberButton
                      profileId={m.profile.id}
                      fullName={m.profile.full_name}
                      gender={m.profile.gender}
                    />
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
