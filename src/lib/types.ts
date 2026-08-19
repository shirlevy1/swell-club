export type MemberRole = "member" | "organizer";
export type MemberStatus = "pending" | "approved";
export type Gender = "female" | "male" | "other";

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  instagram: string | null;
  birth_date: string | null;
  city: string | null;
  gender: Gender | null;
  waiver_accepted_at: string | null;
  avatar_path: string | null;
  created_at: string;
};

export type Club = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type ClubMember = {
  club_id: string;
  profile_id: string;
  role: MemberRole;
  status: MemberStatus;
  joined_at: string;
};

export type EventAgendaStep = { time: string; label: string };

export type SwellEvent = {
  id: string;
  club_id: string;
  title: string;
  starts_at: string;
  location_name: string;
  lat: number;
  lng: number;
  maps_url: string | null;
  checkin_radius_m: number;
  checkin_opens_before_min: number;
  checkin_closes_after_min: number;
  created_by: string | null;
  created_at: string;
  description: string | null;
  // ריק אומר "אין לו״ז מפורש" — נופל על הלו״ז הקבוע. ראו lib/agenda.ts
  agenda: EventAgendaStep[];
  agenda_closing: string | null;
};

export type Rsvp = {
  event_id: string;
  profile_id: string;
  going: boolean;
  created_at: string;
};

export type Attendance = {
  event_id: string;
  profile_id: string;
  selfie_path: string | null;
  checked_in_at: string;
  lat: number | null;
  lng: number | null;
  accuracy_m: number | null;
  distance_m: number | null;
  added_manually: boolean;
};

/** קודי השגיאה ש-check_in() זורקת. הטקסט למשתמש ב-lib/errors.ts */
export type CheckInError =
  | "EVENT_NOT_FOUND"
  | "NOT_A_MEMBER"
  | "TOO_EARLY"
  | "TOO_LATE"
  | "TOO_FAR"
  | "ALREADY_CHECKED_IN";
