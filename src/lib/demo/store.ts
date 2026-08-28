import type { Club, MemberRole, Profile, SwellEvent } from "../types";
import { DEFAULT_EVENT_LOCATION } from "../maps";

/**
 * מאגר בזיכרון למצב הדגמה. אין מסד נתונים ואין התחברות —
 * הכל חי בתהליך אחד של `npm run dev` ונמחק כשעוצרים אותו.
 *
 * מטרה: להראות איך המוצר עובד, לא לשמור נתונים.
 */

const CLUB: Club = {
  id: "demo-club",
  name: "Swell Club",
  slug: "swell",
  description: "קהילת השחיינים",
};

const ME_ID = "demo-me";

const PEOPLE: [string, string | null, string, string][] = [
  ["שיר לוי", "shirlevi", "תל אביב-יפו", "1994-03-11"],
  ["נועה ברק", "noa.barak", "הרצליה", "1991-07-22"],
  ["יונתן שגב", null, "בת ים", "1988-12-02"],
  ["מאיה אלון", "maya_alon", "רמת גן", "1996-05-30"],
  ["דניאל רז", "danielraz", "גבעתיים", "1990-09-14"],
  ["תמר כהן", null, "חולון", "1993-01-27"],
  ["איתי גל", "itaygal", "רעננה", "1987-06-08"],
  ["רוני שמש", "roni.shemesh", "נתניה", "1995-11-19"],
];

function profiles(): Profile[] {
  const me: Profile = {
    id: ME_ID,
    full_name: "לירון חגבי",
    phone: "0501234567",
    instagram: "lironhagbi",
    birth_date: "1992-04-16",
    city: "תל אביב-יפו",
    gender: null,
    swim_level: null,
    waiver_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    avatar_path: null,
    created_at: new Date().toISOString(),
  };

  return [
    me,
    ...PEOPLE.map(([name, ig, city, birthDate], i) => ({
      id: `demo-p${i + 1}`,
      full_name: name,
      phone: `05${(10_000_000 + i * 111_111).toString().slice(0, 8)}`,
      instagram: ig,
      birth_date: birthDate,
      city,
      gender: null,
    swim_level: null,
      waiver_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
      avatar_path: `/demo/avatar-${i + 1}.png`,
      created_at: new Date().toISOString(),
    })),
  ];
}

/**
 * המפגשים נשמרים יחסית ל"עכשיו" ולא כתאריכים קבועים, כדי שההדגמה
 * תיפול תמיד על אותם מצבים — אחד פתוח לצ'ק־אין, אחד עתידי, שניים שהיו.
 *
 * `offsetMin` למפגש הפתוח (חייב להיות סמוך לשעה הנוכחית כדי שחלון
 * הצ'ק־אין ייפתח), ו־`days` לרוב השאר — שנוחתים על 6:45 בבוקר כמו
 * מפגש אמיתי, ותמיד יחסית ל"עכשיו" כדי שההדגמה תיראה טרייה בכל יום.
 *
 * `fixedStartsAt` הוא היוצא מן הכלל: תאריך **קבוע**, לא יחסי. חובה
 * למפגש שקשור לתאריך אמיתי בעולם החיצון — למשל תחזית הים מ-GoSurf
 * לפי היום בפועל. `days` היה שובר את זה בשקט: "עוד 5 ימים" זז יום
 * קדימה בכל יום שעובר, וביום כלשהו כבר לא נופל על התאריך שהתחזית
 * אכן קיימת בשבילו.
 *
 * `title` נשאר ריק למפגש הפתוח: הוא נופל על השעה הנוכחית, ולכן הכותרת
 * נגזרת ממנה. אחרת ההדגמה מציגה "שחיית בוקר" בשש בערב.
 */
type EventSeed = Omit<SwellEvent, "starts_at" | "title"> & {
  title?: string;
} & (
    | { offsetMin: number; days?: never; fixedStartsAt?: never }
    | { days: number; offsetMin?: never; fixedStartsAt?: never }
    | { fixedStartsAt: string; days?: never; offsetMin?: never }
  );

/** כותרת שמתאימה לשעה שבה המפגש באמת מתקיים */
function swimTitleFor(date: Date): string {
  const h = date.getHours();
  if (h >= 5 && h < 10) return "שחיית בוקר";
  if (h >= 10 && h < 16) return "שחיית צהריים";
  if (h >= 16 && h < 20) return "שחיית שקיעה";
  return "שחיית לילה";
}

