import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Swell Club",
    short_name: "Swell Club",
    description: "מי באמת היה איתכם בים הבוקר.",
    start_url: "/",
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
