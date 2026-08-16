/**
 * Service worker — קיים בשביל התראות דחיפה בלבד.
 *
 * ⚠️ אין כאן קאשינג. קאש של מסכים באפליקציה שכל כולה "מי נמצא כאן
 * עכשיו" יגרום להצגת רשימת משתתפים ישנה, וזה גרוע יותר מלהיות אופליין.
 */

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
        // אם האפליקציה כבר פתוחה — לעבור אליה במקום לפתוח עוד חלון
        for (const client of list) {
          if ("focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return clients.openWindow(target);
      }),
  );
});
