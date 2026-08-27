/**
 * Service worker — קיים בשביל התראות דחיפה בלבד.
 *
 * ⚠️ אין כאן קאשינג. קאש של מסכים באפליקציה שכל כולה "מי נמצא כאן
 * עכשיו" יגרום להצגת רשימת משתתפים ישנה, וזה גרוע יותר מלהיות אופליין.
 *
 * skipWaiting/clients.claim(): בלעדיהם, גרסה חדשה של הקובץ הזה
 * נכנסת ל"המתנה" ולא מפעילה את עצמה עד שכל הטאבים/האפליקציה נסגרים
 * לגמרי — מה שגרם לתיקון ניווט-בלחיצה-על-התראה לא לתפוס בפועל
 * למרות שהקובץ כבר עודכן. עכשיו כל עדכון תופס מיד.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "Swell";
  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    dir: "rtl",
    lang: "he",
    // מפגש אחד = התראה אחת. תזכורת הערב ותזכורת הבוקר מחליפות
    // זו את זו במקום להיערם.
    tag: payload.tag || "swell-event",
    renotify: true,
    data: { url: payload.url || "/events" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/events";

  // תמיד openWindow, בלי לנסות לתפוס חלון קיים ולנווט/להעביר לו
  // הודעה: ב-PWA שמור-למסך-הבית (בעיקר iOS) חלון "פתוח" הוא לרוב
  // מוקפא ברקע, לא JS חי — אז גם client.navigate() וגם postMessage
  // אליו פשוט לא נקלטים, וכל מה שקורה בפועל הוא focus() על המסך
  // הקפוא. openWindow מכריח ניווט אמיתי; רוב הדפדפנים ממילא מזהים
  // שהאפליקציה כבר פתוחה ומביאים אותה לחזית עם היעד הזה, במקום
  // לפתוח עוד עותק.
  event.waitUntil(clients.openWindow(target));
});
