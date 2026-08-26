import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data";
import { BackLink } from "@/components/ui";
import { ProfileForm } from "@/components/profile-form";
import { NotificationToggle } from "@/components/notification-toggle";

export default async function ProfileEditPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  // מצב תיאורטי — פרופיל נוצר אוטומטית בהרשמה. בלי דף ריק שלא עושה כלום.
  if (!viewer.profile) redirect("/profile");

  return (
    <div className="space-y-6">
      <BackLink href="/profile">לפרופיל</BackLink>

      <div className="space-y-1">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
          עריכת פרופיל
        </h1>
        <p className="text-sm text-(--color-ink-soft)">
          הפרטים שלכם נראים רק לחברי קהילה שהיו איתכם באותו מפגש.
        </p>
      </div>

      <ProfileForm profile={viewer.profile} />

      <NotificationToggle />
    </div>
  );
}
