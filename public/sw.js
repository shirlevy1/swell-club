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

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        // אם האפליקציה כבר פתוחה — מעבירים לה הודעה שתנווט בעצמה.
        // client.navigate() לא אמין בכל דפדפן/PWA (בעיקר iOS Safari
        // בשמור-למסך-הבית) — בלי זה הלחיצה רק מביאה לחזית את המסך
        // האחרון שהיה פתוח, לא את המפגש שההתראה מדברת עליו.
        for (const client of list) {
          if ("focus" in client) {
            client.postMessage({ type: "swell-navigate", url: target });
            return client.focus();
          }
        }
        return clients.openWindow(target);
      }),
  );
});
