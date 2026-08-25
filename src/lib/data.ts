import { createClient } from "./supabase/server";
import { demoMode } from "./config";
import { ageInYears } from "./format";
import type {
  Attendance,
  Club,
  Gender,
  MemberRole,
  MemberStatus,
  Profile,
  SwellEvent,
  SwimLevel,
} from "./types";
import * as demo from "./demo/store";

const SELFIE_TTL = 60 * 60;

export type Viewer = {
  userId: string;
  profile: Profile | null;
  club: Club | null;
  role: MemberRole | null;
  status: MemberStatus | null;
};

/** הזהות של מי שמסתכל. כל עמוד ב-(app) מתחיל מכאן. */
export async function getViewer(): Promise<Viewer | null> {
  if (demoMode) {
    return {
      userId: demo.demoMeId,
      profile: demo.demoMe(),
      club: demo.demoClub,
      // ניתן להחלפה במסך הפרופיל — כך ההדגמה מראה גם את צד המנהלת
      // וגם את צד החבר הרגיל, ולא רק אחד מהם.
      role: demo.demoMyRole(),
      // בהדגמה אין מסך "ממתין לאישור" — הכל תמיד מאושר.
      status: "approved",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("club_members")
      .select("role, status, clubs(*)")
      .eq("profile_id", user.id)
      .maybeSingle(),
  ]);

  return {
    userId: user.id,
    profile: (profile ?? null) as Profile | null,
    club: (membership?.clubs ?? null) as Club | null,
    role: (membership?.role ?? null) as MemberRole | null,
    status: (membership?.status ?? null) as MemberStatus | null,
  };
}

export type PendingMember = {
  profileId: string;
  fullName: string;
  requestedAt: string;
  ageYears: number | null;
  phone: string | null;
  instagram: string | null;
};

/**
 * ממתינים לאישור בקהילה. רק המנהלת רואה משהו — RPC חוסם אחרת.
 *
 * למה גיל וטלפון ואינסטגרם כבר כאן, ולא רק אחרי כניסה לפרופיל: מנהלת
 * שמחליטה אם לאשר בקשת הצטרפות צריכה מספיק הקשר לזהות מי זה בלי לפתוח
 * כל בקשה בנפרד — אותו עיקרון של person_card, רק שכאן זו המנהלת שרואה.
 */
export async function getPendingMembers(
  clubId: string,
): Promise<PendingMember[]> {
  if (demoMode) return [];

  const supabase = await createClient();
  const { data } = await supabase.rpc("list_pending_members", {
    p_club_id: clubId,
  });

  const rows = (data ?? []) as {
    profile_id: string;
    full_name: string;
    requested_at: string;
    birth_date: string | null;
    phone: string | null;
    instagram: string | null;
  }[];

  return rows.map((row) => ({
    profileId: row.profile_id,
    fullName: row.full_name,
    requestedAt: row.requested_at,
    ageYears: ageInYears(row.birth_date),
    phone: row.phone,
    instagram: row.instagram,
  }));
}

export type PendingEventPhoto = {
  id: string;
  url: string;
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  uploaderId: string;
  uploaderName: string;
  storagePath: string | null;
};

/**
 * כל התמונות שממתינות לאישור בכל המפגשים של הקהילה, לא רק מפגש
 * אחד — כדי שעמוד הניהול יראה תור אחד מרוכז במקום שהמנהלת תצטרך
 * להיכנס לכל מפגש בנפרד ולבדוק אם משהו ממתין שם. כוללת גם מי העלה
 * ומתי המפגש עצמו התקיים, כדי שאפשר יהיה לקבץ לפי מפגש ואז לפי
 * מעלה/ת — ביום מפגש אמיתי צפויות הרבה בקשות בבת אחת.
 */
