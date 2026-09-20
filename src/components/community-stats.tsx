import { WaveIcon } from "./social-icons";

function StatTile({ count, label }: { count: number; label: string }) {
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-2xl border border-(--color-sea)/20 py-5 text-center"
      style={{
        background: "linear-gradient(155deg, #eef5fa 0%, #e2eef5 55%, #d8e9f1 100%)",
      }}
    >
      <WaveIcon className="size-4 shrink-0 text-(--color-sea)" />
      <p className="ltr-nums font-[family-name:var(--font-display)] text-3xl font-extrabold text-(--color-deep)">
        {count}
      </p>
      <p className="text-xs font-semibold text-(--color-ink-soft)">{label}</p>
    </div>
  );
}

/**
 * שני "מלבנים" ויזואליים בתחתית דף הבית — מספר גדול + אייקון, לא
 * משפט זורם — באותה שפה כמו שאר כרטיסי הבית (KnownPeopleStrip,
 * RandomEventAlbumCard): גרדיאנט תכלת בהיר, גל, גופן הכותרות. שני
 * הנתונים מתעדכנים בכל טעינה (getClubMemberCount/getMetPeopleCount
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
    <div className="grid grid-cols-2 gap-3">
      <StatTile count={memberCount} label="אנשים בקהילה" />
      <StatTile count={metCount} label="אנשים שפגשתי" />
    </div>
  );
}
