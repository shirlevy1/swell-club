import { WhatsAppIcon, ExternalLinkIcon } from "./social-icons";

/**
 * אפשרות עיצוב 2 לכרטיס קבוצת הוואטסאפ (זמני, להשוואה - ראו שיחה עם
 * שיר). גרדיאנט תכלת, אותו סגנון בדיוק כמו random-event-album.tsx -
 * כדי שתהיה עקביות אם זו הגרסה שתיבחר.
 */
export function WhatsappGroupCardBanner({ link }: { link: string | null }) {
  if (!link) return null;

  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-4 rounded-2xl border border-(--color-sea)/20 p-4 transition active:scale-[0.99]"
      style={{
        background:
          "radial-gradient(120% 140% at 85% 0%, rgba(146,173,197,.35), transparent 60%), linear-gradient(155deg, #eef5fa 0%, #e2eef5 55%, #d8e9f1 100%)",
      }}
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-(--color-verified)/15 text-(--color-verified)">
        <WhatsAppIcon className="size-6" />
      </span>
      <span className="flex-1 space-y-0.5">
        <span className="block font-[family-name:var(--font-display)] text-base font-bold text-(--color-deep)">
          הצטרפו לקבוצת הוואטסאפ
        </span>
        <span className="block text-xs text-(--color-ink-soft)">
          עדכונים ותיאומים של Swell Club, בזמן אמת
        </span>
      </span>
      <ExternalLinkIcon className="size-4 shrink-0 text-(--color-sea)" />
    </a>
  );
}