export async function getPendingEventPhotos(
  clubId: string,
): Promise<PendingEventPhoto[]> {
  if (demoMode) {
    return demo.demoAllPendingPhotos().map((p) => {
      const event = demo.demoEvents().find((e) => e.id === p.eventId);
      const uploader = demo
        .demoProfiles()
        .find((profile) => profile.id === p.uploadedBy);
      return {
        id: p.id,
        url: p.url,
        eventId: p.eventId,
        eventTitle: event?.title ?? "",
        eventStartsAt: event?.starts_at ?? "",
        uploaderId: p.uploadedBy,
        uploaderName: uploader?.full_name ?? "חבר קהילה",
        storagePath: null,
      };
    });
  }

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("event_photos")
    .select(
      "id, storage_path, event_id, uploaded_by, events!inner(title, starts_at, club_id), profiles(full_name)",
    )
    .eq("status", "pending")
    .eq("events.club_id", clubId)
    .order("created_at", { ascending: true });

  if (!rows?.length) return [];

  const paths = rows.map((r) => r.storage_path);
  const { data: signed } = await supabase.storage
    .from("event-photos")
    .createSignedUrls(paths, SELFIE_TTL);

  const urlByPath = new Map(
    (signed ?? []).flatMap((s) =>
      !s.error && s.signedUrl && s.path ? [[s.path, s.signedUrl] as const] : [],
    ),
  );

  return rows.flatMap((r) => {
    const url = urlByPath.get(r.storage_path);
    if (!url) return [];
    const event = r.events as unknown as { title: string; starts_at: string };
    const profile = r.profiles as unknown as { full_name: string } | null;
    return [
      {
        id: r.id,
        url,
        eventId: r.event_id,
        eventTitle: event.title,
        eventStartsAt: event.starts_at,
        uploaderId: r.uploaded_by as string,
        uploaderName: profile?.full_name ?? "חבר קהילה",
        storagePath: r.storage_path as string,
      },
    ];
  });
}

/**
 * ספירה בלבד (לא הרשימה עצמה) — לתג ההתראה בסרגל הניווט, שנטען בכל
 * ניווט בין עמודים. לא שווה לייצר כתובות חתומות לכל התמונות רק כדי
 * לספור אותן.
 */
export async function getOrganizerPendingCount(clubId: string): Promise<number> {
  if (demoMode) {
    return demo.demoAllPendingPhotos().length;
  }

  const supabase = await createClient();
  const [{ count: memberCount }, { count: photoCount }] = await Promise.all([
    supabase
      .from("club_members")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "pending"),
    supabase
      .from("event_photos")
      .select("*, events!inner(club_id)", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("events.club_id", clubId),
  ]);

  return (memberCount ?? 0) + (photoCount ?? 0);
}

// מפגש שהתחיל לפני פחות משעתיים עדיין נחשב "קרוב"
const RECENT_MS = 2 * 3600_000;

