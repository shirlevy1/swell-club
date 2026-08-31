import type { Metadata, Viewport } from "next";
import { Frank_Ruhl_Libre, Assistant } from "next/font/google";
import "./globals.css";

// פרנק־רוהל הוא פני הספר העברי הקלאסי. הוא נותן ל־Swell כובד עריכתי
// שגופן גיאומטרי לא היה נותן — זו קהילה של אנשים, לא אפליקציית כושר.
const frank = Frank_Ruhl_Libre({
  variable: "--font-frank",
  subsets: ["hebrew", "latin"],
  weight: ["500", "700", "900"],
});

const assistant = Assistant({
  variable: "--font-assistant",
  subsets: ["hebrew", "latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Swell Club",
  description: "מי באמת היה איתכם בים הבוקר.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Swell Club",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icon-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#f2f7fa",
  // viewportFit נדרש כדי שהרקע ימשיך אל מאחורי המדרגה באייפון
  viewportFit: "cover",
  // השחיינים משתמשים בזה בשמש עם ידיים רטובות — אבל חסימת זום
  // פוגעת בנגישות, ולכן מותר להגדיל עד פי 5.
  maximumScale: 5,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${frank.variable} ${assistant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
