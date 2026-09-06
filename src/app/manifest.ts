import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Swell Club",
    short_name: "Swell Club",
    description: "מי באמת היה איתכם בים הבוקר.",
    // "/" (דף הנחיתה) בודק התחברות ומפנה ל-/events בנפרד — נסיעה כפולה
    // מיותרת בכל פתיחה מהאייקון במסך הבית. מי שכבר נכנס/ה למסך הבית
    // כבר יש לו/ה חשבון; פתיחה ישירה ל-/events חוסכת את התחנה הזו,
    // ומי שלא מחובר/ת בכלל עדיין מופנה/ית ל-/login כרגיל דרך proxy.ts.
    start_url: "/events",
    // standalone הוא מה שהופך את הקיצור במסך הבית לאפליקציה
    // ולא ללשונית ספארי. זו הדרישה המפורשת של שיר.
    display: "standalone",
    orientation: "portrait",
    background_color: "#f2f7fa",
    theme_color: "#f2f7fa",
    lang: "he",
    dir: "rtl",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