export async function getUpcomingEvents(clubId: string) {
  if (demoMode) {
    return demo
      .demoEvents()
      .filter((e) => new Date(e.starts_at).getTime() >= Date.now() - RECENT_MS)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("club_id", clubId)
    .gte("starts_at", new Date(Date.now() - RECENT_MS).toISOString())
    .order("starts_at", { ascending: true });
  return (data ?? []) as SwellEvent[];
}

export async function getPastEvents(clubId: string, limit = 20) {
  if (demoMode) {
    return demo
      .demoEvents()
      .filter((e) => new Date(e.starts_at).getTime() < Date.now() - RECENT_MS)
      .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
      .slice(0, limit);
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("club_id", clubId)
    .lt("starts_at", new Date(Date.now() - RECENT_MS).toISOString())
    .order("starts_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as SwellEvent[];
}

const MONTH_MS = 30 * 24 * 3600_000;

export type RecentMonthStats = { attended: number; total: number };

/** X ו-Y ל"נכחתם ב-Y מתוך X מפגשים בחודש האחרון" בעמוד הפרופיל */
export async function getRecentMonthStats(
  clubId: string,
  userId: string,
): Promise<RecentMonthStats> {
  const since = new Date(Date.now() - MONTH_MS).toISOString();
  const now = new Date().toISOString();

  if (demoMode) {
    const events = demo
      .demoEvents()
      .filter(
        (e) => e.club_id === clubId && e.starts_at >= since && e.starts_at <= now,
      );
    const mine = new Set(
      demo
        .demoAttendances()
        .filter((a) => a.profileId === userId)
        .map((a) => a.eventId),
    );
    return {
      total: events.length,
      attended: events.filter((e) => mine.has(e.id)).length,
    };
  }

  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id")
    .eq("club_id", clubId)
    .gte("starts_at", since)
    .lte("starts_at", now);

  const ids = (events ?? []).map((e) => e.id as string);
  if (ids.length === 0) return { attended: 0, total: 0 };

  const { data: attendances } = await supabase
    .from("attendances")
    .select("event_id")
    .eq("profile_id", userId)
    .in("event_id", ids);

  return { total: ids.length, attended: (attendances ?? []).length };
}

export async function getEvent(eventId: string) {
  if (demoMode) return demo.demoEvent(eventId);

  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  return (data ?? null) as SwellEvent | null;
}

export async function getMyAttendedEventIds(userId: string) {
  if (demoMode) {
    return new Set(
      demo
        .demoAttendances()
        .filter((a) => a.profileId === demo.demoMeId)
        .map((a) => a.eventId),
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("attendances")
    .select("event_id")
    .eq("profile_id", userId);
  return new Set((data ?? []).map((a) => a.event_id));
}

/** למה סימנתי שאגיע — כדי שרשימת המפגשים תראה את זה בלי להיכנס פנימה */
export async function getMyGoingEventIds(userId: string) {
  if (demoMode) {
    return new Set(
      demo
        .demoRsvps()
        .filter((r) => r.profileId === demo.demoMeId && r.going)
        .map((r) => r.eventId),
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("rsvps")
    .select("event_id")
    .eq("profile_id", userId)
    .eq("going", true);
  return new Set((data ?? []).map((r) => r.event_id));
}

/**
 * שמות המתכוונים לכל מפגש, לכמה מפגשים בבת אחת — לכרטיסים ברשימה.
 * המפתח הוא event_id.
 */
export async function getGoingNamesByEvent(
  eventIds: string[],
  userId: string,
): Promise<Map<string, GoingPerson[]>> {
  const out = new Map<string, GoingPerson[]>();
  if (eventIds.length === 0) return out;

  const push = (eventId: string, person: GoingPerson) => {
    const list = out.get(eventId);
    if (list) list.push(person);
    else out.set(eventId, [person]);
  };

  if (demoMode) {
    const wanted = new Set(eventIds);
    const byId = new Map(demo.demoProfiles().map((p) => [p.id, p]));
    for (const r of demo.demoRsvps()) {
      if (!r.going || !wanted.has(r.eventId)) continue;
      const profile = byId.get(r.profileId);
      if (!profile) continue;
      // בלי תמונה — כרטיס האירוע מציג רק שמות (goingSummary), לא פנים
      push(r.eventId, {
        profileId: profile.id,
        fullName: profile.full_name,
        swimLevel: profile.swim_level,
        selfieUrl: null,
        faceX: null,
        faceY: null,
        isMe: profile.id === demo.demoMeId,
      });
    }
    return out;
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("events_going_names", {
    p_event_ids: eventIds,
  });

  for (const r of (data ?? []) as {
    event_id: string;
    profile_id: string;
    full_name: string;
    swim_level: SwimLevel | null;
  }[]) {
    // בלי תמונה כאן — events_going_names() לא מחזירה אותה בכלל
    // (כרטיס האירוע מציג רק שמות)
    push(r.event_id, {
      profileId: r.profile_id,
      fullName: r.full_name,
      swimLevel: r.swim_level,
      selfieUrl: null,
      faceX: null,
      faceY: null,
      isMe: r.profile_id === userId,
    });
  }
  return out;
}

export async function getMyAttendanceCount(userId: string): Promise<number> {
  if (demoMode) {
    return demo
      .demoAttendances()
      .filter((a) => a.profileId === demo.demoMeId).length;
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("attendances")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", userId);
  return count ?? 0;
}

// ------------------------------------------------ היסטוריית הסלפים של אדם

export type SelfieShot = {
  eventId: string;
  eventTitle: string;
  startsAt: string;
  selfieUrl: string | null;
  checkedInAt: string;
  // מרכז הפנים (0–1), לחיתוך ממורכז. ראו lib/face-position.ts
  faceX: number | null;
  faceY: number | null;
};

/**
 * כל הסלפים שאדם צילם, לאורך כל המפגשים. זה הלב של הזיהוי —
 * פנים לאורך זמן, ולא תמונת פרופיל אחת.
 *
 * מי שרשאי לראות: האדם עצמו, ומנהלת הקהילה. נאכף ב-RLS ובמדיניות
 * ה-storage (`is_event_organizer`), לא כאן.
 */
export async function getSelfieHistory(
  profileId: string,
): Promise<SelfieShot[]> {
  if (demoMode) {
    const byId = new Map(demo.demoEvents().map((e) => [e.id, e]));
    return demo
      .demoAttendances()
      .filter((a) => a.profileId === profileId)
      .flatMap((a) => {
        const event = byId.get(a.eventId);
        return event
          ? [
              {
                eventId: a.eventId,
                eventTitle: event.title,
                startsAt: event.starts_at,
                selfieUrl: a.selfie,
                checkedInAt: a.at,
                faceX: a.faceX,
                faceY: a.faceY,
              },
            ]
          : [];
      })
      .sort((x, y) => y.startsAt.localeCompare(x.startsAt));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("attendances")
    .select(
      "event_id, selfie_path, checked_in_at, face_x, face_y, events(title, starts_at)",
    )
    .eq("profile_id", profileId)
    .order("checked_in_at", { ascending: false });

  const rows = (data ?? []) as unknown as {
    event_id: string;
    selfie_path: string | null;
    checked_in_at: string;
    face_x: number | null;
    face_y: number | null;
    events: { title: string; starts_at: string } | null;
  }[];

  const paths = rows.map((r) => r.selfie_path).filter(Boolean) as string[];
  const signed = paths.length
    ? ((await supabase.storage.from("selfies").createSignedUrls(paths, SELFIE_TTL))
        .data ?? [])
    : [];
  const urlByPath = new Map(
    signed.map((s) => [s.path ?? "", s.signedUrl] as const),
  );

  return rows.flatMap((r) =>
    r.events
      ? [
          {
            eventId: r.event_id,
            eventTitle: r.events.title,
            startsAt: r.events.starts_at,
            selfieUrl: r.selfie_path
              ? (urlByPath.get(r.selfie_path) ?? null)
              : null,
            checkedInAt: r.checked_in_at,
            faceX: r.face_x,
            faceY: r.face_y,
          },
        ]
      : [],
  );
}

export type PersonCard = {
  profileId: string;
  fullName: string;
  /** גלוי תמיד כמו השם — רק לניסוח נכון ("היה/הייתה איתנו"), לא מוצג בפני עצמו */
  gender: Gender | null;
  /** null אם עוד לא הייתם יחד — אז גם אין מה להראות מעבר לשם */
  instagram: string | null;
  /** אותו כלל בדיוק כמו אינסטגרם — נעול עד שהייתם יחד */
  phone: string | null;
  /** אותו כלל בדיוק כמו אינסטגרם — נעול עד שהייתם יחד */
  swimLevel: SwimLevel | null;
  /** בכמה מפגשים הייתם יחד. אפס = עוד לא נפגשתם, והעמוד נעול */
  sharedCount: number;
  attendedCount: number;
};

/**
 * כרטיס של אדם אחר, לעמוד שנפתח מרשימת הכוונות.
 *
 * חבר קהילה רואה שם תמיד, אבל פרטים ופנים — רק אם הייתם יחד. זה אותו
 * כלל שמחזיק את כל המוצר, רק במקום אחר בממשק.
 */
export async function getPersonCard(
  profileId: string,
  viewerId: string,
): Promise<PersonCard | null> {
  if (demoMode) {
    const profile = demo.demoProfiles().find((p) => p.id === profileId);
    if (!profile) return null;

    const attendances = demo.demoAttendances();
    const mine = new Set(
      attendances
        .filter((a) => a.profileId === viewerId)
        .map((a) => a.eventId),
    );
    const theirs = attendances.filter((a) => a.profileId === profileId);
    const sharedCount = theirs.filter((a) => mine.has(a.eventId)).length;
    const isOrganizer = demo.demoMyRole() === "organizer";

    const unlocked = sharedCount > 0 || isOrganizer;
    return {
      profileId,
      fullName: profile.full_name,
      gender: profile.gender,
      instagram: unlocked ? profile.instagram : null,
      phone: unlocked ? profile.phone : null,
      swimLevel: unlocked ? profile.swim_level : null,
      sharedCount,
      attendedCount: theirs.length,
    };
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("person_card", {
    p_profile_id: profileId,
  });

  const row = ((data ?? []) as {
    full_name: string;
    gender: Gender | null;
    instagram: string | null;
    phone: string | null;
    swim_level: SwimLevel | null;
    shared_count: number;
    attended_count: number;
  }[])[0];
  if (!row) return null;

  return {
    profileId,
    fullName: row.full_name,
    gender: row.gender,
    instagram: row.instagram,
    phone: row.phone,
    swimLevel: row.swim_level,
    sharedCount: row.shared_count,
    attendedCount: row.attended_count,
  };
}

/** פרופיל בודד — לעמוד החבר בצד הניהול */
export async function getMemberProfile(
  profileId: string,
): Promise<Profile | null> {
  if (demoMode) {
    return demo.demoProfiles().find((p) => p.id === profileId) ?? null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();
  return (data ?? null) as Profile | null;
}

// ------------------------------------------------------------- עמוד מפגש

/** בדיוק מה שכרטיס משתתף צריך. מה שלא כאן — לא יוצא מהשרת. */
export type PublicProfile = Pick<
  Profile,
  "id" | "full_name" | "phone" | "instagram" | "swim_level"
>;

export type AttendeeCard = {
  profile: PublicProfile;
  selfieUrl: string | null;
  isMe: boolean;
  // מרכז הפנים (0–1), לחיתוך ממורכז. ראו lib/face-position.ts
  faceX: number | null;
  faceY: number | null;
};

/**
 * מי הצהיר שיגיע. שם בלי תמונה — הצהרת כוונה מותרת לפרסום, סלפי לא.
 * המטרה שלה היא מוטיבציה: רואים שחברים מתכננים להגיע ומצטרפים.
 */
export type GoingPerson = {
  profileId: string;
  fullName: string;
  swimLevel: SwimLevel | null;
  // התמונה העדכנית של האדם — null אם עוד לא נכחתם יחד באיזשהו מפגש,
  // גם אם יש לו סלפי. ראו migration 0018.
  selfieUrl: string | null;
  faceX: number | null;
  faceY: number | null;
  isMe: boolean;
};

export type EventDetail = {
  myGoing: boolean;
  rsvpCount: number;
  /** השמות מאחורי `rsvpCount`, באותו סדר שבו סימנו */
  going: GoingPerson[];
  hasAttended: boolean;
  /** כמה כבר נכחו. גלוי גם למי שלא נכח — המספר מותר, הזהויות לא. */
  attendedCount: number;
  attendees: AttendeeCard[];
};

export async function getEventDetail(
  eventId: string,
  userId: string,
): Promise<EventDetail> {
  if (demoMode) {
    const rsvps = demo.demoRsvps().filter((r) => r.eventId === eventId);
    const attendances = demo
      .demoAttendances()
      .filter((a) => a.eventId === eventId);
    const hasAttended = attendances.some((a) => a.profileId === demo.demoMeId);
    const byId = new Map(demo.demoProfiles().map((p) => [p.id, p]));

    // "נכחתם יחד" בהדגמה — מי שחלק לפחות מפגש אחד עם demoMeId, בכל
    // מפגש שהוא, לא רק זה הנוכחי. אותו תנאי בדיוק כמו ב-SQL האמיתי.
    const allAttendances = demo.demoAttendances();
    const myEventIds = new Set(
      allAttendances
        .filter((a) => a.profileId === demo.demoMeId)
        .map((a) => a.eventId),
    );
    const metProfileIds = new Set(
      allAttendances
        .filter((a) => myEventIds.has(a.eventId))
        .map((a) => a.profileId),
    );
    function latestDemoSelfie(profileId: string) {
      const rows = allAttendances.filter((a) => a.profileId === profileId);
      if (!rows.length) return { selfieUrl: null, faceX: null, faceY: null };
      const latest = [...rows].sort((a, b) => b.at.localeCompare(a.at))[0];
      return {
        selfieUrl: latest.selfie,
        faceX: latest.faceX,
        faceY: latest.faceY,
      };
    }

    return {
      myGoing:
        rsvps.find((r) => r.profileId === demo.demoMeId)?.going ?? false,
      rsvpCount: rsvps.filter((r) => r.going).length,
      going: rsvps
        .filter((r) => r.going)
        .flatMap((r) => {
          const profile = byId.get(r.profileId);
          if (!profile) return [];
          const isMe = profile.id === demo.demoMeId;
          const met = isMe || metProfileIds.has(profile.id);
          const shot = met
            ? latestDemoSelfie(profile.id)
            : { selfieUrl: null, faceX: null, faceY: null };
          return [
            {
              profileId: profile.id,
              fullName: profile.full_name,
              swimLevel: profile.swim_level,
              ...shot,
              isMe,
            },
          ];
        }),
      hasAttended,
      attendedCount: attendances.length,
      attendees: hasAttended
        ? attendances.flatMap((a) => {
            const profile = byId.get(a.profileId);
            return profile
              ? [
                  {
                    profile,
                    selfieUrl: a.selfie,
                    isMe: a.profileId === demo.demoMeId,
                    faceX: a.faceX,
                    faceY: a.faceY,
                  },
                ]
              : [];
          })
        : [],
    };
  }

  const supabase = await createClient();
  const [
    { data: myRsvp },
    { data: rsvpCount },
    { data: goingRows },
    { data: attendedCount },
    { data: myAttendance },
  ] = await Promise.all([
    supabase
      .from("rsvps")
      .select("going")
      .eq("event_id", eventId)
      .eq("profile_id", userId)
      .maybeSingle(),
    supabase.rpc("event_rsvp_count", { p_event_id: eventId }),
    supabase.rpc("event_going_list", { p_event_id: eventId }),
    supabase.rpc("event_attendance_count", { p_event_id: eventId }),
    supabase
      .from("attendances")
      .select("*")
      .eq("event_id", eventId)
      .eq("profile_id", userId)
      .maybeSingle(),
  ]);

  const hasAttended = !!myAttendance;
  let attendees: AttendeeCard[] = [];

  if (hasAttended) {
    // עמודות מפורשות ולא `profiles(*)`. RLS עובד ברמת השורה בלבד, ולכן
    // כוכבית כאן שולחת לדפדפן של כל משתתף כל שדה שיתווסף לטבלה בעתיד,
    // גם אם אף מסך לא מציג אותו. הטלפון כן נשלח, במכוון: כפתור
    // הוואטסאפ ב-attendee-grid הוא הפואנטה של הרשימה.
    const { data } = await supabase
      .from("attendances")
      .select(
        "event_id, profile_id, selfie_path, checked_in_at, face_x, face_y, profiles(id, full_name, phone, instagram, swim_level)",
      )
      .eq("event_id", eventId)
      .order("checked_in_at", { ascending: true });

    const rows = (data ?? []) as unknown as (Attendance & {
      profiles: PublicProfile | null;
    })[];
    const paths = rows.map((r) => r.selfie_path).filter(Boolean) as string[];

    const signed = paths.length
      ? ((
          await supabase.storage
            .from("selfies")
            .createSignedUrls(paths, SELFIE_TTL)
        ).data ?? [])
      : [];
    const urlByPath = new Map(
      signed.map((s) => [s.path ?? "", s.signedUrl] as const),
    );

    attendees = rows.flatMap((r) =>
      r.profiles
        ? [
            {
              profile: r.profiles,
              selfieUrl: r.selfie_path
                ? (urlByPath.get(r.selfie_path) ?? null)
                : null,
              isMe: r.profile_id === userId,
              faceX: r.face_x,
              faceY: r.face_y,
            },
          ]
        : [],
    );
  }

  const goingRowsTyped = (goingRows ?? []) as {
    profile_id: string;
    full_name: string;
    swim_level: SwimLevel | null;
    selfie_path: string | null;
    face_x: number | null;
    face_y: number | null;
  }[];

  const goingPaths = goingRowsTyped
    .map((r) => r.selfie_path)
    .filter(Boolean) as string[];
  const goingSigned = goingPaths.length
    ? ((
        await supabase.storage
          .from("selfies")
          .createSignedUrls(goingPaths, SELFIE_TTL)
      ).data ?? [])
    : [];
  const goingUrlByPath = new Map(
    goingSigned.map((s) => [s.path ?? "", s.signedUrl] as const),
  );

  const going = goingRowsTyped.map((r) => ({
    profileId: r.profile_id,
    fullName: r.full_name,
    swimLevel: r.swim_level,
    // אם הצופה עוד לא נכח יחד עם r, ה-RPC כבר מחזיר null כאן — לא
    // צריך בדיקה נוספת. אם המדיניות ב-storage תחסום בכל זאת, ה-path
    // פשוט לא יופיע ב-goingUrlByPath וזה ייפול חזרה ל-null.
    selfieUrl: r.selfie_path ? (goingUrlByPath.get(r.selfie_path) ?? null) : null,
    faceX: r.face_x,
    faceY: r.face_y,
    isMe: r.profile_id === userId,
  }));

  return {
    myGoing: myRsvp?.going ?? false,
    rsvpCount: rsvpCount ?? 0,
    going,
    hasAttended,
    attendedCount: attendedCount ?? 0,
    attendees,
  };
}

export type EventPhoto = {
  id: string;
  url: string;
  status: "pending" | "approved";
  /** התמונה הזו הועלתה על ידי מי שצופה עכשיו — כדי להראות לה/לו
   * "ממתין לאישור" גם לפני שהמנהלת אישרה, בלי לחשוף תמונות ממתינות
   * של אחרים. */
  isMine: boolean;
  /** מי העלה — כדי שמנהלת שרואה כמה תמונות ממתינות ביחד תדע מי
   * ביקש/ה מה, בלי לפתוח כל תמונה בנפרד. */
  uploaderName: string;
  /** נתיב האחסון — נדרש למחיקה (storage.remove), בלי סבב-הלוך-ושוב
   * נוסף רק כדי לגלות אותו. לא רלוונטי בהדגמה. */
  storagePath: string | null;
};

/**
 * אלבום המפגש. מקור האמת הוא טבלת `event_photos` (סטטוס אישור +
 * מי העלה) — ה-storage מחזיק רק את הבייטים. ה-RLS על שתיהן יחד הוא
 * כל האכיפה: מי שלא רשאי/ת פשוט מקבל/ת רשימה ריקה, לא שגיאה.
 *
 * `download: true` הופך את הקישור לכזה שמוריד למכשיר במקום להיפתח
 * בטאב חדש — זו הדרישה המפורשת, לא ברירת מחדל של הדפדפן.
 */
export async function getEventPhotos(eventId: string): Promise<EventPhoto[]> {
  if (demoMode) {
    return demo.demoEventPhotos(eventId).map((p) => ({
      id: p.id,
      url: p.url,
      status: p.status,
      isMine: p.uploadedBy === demo.demoMeId,
      uploaderName:
        demo.demoProfiles().find((profile) => profile.id === p.uploadedBy)
          ?.full_name ?? "חבר קהילה",
      storagePath: null,
    }));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from("event_photos")
    .select("id, storage_path, status, uploaded_by, profiles(full_name)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (!rows?.length) return [];

  const paths = rows.map((r) => r.storage_path);
  const { data: signed } = await supabase.storage
    .from("event-photos")
    .createSignedUrls(paths, SELFIE_TTL, { download: true });

  const urlByPath = new Map(
    (signed ?? []).flatMap((s) =>
      !s.error && s.signedUrl && s.path ? [[s.path, s.signedUrl] as const] : [],
    ),
  );

  return rows.flatMap((r) => {
    const url = urlByPath.get(r.storage_path);
    if (!url) return [];
    const profile = r.profiles as unknown as { full_name: string } | null;
    return [
      {
        id: r.id,
        url,
        status: r.status as "pending" | "approved",
        isMine: r.uploaded_by === user?.id,
        uploaderName: profile?.full_name ?? "חבר קהילה",
        storagePath: r.storage_path as string,
      },
    ];
  });
}

/**
 * עד 4 תמונות אלבום *מאושרות* לכל מפגש, לקולאז' בכרטיסי
 * `SelfieHistory` — תמונה שממתינה לאישור לא מוצגת שם כ"זיכרון מהמפגש"
 * לפני שהמנהלת אישרה אותה. לא מוסיפה בדיקת הרשאה משלה —
 * `getEventPhotos` כבר אוכפת את זה דרך ה-RLS.
 */
export async function getEventPhotoCollages(
  eventIds: string[],
): Promise<Map<string, string[]>> {
  const unique = [...new Set(eventIds)];
  const lists = await Promise.all(unique.map((id) => getEventPhotos(id)));
  return new Map(
    unique.map((id, i) => [
      id,
      lists[i]
        .filter((p) => p.status === "approved")
        .slice(0, 4)
        .map((p) => p.url),
    ]),
  );
}

// -------------------------------------------------------------- דף ניהול

export type AdminEvent = SwellEvent & { goingCount: number; cameCount: number };
export type AdminMember = {
  profile: Profile;
  attendedCount: number;
  /** הסלפי האחרון — כדי שהמנהלת תזהה פנים ברשימה, לא רק שמות */
  latestSelfieUrl: string | null;
  // מרכז הפנים של latestSelfieUrl (0–1). ראו lib/face-position.ts
  latestFaceX: number | null;
  latestFaceY: number | null;
};

export async function getAdminData(clubId: string) {
  if (demoMode) {
    const rsvps = demo.demoRsvps();
    const attendances = demo.demoAttendances();

    const events: AdminEvent[] = demo
      .demoEvents()
      .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
      .map((e) => ({
        ...e,
        goingCount: rsvps.filter((r) => r.eventId === e.id && r.going).length,
        cameCount: attendances.filter((a) => a.eventId === e.id).length,
      }));

    const eventOrder = new Map(
      demo.demoEvents().map((e) => [e.id, e.starts_at]),
    );
    const members: AdminMember[] = demo.demoProfiles().map((profile) => {
      const mine = attendances
        .filter((a) => a.profileId === profile.id)
        .sort((x, y) =>
          (eventOrder.get(y.eventId) ?? "").localeCompare(
            eventOrder.get(x.eventId) ?? "",
          ),
        );
      const latest = mine.find((a) => a.selfie);
      return {
        profile,
        attendedCount: mine.length,
        latestSelfieUrl: latest?.selfie ?? null,
        latestFaceX: latest?.faceX ?? null,
        latestFaceY: latest?.faceY ?? null,
      };
    });

    return { events, members };
  }

  const supabase = await createClient();
  const [{ data: eventRows }, { data: memberRows }] = await Promise.all([
    supabase
      .from("events")
      .select(
        "*, rsvps(profile_id, going), attendances(profile_id, selfie_path, checked_in_at, face_x, face_y)",
      )
      .eq("club_id", clubId)
      .order("starts_at", { ascending: false }),
    supabase
      .from("club_members")
      .select("profile_id, profiles(*)")
      .eq("club_id", clubId)
      // ממתינים לאישור לא "חברים" עדיין — יש להם סעיף נפרד
      // (getPendingMembers) עם כפתורי אישור/דחייה, לא רשימה עם 0 נוכחויות.
      .eq("status", "approved"),
  ]);

  const rows = (eventRows ?? []) as unknown as (SwellEvent & {
    rsvps: { profile_id: string; going: boolean }[];
    attendances: {
      profile_id: string;
      selfie_path: string | null;
      checked_in_at: string;
      face_x: number | null;
      face_y: number | null;
    }[];
  })[];

  // המפגשים כבר ממוינים מהחדש לישן, ולכן הסלפי הראשון שנתקלים בו
  // לכל אדם הוא העדכני ביותר
  const latestPathByProfile = new Map<string, string>();
  const latestFaceByProfile = new Map<
    string,
    { x: number | null; y: number | null }
  >();
  for (const event of rows) {
    for (const a of event.attendances) {
      if (a.selfie_path && !latestPathByProfile.has(a.profile_id)) {
        latestPathByProfile.set(a.profile_id, a.selfie_path);
        latestFaceByProfile.set(a.profile_id, { x: a.face_x, y: a.face_y });
      }
    }
  }

  const latestPaths = [...latestPathByProfile.values()];
  const signedLatest = latestPaths.length
    ? ((
        await supabase.storage
          .from("selfies")
          .createSignedUrls(latestPaths, SELFIE_TTL)
      ).data ?? [])
    : [];
  const urlByLatestPath = new Map(
    signedLatest.map((x) => [x.path ?? "", x.signedUrl] as const),
  );

  const attendedByProfile = new Map<string, number>();
  for (const event of rows) {
    for (const a of event.attendances) {
      attendedByProfile.set(
        a.profile_id,
        (attendedByProfile.get(a.profile_id) ?? 0) + 1,
      );
    }
  }

  const events: AdminEvent[] = rows.map((e) => ({
    ...e,
    goingCount: e.rsvps.filter((r) => r.going).length,
    cameCount: e.attendances.length,
  }));

  const members: AdminMember[] = (
    (memberRows ?? []) as unknown as {
      profile_id: string;
      profiles: Profile | null;
    }[]
  ).flatMap((m) =>
    m.profiles
      ? [
          {
            profile: m.profiles,
            attendedCount: attendedByProfile.get(m.profile_id) ?? 0,
            latestSelfieUrl: (() => {
              const path = latestPathByProfile.get(m.profile_id);
              return path ? (urlByLatestPath.get(path) ?? null) : null;
            })(),
            latestFaceX: latestFaceByProfile.get(m.profile_id)?.x ?? null,
            latestFaceY: latestFaceByProfile.get(m.profile_id)?.y ?? null,
          },
        ]
      : [],
  );

  return { events, members };
}
