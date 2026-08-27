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

// אותם שמות בדיוק כמו ב-visibility-refresh.tsx — הערוץ המשותף היחיד
// בין ה-service worker לעמוד (Cache Storage, בניגוד ל-localStorage,
// נגיש משני הצדדים).
const NAV_CACHE = "swell-pending-nav";
const NAV_KEY = "/pending-nav";

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/events";

  // openWindow/navigate/postMessage לחלון קיים כולם נכשלים בפועל
  // ב-PWA שמור-למסך-הבית (בעיקר iOS): חלון "פתוח" ברקע הוא לרוב
  // מוקפא, ה-JS שלו לא רץ, ושום קריאה מה-SW אליו לא נקלטת — נבדק
  // ונכשל שלוש פעמים. הפתרון: משאירים כאן יעד ממתין ב-Cache Storage,
  // וברגע שהאפליקציה קמה לתחייה (visibility-refresh.tsx כבר מקשיב
  // בדיוק לרגע הזה) היא בעצמה קוראת אותו ומנווטת.
  event.waitUntil(
    caches
      .open(NAV_CACHE)
      .then((cache) => cache.put(NAV_KEY, new Response(target)))
      .then(() => clients.openWindow(target)),
  );
});
