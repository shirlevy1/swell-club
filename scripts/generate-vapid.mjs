/**
 * מייצר זוג מפתחות VAPID להתראות דחיפה.
 *
 *   node scripts/generate-vapid.mjs
 *
 * להריץ **פעם אחת**. המפתח הפרטי הוא סוד: הוא נכנס למשתני הסביבה
 * בלבד, לא ל-git ולא להודעה. החלפת המפתחות מנתקת את כל המנויים
 * הקיימים, ולכן לא כדאי לייצר מחדש סתם.
 */
import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log(`
להוסיף למשתני הסביבה (Railway → Variables, ומקומית ל-.env.local):

NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}
VAPID_PRIVATE_KEY=${privateKey}
VAPID_CONTACT=mailto:<האימייל שלך>
PUSH_CRON_SECRET=${crypto.randomUUID()}

הציבורי נשלח לדפדפן ולכן מסומן NEXT_PUBLIC_. הפרטי — לעולם לא.
`);
