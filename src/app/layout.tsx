import type { Metadata, Viewport } from "next";
import { Rubik, Assistant } from "next/font/google";
import "./globals.css";

// רוביק לכותרות — עגול וחברי, מתאים לקהילה יותר מגופן עריכתי-פורמלי.
const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
  weight: ["500", "700"],
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
  // Next 16 שולחת רק את התווית התקנית החדשה (mobile-web-app-capable)
  // כשמגדירים appleWebApp.capable — לא את התווית הישנה עם קידומת
  // apple- שאייפון דרש/דורש עדיין בגרסאות iOS שלא הספיקו לתמוך
  // בתווית התקנית (זה קרה רק החל מ-iOS/Safari 17.4). בלי שתיהן,
  // אייפון ישן יותר לא בהכרח מזהה את האתר כ"אפליקציה" במסך מלא בכלל —
  // כולל מסך הפתיחה שמותנה בדיוק בזיהוי הזה.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  appleWebApp: {
    capable: true,
    title: "Swell Club",
    statusBarStyle: "default",
    // בלי זה, אייפון מתעלם מ-background_color של המניפסט בזמן הטעינה
    // הראשונית מהאייקון במסך הבית, ומציג מסך ריק/שחור עד שהעמוד עצמו
    // עולה. כל גודל מסך צריך תמונה בפיקסלים המדויקים שלו — אייפון לא
    // מותח/מקטין תמונה אחת לכל המכשירים. פורטרט בלבד, כי האתר נעול
    // לכיוון הזה. נוצר ע"י scripts/generate-splash-images (ראו public/splash).
    startupImage: [
      // בלי media בכלל — רשת ביטחון למכשיר שלא נמצא באף אחת מהמידות
      // המדויקות למטה (למשל דגם חדש שיצא אחרי הרשימה הזו). בלעדיה,
      // אייפון "ממציא" מסך משלו מהצבע/מהתיאור במניפסט, במקום להציג
      // את התמונה שלנו בכלל.
      { url: "/splash/splash-1170x2532.png" },
      { url: "/splash/splash-750x1334.png", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/splash/splash-828x1792.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/splash/splash-1080x2340.png", media: "(device-width: 360px) and (device-height: 780px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1125x2436.png", media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1170x2532.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1179x2556.png", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1206x2622.png", media: "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1242x2688.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1284x2778.png", media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1290x2796.png", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1320x2868.png", media: "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
    ],
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
      className={`${rubik.variable} ${assistant.variable} h-dvh antialiased`}
    >
      {/* dvh ולא h-full/min-h-full: שרשרת height:100% נכונה רק אם
          כל האבות בדרך מוגדרים בגובה מפורש, ובנייד (בעיקר ספארי
          באייפון) 100% נוטה להסתמך על הגובה המלא-כשהעמודה מוסתרת —
          לא הגובה הנראה בפועל. כשהתוכן קצר מהמסך (למשל אחרי שריכזנו
          את רשימת המפגשים ל-10 בלבד), זה גורם לעטיפת ה-flex לא
          למתוח עד תחתית המסך האמיתית — וה-nav הקבוע (position:fixed;
          bottom:0) שיושב בתוכה "קופץ" לאמצע העמוד במקום להישאר צמוד
          לתחתית. dvh נועד בדיוק לזה: תמיד הגובה הנראה בפועל. */}
      <body className="min-h-dvh flex flex-col">{children}</body>
    </html>
  );
}
