"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import type { SelfieShot } from "@/lib/data";
import { formatDateShort, formatTime } from "@/lib/format";
import { facePositionStyle } from "@/lib/face-position";
import { cx } from "./ui";
import { PhotoLightbox } from "./photo-lightbox";

function CollageImg({
  src,
  className,
  style,
}: {
  src: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      className={cx("size-full object-cover", className)}
      style={style}
    />
  );
}

/**
 * תצוגת המפגש בכרטיס: קולאז' מאלבום המפגש כשיש תמונות בו (עד 4,
 * במבנה שמתאים לכמות), ורק אם אין — נופל חזרה לסלפי של האדם עצמו.
 * מיקום הפנים רלוונטי רק לנפילה־חזרה הזו — תמונות אלבום הן תמונות
 * אירוע רגילות, לא סלפים שעברו זיהוי פנים.
 */
function EventThumbnail({
  album,
  selfieUrl,
  selfiePosition,
}: {
  album: string[];
  selfieUrl: string | null;
  selfiePosition: CSSProperties;
}) {
  if (album.length >= 4) {
    return (
      <div className="grid size-full grid-cols-2 grid-rows-2 gap-0.5">
        {album.slice(0, 4).map((src, i) => (
          <CollageImg key={i} src={src} />
        ))}
      </div>
    );
  }

  if (album.length === 3) {
    return (
      <div className="grid size-full grid-cols-2 grid-rows-2 gap-0.5">
        <CollageImg src={album[0]} className="row-span-2" />
        <CollageImg src={album[1]} />
        <CollageImg src={album[2]} />
      </div>
    );
  }

  if (album.length === 2) {
    return (
      <div className="grid size-full grid-cols-2 gap-0.5">
        <CollageImg src={album[0]} />
        <CollageImg src={album[1]} />
      </div>
    );
  }

  if (album.length === 1) {
    return <CollageImg src={album[0]} />;
  }

  if (selfieUrl) {
    return <CollageImg src={selfieUrl} style={selfiePosition} />;
  }

  return (
    <div className="flex size-full items-center justify-center text-[0.65rem] text-(--color-ink-faint)">
      נוסף ידנית
    </div>
  );
}

/**
 * גלריית המפגשים של אדם אחד, מהאחרון לראשון.
 *
 * התמונה שמייצגת כל מפגש היא קולאז' מאלבום המפגש (כשיש), ולא רק
 * הסלפי של האדם הזה — זו הזיכרון המשותף של כולם, לא רק שלו. הסלפי
 * הוא רק גיבוי כשלמפגש עדיין אין אלבום. לחיצה על אריח מעבירה לעמוד
 * המפגש עצמו — תצוגת מסך-מלא עם דפדוף בין הסלפים נמצאת רק בעיגול
 * תמונת הפרופיל למעלה (ראו SelfieAvatarButton), לא כאן.
 *
 * `eventLinkQuery`: מחרוזת query מוכנה (בלי "?") שנוספת לקישור לכל
 * מפגש, כדי שכפתור החזרה שם ידע לאן להוביל בחזרה — ראו events/[id]/
 * page.tsx. כל קורא/ת (עמוד פרופיל, עמוד חבר קהילה בניהול) בונה את
 * ה-query המתאים להֶקשר שלו.
 */
export function SelfieHistory({
  shots,
  albumsByEvent,
  eventLinkQuery,
}: {
  shots: SelfieShot[];
  albumsByEvent?: Map<string, string[]>;
  eventLinkQuery?: string;
}) {
  if (shots.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-(--color-line) px-4 py-8 text-center text-sm text-(--color-ink-faint)">
        עוד אין סלפים - הם נוצרים בכל צ׳ק־אין למפגש.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-3 gap-2.5">
      {shots.map((shot) => (
        <li key={shot.eventId}>
          <Link
            href={`/events/${shot.eventId}${eventLinkQuery ? `?${eventLinkQuery}` : ""}`}
            className="block overflow-hidden rounded-xl border border-(--color-line) bg-(--color-surface) transition hover:border-(--color-sky)"
          >
            <div className="aspect-square w-full overflow-hidden bg-(--color-haze)">
              <EventThumbnail
                album={albumsByEvent?.get(shot.eventId) ?? []}
                selfieUrl={shot.selfieUrl}
                selfiePosition={facePositionStyle(shot.faceX, shot.faceY)}
              />
            </div>
            <div className="px-2 py-1.5">
              <p className="truncate text-[0.7rem] font-semibold">
                {shot.eventTitle}
              </p>
              <p className="truncate text-[0.65rem] text-(--color-ink-faint)">
                {formatDateShort(shot.startsAt)}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * עיגול תמונת הפרופיל בראש עמוד הפרופיל העצמי — התמונה עצמה היא
 * הסלפי האחרון, ולחיצה עליה פותחת את אותה תצוגת מסך-מלא עם דפדוף
 * כמו אריח בגלריית "הרגעים מהסוואל" למטה (ראו SelfieHistory), רק
 * שמתחילה מהסלפי האחרון. כשאין עדיין אף סלפי, נשארת בדיוק כמו
 * שהייתה — עיגול עם האות הראשונה של השם, לא לחיץ.
 */
export function SelfieAvatarButton({
  shots,
  fullName,
  className,
}: {
  shots: SelfieShot[];
  fullName: string;
  className?: string;
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const selfieShots = shots.filter((s) => s.selfieUrl);
  const latest = selfieShots[0];

  if (!latest) {
    return (
      <div className={className}>
        <span
          aria-hidden
          className="font-[family-name:var(--font-display)] text-2xl font-bold text-(--color-sea)"
        >
          {fullName.trim()[0]}
        </span>
      </div>
    );
  }

  const lightboxPhotos = selfieShots.map((s) => ({
    id: s.eventId,
    url: s.selfieUrl!,
  }));

  return (
    <>
      <button
        type="button"
        onClick={() => setViewerIndex(0)}
        aria-label="הגדלת תמונת הפרופיל"
        className={className}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={latest.selfieUrl!}
          alt={fullName}
          className="size-full object-cover"
          style={facePositionStyle(latest.faceX, latest.faceY)}
        />
      </button>

      {viewerIndex !== null && selfieShots[viewerIndex] && (
        <PhotoLightbox
          photos={lightboxPhotos}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          footer={
            <p className="pb-6 text-center text-xs font-semibold text-white/80">
              {formatDateShort(selfieShots[viewerIndex].startsAt)}
            </p>
          }
        />
      )}
    </>
  );
}

/** שורת מידע קטנה על הסלפי האחרון — לכרטיס החבר בצד הניהול */
export function LatestShotLabel({ shot }: { shot: SelfieShot }) {
  return (
    <span className="text-[0.7rem] text-(--color-ink-faint)">
      אחרון: {formatDateShort(shot.startsAt)} ·{" "}
      <span className="ltr-nums">{formatTime(shot.startsAt)}</span>
    </span>
  );
}
