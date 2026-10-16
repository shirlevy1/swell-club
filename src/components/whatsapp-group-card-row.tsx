import { WhatsAppIcon, ExternalLinkIcon } from "./social-icons";

/**
 * אפשרות עיצוב 3 לכרטיס קבוצת הוואטסאפ (זמני, להשוואה - ראו שיחה עם
 * שיר). שורה נקייה עם שתי שורות טקסט, בסגנון רשימה (כמו שורת הגדרה
 * באפליקציה רגילה) ולא "באנר".
 */
export function WhatsappGroupCardRow({ link }: { link: string | null }) {
  if (!link) return null;

  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-(--color-line) bg-(--color-surface) p-4 transition active:scale-[0.99]"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-(--color-verified)/10 text-(--color-verified)">
        <WhatsAppIcon className="size-5" />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-bold text-(--color-ink)">
          קבוצת הוואטסאפ
        </span>
        <span className="block text-xs text-(--color-ink-faint)">
          Swell Club
        </span>
      </span>
      <ExternalLinkIcon className="size-4 shrink-0 text-(--color-ink-faint)" />
    </a>
  );
}
