import { redirect } from "next/navigation";
import { getViewer, getHomeInstagramReel } from "@/lib/data";
import { BackLink } from "@/components/ui";
import { InstagramReelSettingsForm } from "@/components/instagram-reel-settings-form";
import { WhatsappGroupSettingsForm } from "@/components/whatsapp-group-settings-form";

/**
 * עריכת הרייל+תמונת הקאבר שמוצגים בכרטיס האינסטגרם בדף הבית (ראו
 * instagram-reel-showcase.tsx) וקישור קבוצת הוואטסאפ (whatsapp-group-card-row.tsx)
 * - מנהלת בלבד. קישור הפרופיל (swell__club) למעלה בכרטיס האינסטגרם
 * קבוע במכוון, לא שדה כאן.
 */
export default async function AdminInstagramPage() {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const current = await getHomeInstagramReel(viewer.club);

  return (
    <div className="space-y-6">
      <BackLink href="/admin">לניהול</BackLink>

      <div className="space-y-1">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
          רייל מהאינסטגרם של Swell Club
        </h1>
        <p className="text-sm leading-relaxed text-(--color-ink-faint)">
          הרייל והתמונה שיופיעו בכרטיס האינסטגרם בדף הבית, אצל כל חברי
          הקהילה. הקישור לפרופיל שלנו תמיד נשאר קבוע: swell__club.
        </p>
      </div>

      <InstagramReelSettingsForm
        clubId={viewer.club.id}
        currentPermalink={viewer.club.instagram_reel_permalink}
        currentCoverPath={viewer.club.instagram_reel_cover_path}
        currentCoverUrl={current.coverUrl}
      />

      <div className="space-y-1 border-t border-(--color-line) pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold">
          קבוצת הוואטסאפ
        </h2>
        <p className="text-sm leading-relaxed text-(--color-ink-faint)">
          יוצג כקישור בדף הבית. ריק = לא מוצג בכלל.
        </p>
      </div>

      <WhatsappGroupSettingsForm
        clubId={viewer.club.id}
        currentLink={viewer.club.whatsapp_group_link}
      />
    </div>
  );
}
