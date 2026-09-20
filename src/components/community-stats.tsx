function StatTile({ count, label }: { count: number; label: string }) {
  return (
    <div
      className="rounded-2xl border border-(--color-sea)/20 px-3 py-3 text-center"
      style={{
        background: "linear-gradient(155deg, #eef5fa 0%, #e2eef5 55%, #d8e9f1 100%)",
      }}
    >
      <p className="ltr-nums font-[family-name:var(--font-display)] text-xl font-extrabold text-(--color-deep)">
        {count}
      </p>
      <p className="text-xs font-semibold text-(--color-ink-soft)">{label}</p>
    </div>
  );
}

/**
 * שני "מלבנים" ויזואליים בתחתית דף הבית — מספר + תווית, לא משפט
 * זורם — בגרדיאנט התכלת הבהיר של שאר כרטיסי הבית (KnownPeopleStrip,
 * RandomEventAlbumCard). בלי אייקון ובגודל טקסט מתון (text-xl, לא
 * text-3xl) — גרסה קודמת עם גל וגופן ענק הרגישה גדולה מדי ולא
 * פרופורציונלית לשאר האתר. שני הנתונים מתעדכנים בכל טעינה
 * (getClubMemberCount/getMetPeopleCount ב-lib/data.ts), לא מטמון:
 * "עדכני תמיד" היה תנאי מפורש.
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
      <StatTile count={memberCount} label="חברי קהילה" />
      <StatTile count={metCount} label="כבר פגשתי" />
    </div>
  );
}
