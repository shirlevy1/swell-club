import { redirect } from "next/navigation";
import {
  getViewer,
  getAdminData,
  getRemovedMembers,
  type AdminEvent,
  type AdminMember,
} from "@/lib/data";
import { BackLink, Card } from "@/components/ui";
import { formatDateNumericPadded } from "@/lib/format";

function Section({
  title,
  ids,
  nameOf,
  sub,
}: {
  title: string;
  ids: Set<string>;
  nameOf: (id: string) => string;
  sub?: (id: string) => string;
}) {
  return (
    <Card className="space-y-2">
      <h2 className="font-bold">
        {title} · <span className="ltr-nums">{ids.size}</span>
      </h2>
      {ids.size === 0 ? (
        <p className="text-sm text-(--color-ink-faint)">אף אחד</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {[...ids].map((id) => (
            <li key={id}>
              {nameOf(id)}
              {sub && <span className="text-(--color-ink-faint)"> — {sub(id)}</span>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** לא קומפוננטה - כדי ש-Date.now() לא ייחשב קריאה לא-טהורה ברינדור,
    אותו דפוס בדיוק כמו splitAdminEvents ב-lib/data.ts. */
function computeBreakdown(events: AdminEvent[]) {
  const now = Date.now();
  const pastEventsAsc = events
    .filter((e) => new Date(e.starts_at).getTime() <= now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const lastIndex = pastEventsAsc.length - 1;

  const attendedIndexesByProfile = new Map<string, number[]>();
  pastEventsAsc.forEach((event, i) => {
    for (const profileId of event.attendedProfileIds) {
      const list = attendedIndexesByProfile.get(profileId) ?? [];
      list.push(i);
      attendedIndexesByProfile.set(profileId, list);
    }
  });

  const activeProfileIds = new Set<string>();
  const returnedProfileIds = new Set<string>();
  const notReturnedProfileIds = new Set<string>();
  const notEligibleProfileIds = new Set<string>();

  for (const [profileId, indexes] of attendedIndexesByProfile) {
    const lastAttended = Math.max(...indexes);
    if (lastAttended >= lastIndex - 1) activeProfileIds.add(profileId);

    const firstAttended = Math.min(...indexes);
    if (firstAttended + 2 <= lastIndex) {
      if (indexes.length >= 2) returnedProfileIds.add(profileId);
      else notReturnedProfileIds.add(profileId);
    } else {
      notEligibleProfileIds.add(profileId);
    }
  }

  return {
    pastEventsAsc,
    attendedIndexesByProfile,
    activeProfileIds,
    returnedProfileIds,
    notReturnedProfileIds,
    notEligibleProfileIds,
  };
}

/**
 * דף זמני לבדיקה בלבד - להציג לשיר בדיוק מי נכנס לכל קטגוריה
 * ב"פעילים"/"חוזרים" בקהילה האמיתית. יורד אחרי שהיא בודקת.
 */
export default async function DebugActiveReturningPage() {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const [{ events, members }, removedMembers] = await Promise.all([
    getAdminData(viewer.club.id),
    getRemovedMembers(viewer.club.id),
  ]);
  const {
    pastEventsAsc,
    attendedIndexesByProfile,
    activeProfileIds,
    returnedProfileIds,
    notReturnedProfileIds,
    notEligibleProfileIds,
  } = computeBreakdown(events);

  const nameOf = (id: string) => {
    const member = (members as AdminMember[]).find((m) => m.profile.id === id);
    if (member) return member.profile.full_name;
    const removed = removedMembers.find((m) => m.profileId === id);
    if (removed) return `${removed.fullName} (עזב/ה או הוסר/ה מהקהילה)`;
    return "(לא נמצא בכלל - בדוק/י ידנית)";
  };
  const lastEventLabel = (id: string) => {
    const indexes = attendedIndexesByProfile.get(id) ?? [];
    const idx = Math.max(...indexes);
    const e = pastEventsAsc[idx];
    return e ? formatDateNumericPadded(e.starts_at) : "";
  };

  return (
    <div className="space-y-6">
      <BackLink href="/admin/insights">לתובנות</BackLink>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
        בדיקה: פעילים וחוזרים
      </h1>

      <Section
        title="פעילים (הגיעו לאחד משני המפגשים האחרונים)"
        ids={activeProfileIds}
        nameOf={nameOf}
        sub={lastEventLabel}
      />

      <Section
        title="חוזרים — חזרו שוב"
        ids={returnedProfileIds}
        nameOf={nameOf}
      />
      <Section
        title="חוזרים — לא חזרו (עדיין, ראויים לשפוט)"
        ids={notReturnedProfileIds}
        nameOf={nameOf}
      />
      <Section
        title="לא ראויים לשפוט עדיין (הגיעו בפעם הראשונה לאחרונה מדי)"
        ids={notEligibleProfileIds}
        nameOf={nameOf}
      />
    </div>
  );
}
