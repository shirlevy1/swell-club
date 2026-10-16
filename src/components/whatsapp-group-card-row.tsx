import { WhatsAppIcon, ExternalLinkIcon } from "./social-icons";

/**
 * קישור לקבוצת הוואטסאפ של Swell Club, בדף הבית מתחת לכרטיס
 * האינסטגרם - מנהלת הקהילה קובעת את הקישור ב-admin/instagram
 * (whatsapp-group-settings-form.tsx). לא מוצג בכלל אם עוד לא הוגדר.
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
      <span className="flex-1 text-sm font-bold text-(--color-ink)">
        Swell Club
      </span>
      <ExternalLinkIcon className="size-4 shrink-0 text-(--color-ink-faint)" />
    </a>
  );
}