const EVENT_SEEDS: EventSeed[] = [
  {
    id: "demo-e-now",
    club_id: CLUB.id,
    offsetMin: 5,
    location_name: "חוף הילטון",
    lat: 32.0899,
    lng: 34.7716,
    maps_url: null,
    checkin_radius_m: 150,
    checkin_opens_before_min: 15,
    // חלון רחב בכוונה: ההדגמה צריכה להישאר פתוחה לאורך כל השיחה
    checkin_closes_after_min: 180,
    created_by: ME_ID,
    created_at: new Date().toISOString(),
    description: null,
    agenda_text: null,
    agenda_visible: true,
    equipment_text: null,
    equipment_visible: true,
    equipment_link_visible: true,
    is_sea: true,
  },
  {
    id: "demo-e-next",
    club_id: CLUB.id,
    title: "שחיית בוקר",
    days: 3,
    location_name: "חוף הילטון",
    lat: 32.0899,
    lng: 34.7716,
    maps_url: null,
    checkin_radius_m: 150,
    checkin_opens_before_min: 15,
    checkin_closes_after_min: 15,
    created_by: ME_ID,
    created_at: new Date().toISOString(),
    description: null,
    agenda_text: null,
    agenda_visible: true,
    equipment_text: null,
    equipment_visible: true,
    equipment_link_visible: true,
    is_sea: true,
  },
  {
    id: "demo-e-thu",
    club_id: CLUB.id,
    title: "שחיית בוקר",
    // יום חמישי 20.8.2026, 06:45 שעון ישראל — תאריך קבוע, לא "עוד 5
    // ימים", כי התחזית מ-GoSurf נשלפת בדיוק לפי התאריך הזה.
    fixedStartsAt: "2026-08-20T03:45:00.000Z",
    location_name: DEFAULT_EVENT_LOCATION.name,
    lat: DEFAULT_EVENT_LOCATION.lat,
    lng: DEFAULT_EVENT_LOCATION.lng,
    maps_url: DEFAULT_EVENT_LOCATION.mapsUrl,
    checkin_radius_m: 150,
    checkin_opens_before_min: 15,
    checkin_closes_after_min: 15,
    created_by: ME_ID,
    created_at: new Date().toISOString(),
    description: null,
    agenda_text: null,
    agenda_visible: true,
    equipment_text: null,
    equipment_visible: true,
    equipment_link_visible: true,
    is_sea: true,
  },
  {
    id: "demo-e-past1",
    club_id: CLUB.id,
    title: "שחייה ארוכה",
    days: -5,
    location_name: "חוף מציצים",
    lat: 32.0935,
    lng: 34.7702,
    maps_url: null,
    checkin_radius_m: 150,
    checkin_opens_before_min: 15,
    checkin_closes_after_min: 15,
    created_by: ME_ID,
    created_at: new Date().toISOString(),
    description: null,
    agenda_text: null,
    agenda_visible: true,
    equipment_text: null,
    equipment_visible: true,
    equipment_link_visible: true,
    is_sea: true,
  },
  {
    id: "demo-e-album",
    club_id: CLUB.id,
    title: "שחיית בוקר",
    // אתמול — עבר, כדי שאפשר יהיה להעלות לאלבום מיד, בלי תמונות
    // מוכנות מראש. זה בדיוק המפגש להדגמת הפיצ'ר.
    days: -1,
    location_name: "חוף הילטון",
    lat: 32.0899,
    lng: 34.7716,
    maps_url: null,
    checkin_radius_m: 150,
    checkin_opens_before_min: 15,
    checkin_closes_after_min: 15,
    created_by: ME_ID,
    created_at: new Date().toISOString(),
    description: null,
    agenda_text: null,
    agenda_visible: true,
    equipment_text: null,
    equipment_visible: true,
    equipment_link_visible: true,
    is_sea: true,
  },
  {
    id: "demo-e-past2",
    club_id: CLUB.id,
    title: "זריחה בחוף",
    days: -12,
    location_name: DEFAULT_EVENT_LOCATION.name,
    lat: DEFAULT_EVENT_LOCATION.lat,
    lng: DEFAULT_EVENT_LOCATION.lng,
    maps_url: DEFAULT_EVENT_LOCATION.mapsUrl,
    checkin_radius_m: 150,
    checkin_opens_before_min: 15,
    checkin_closes_after_min: 15,
    created_by: ME_ID,
    created_at: new Date().toISOString(),
    description: null,
    agenda_text: null,
    agenda_visible: true,
    equipment_text: null,
    equipment_visible: true,
    equipment_link_visible: true,
    is_sea: true,
  },
];

