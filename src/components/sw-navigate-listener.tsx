"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * מקשיבה להודעות מ-service worker (sw.js) על לחיצה על התראה כשהאפליקציה
 * כבר פתוחה. ה-SW מנסה להביא את החלון לחזית ולנווט אותו, אבל
 * client.navigate() לא אמין בכל דפדפן/PWA — postMessage + ניווט כאן
 * בצד הלקוח (עם router של Next, לא רענון מלא) הוא הדרך האמינה.
 */
export function ServiceWorkerNavigateListener() {
  const router = useRouter();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function onMessage(event: MessageEvent) {
      if (event.data?.type === "swell-navigate" && event.data.url) {
        router.push(event.data.url);
      }
    }

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, [router]);

  return null;
}
