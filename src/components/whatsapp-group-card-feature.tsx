import { WhatsAppIcon } from "./social-icons";
import { LinkButton } from "./ui";

/**
 * אפשרות עיצוב 4 לכרטיס קבוצת הוואטסאפ (זמני, להשוואה - ראו שיחה עם
 * שיר). כרטיס ממורכז עם כפתור נפרד, בסגנון "פרסומת"/empty-state, לא
 * כל הכרטיס לחיץ אלא רק הכפתור.
 */
export function WhatsappGroupCardFeature({ link }: { link: string | null }) {
  if (!link) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-(--color-line) bg-(--color-surface) p-5 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-(--color-verified)/10 text-(--color-verified)">
        <WhatsAppIcon className="size-7" />
      </span>
      <div className="space-y-1">
        <p className="font-[family-name:var(--font-display)] text-base font-bold text-(--color-ink)">
          קבוצת הוואטסאפ של Swell Club
        </p>
        <p className="text-xs leading-relaxed text-(--color-ink-faint)">
          כל העדכונים, התיאומים והשיחה השוטפת של הקהילה - במקום אחד.
        </p>
      </div>
      <LinkButton href={link} target="_blank" rel="noreferrer" className="w-full">
        הצטרפות לקבוצה
      </LinkButton>
    </div>
  );
}
