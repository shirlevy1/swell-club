import { WaveIcon } from "./social-icons";

/** "אדם אחד" ליחיד, "X אנשים" (עם ltr-nums על הספרה בלבד) לרבים —
 * אותו כלל יחיד/רבים כמו בכל מקום אחר באתר. */
function PeopleCount({ count }: { count: number }) {
  if (count === 1) return "אדם אחד";
  return (
    <>
      <span className="ltr-nums">{count}</span> אנשים
    </>
  );
}

/**
 * שתי סטטיסטיקות שקטות בתחתית דף הבית — לא כרזה, רק שורה עם מספר.
 * שני הנתונים מתעדכנים בכל טעינה (getClubMemberCount/getMetPeopleCount
 * ב-lib/data.ts), לא מטמון: "עדכני תמיד" היה תנאי מפורש.
 */
export function CommunityStats({
  memberCount,
  metCount,
}: {
  memberCount: number;
  metCount: number;
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-(--color-line) bg-(--color-surface) p-4">
      <p className="flex items-center gap-2 text-sm text-(--color-ink-soft)">
        <WaveIcon className="size-4 shrink-0 text-(--color-sea)" />
        <b className="font-bold text-(--color-ink)">
          <PeopleCount count={memberCount} />
        </b>
        בקהילה
      </p>
      <p className="flex items-center gap-2 text-sm text-(--color-ink-soft)">
        <WaveIcon className="size-4 shrink-0 text-(--color-sea)" />
        <b className="font-bold text-(--color-ink)">
          <PeopleCount count={metCount} />
        </b>
        שפגשתי
      </p>
    </div>
  );
}
