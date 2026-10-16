import { redirect } from "next/navigation";
import { getViewer, getOwnPrivateInfo } from "@/lib/data";
import { ProfileForm } from "@/components/profile-form";

export default async function ProfileEditPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  // מצב תיאורטי — פרופיל נוצר אוטומטית בהרשמה. בלי דף ריק שלא עושה כלום.
  if (!viewer.profile) redirect("/profile");

  const privateInfo = await getOwnPrivateInfo(viewer.userId);

  // הכותרת וכפתור החזרה עברו לתוך ProfileForm עצמו — כפתור "לפרופיל"
  // צריך לדעת אם הטופס dirty לפני שהוא מפנה (ראו edit-event-schedule-
  // form.tsx לאותו דפוס בדיוק), וזה נתון שקיים רק בקומפוננטת הלקוח.
  return <ProfileForm profile={viewer.profile} privateInfo={privateInfo} />;
}