export type DemoAttendance = {
  eventId: string;
  profileId: string;
  selfie: string | null;
  at: string;
  // מרכז הפנים (0–1), לחיתוך ממורכז. ראו lib/face-position.ts
  faceX: number | null;
  faceY: number | null;
};

export type DemoEventPhoto = {
  id: string;
  eventId: string;
  url: string;
  addedAt: string;
  status: "pending" | "approved";
  uploadedBy: string;
};

type DemoDb = {
  profiles: Profile[];
  rsvps: { eventId: string; profileId: string; going: boolean }[];
  attendances: DemoAttendance[];
  eventPhotos: DemoEventPhoto[];
  // התפקיד של "אני" בהדגמה. ניתן להחלפה כדי להראות את שני הצדדים —
  // מנהלת קהילה מול חבר רגיל — באותה הדגמה. ברירת המחדל היא מנהלת,
  // כי זה הצד שיש בו יותר להראות.
  myRole: MemberRole;
};

function seed(): DemoDb {
  const all = profiles();
  const others = all.filter((p) => p.id !== ME_ID);

  const attendanceFor = (eventId: string, who: Profile[]): DemoAttendance[] =>
    who.map((p) => ({
      eventId,
      profileId: p.id,
      selfie: p.avatar_path,
      at: new Date().toISOString(),
      faceX: null,
      faceY: null,
    }));

  const rsvpFor = (eventId: string, who: Profile[]) =>
    who.map((p) => ({ eventId, profileId: p.id, going: true }));

  return {
    profiles: all,
    // תמיד יותר נרשמים מנוכחים — הפער הזה הוא בדיוק מה שהמארגנת
    // רוצה לראות, ומה שאי אפשר למדוד היום.
    rsvps: [
      ...rsvpFor("demo-e-now", others.slice(0, 6)),
      ...rsvpFor("demo-e-next", others.slice(0, 4)),
      ...rsvpFor("demo-e-past1", others),
      ...rsvpFor("demo-e-past2", others.slice(0, 7)),
      ...rsvpFor("demo-e-album", others.slice(0, 5)),
    ],
    attendances: [
      // מפגש שהייתי בו — הרשימה תיפתח
      ...attendanceFor("demo-e-past1", others.slice(0, 6)),
      {
        eventId: "demo-e-past1",
        profileId: ME_ID,
        selfie: "/demo/avatar-9.png",
        at: new Date().toISOString(),
        faceX: null,
        faceY: null,
      },
      // מפגש שלא הייתי בו — הרשימה נעולה. זה מדגים את כל הרעיון.
      ...attendanceFor("demo-e-past2", others.slice(2, 7)),
      // מי שכבר סימן הגעה למפגש הפתוח
      ...attendanceFor("demo-e-now", others.slice(0, 3)),
      // המפגש להדגמת אלבום התמונות — עבר, ואני נכחתי בו
      ...attendanceFor("demo-e-album", others.slice(0, 4)),
      {
        eventId: "demo-e-album",
        profileId: ME_ID,
        selfie: "/demo/avatar-9.png",
        at: new Date().toISOString(),
        faceX: null,
        faceY: null,
      },
    ],
    // אלבום לדוגמה, כדי שהפיצ'ר יהיה גלוי מיד ולא רק אחרי העלאה ידנית
    eventPhotos: [3, 6, 9].map((n, i) => ({
      id: `demo-photo-${i + 1}`,
      eventId: "demo-e-past1",
      url: `/demo/avatar-${n}.png`,
      addedAt: new Date().toISOString(),
      status: "approved" as const,
      uploadedBy: others[0]?.id ?? ME_ID,
    })),
    myRole: "organizer",
  };
}

// נשמר על globalThis כדי לשרוד hot reload בזמן פיתוח
const g = globalThis as unknown as { __swellDemo?: DemoDb };
function db(): DemoDb {
  if (!g.__swellDemo) g.__swellDemo = seed();
  return g.__swellDemo;
}

// ------------------------------------------------------------------ קריאה

export const demoClub = CLUB;
export const demoMeId = ME_ID;

/** יום N מהיום, בשעה 6:45 — כמו מפגש שחייה אמיתי */
function morningOf(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(6, 45, 0, 0);
  return d.toISOString();
}

export function demoEvents(): SwellEvent[] {
  return EVENT_SEEDS.map(({ offsetMin, days, fixedStartsAt, title, ...rest }) => {
    const startsAt =
      offsetMin !== undefined
        ? new Date(Date.now() + offsetMin * 60_000)
        : fixedStartsAt !== undefined
          ? new Date(fixedStartsAt)
          : new Date(morningOf(days!));

    return {
      ...rest,
      starts_at: startsAt.toISOString(),
      title: title ?? swimTitleFor(startsAt),
    };
  });
}

export function demoEvent(id: string) {
  return demoEvents().find((e) => e.id === id) ?? null;
}

export function demoProfiles() {
  return db().profiles;
}

export function demoMe() {
  return db().profiles.find((p) => p.id === ME_ID)!;
}

export function demoRsvps() {
  return db().rsvps;
}

export function demoAttendances() {
  return db().attendances;
}

/**
 * אותו כלל הרשאה כמו ב-RLS האמיתי (event_photos_select): מי שהעלה
 * תמונה רואה אותה גם לפני אישור, נוכח/ת רואה רק מאושרות, מנהלת רואה
 * הכל.
 */
export function demoEventPhotos(eventId: string) {
  const iAmOrganizer = demoMyRole() === "organizer";
  const iAttended = db().attendances.some(
    (a) => a.eventId === eventId && a.profileId === ME_ID,
  );
  return db()
    .eventPhotos.filter((p) => p.eventId === eventId)
    .filter(
      (p) =>
        iAmOrganizer ||
        p.uploadedBy === ME_ID ||
        (p.status === "approved" && iAttended),
    )
    .sort((a, b) => a.addedAt.localeCompare(b.addedAt));
}

/** כל הממתינות בכל המפגשים — לתור המרוכז בעמוד הניהול. */
export function demoAllPendingPhotos() {
  return db()
    .eventPhotos.filter((p) => p.status === "pending")
    .sort((a, b) => a.addedAt.localeCompare(b.addedAt));
}

export function demoMyRole(): MemberRole {
  return db().myRole;
}

// ------------------------------------------------------------------ כתיבה

export function demoToggleRsvp(eventId: string) {
  const rows = db().rsvps;
  const mine = rows.find(
    (r) => r.eventId === eventId && r.profileId === ME_ID,
  );
  if (mine) mine.going = !mine.going;
  else rows.push({ eventId, profileId: ME_ID, going: true });
}

export function demoCheckIn(
  eventId: string,
  selfie: string | null,
  faceX: number | null = null,
  faceY: number | null = null,
) {
  const rows = db().attendances;
  if (rows.some((a) => a.eventId === eventId && a.profileId === ME_ID)) return;
  rows.push({
    eventId,
    profileId: ME_ID,
    selfie,
    at: new Date().toISOString(),
    faceX,
    faceY,
  });
}

export function demoUpdateProfile(patch: Partial<Profile>) {
  const me = demoMe();
  Object.assign(me, patch);
}

export function demoSetMyRole(role: MemberRole) {
  db().myRole = role;
}

export function demoAddEventPhoto(eventId: string, dataUrl: string) {
  db().eventPhotos.push({
    id: `demo-photo-${Math.random().toString(36).slice(2)}`,
    eventId,
    url: dataUrl,
    addedAt: new Date().toISOString(),
    // מנהלת מאשרת לעצמה מיד — כמו ב-add_event_photo() האמיתית
    status: demoMyRole() === "organizer" ? "approved" : "pending",
    uploadedBy: ME_ID,
  });
}

export function demoApproveEventPhoto(photoId: string) {
  const photo = db().eventPhotos.find((p) => p.id === photoId);
  if (photo) photo.status = "approved";
}

export function demoDeleteEventPhoto(photoId: string) {
  const photos = db().eventPhotos;
  const i = photos.findIndex((p) => p.id === photoId);
  if (i !== -1) photos.splice(i, 1);
}

export function demoCreateEvent(event: SwellEvent) {
  const { starts_at, ...rest } = event;
  EVENT_SEEDS.push({
    ...rest,
    offsetMin: Math.round(
      (new Date(starts_at).getTime() - Date.now()) / 60_000,
    ),
  });
}

export function demoUpdateEventSchedule(
  eventId: string,
  patch: {
    description: string | null;
    agenda_text: string | null;
    agenda_visible: boolean;
    equipment_text: string | null;
    equipment_visible: boolean;
    equipment_link_visible: boolean;
  },
) {
  const seed = EVENT_SEEDS.find((e) => e.id === eventId);
  if (seed) Object.assign(seed, patch);
}
