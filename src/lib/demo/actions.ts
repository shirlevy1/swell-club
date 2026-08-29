"use server";

import { revalidatePath } from "next/cache";
import { demoMode } from "../config";
import type { MemberRole, Profile, SwellEvent } from "../types";
import {
  demoAddEventPhoto,
  demoApproveEventPhoto,
  demoCheckIn,
  demoCreateEvent,
  demoDeleteEventPhoto,
  demoSetMyRole,
  demoToggleRsvp,
  demoUpdateEventSchedule,
  demoUpdateProfile,
} from "./store";

function guard() {
  if (!demoMode) throw new Error("demo actions are disabled");
}

export async function toggleRsvpAction(eventId: string) {
  guard();
  demoToggleRsvp(eventId);
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
}

/** הסלפי מגיע כ-data URL ונשמר בזיכרון. אין אחסון במצב הדגמה. */
export async function checkInAction(
  eventId: string,
  selfie: string | null,
  faceX: number | null = null,
  faceY: number | null = null,
) {
  guard();
  demoCheckIn(eventId, selfie, faceX, faceY);
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
}

export async function updateProfileAction(patch: Partial<Profile>) {
  guard();
  demoUpdateProfile(patch);
  revalidatePath("/profile");
}

export async function createEventAction(event: SwellEvent) {
  guard();
  demoCreateEvent(event);
  revalidatePath("/events");
  revalidatePath("/admin");
}

export async function updateEventScheduleAction(
  eventId: string,
  patch: {
    title: string;
    starts_at: string;
    location_name: string;
    lat: number;
    lng: number;
    maps_url: string | null;
    checkin_radius_m: number;
    checkin_opens_before_min: number;
    checkin_closes_after_min: number;
    description: string | null;
    agenda_text: string | null;
    agenda_visible: boolean;
    equipment_text: string | null;
    equipment_visible: boolean;
    equipment_link_visible: boolean;
    is_sea: boolean;
  },
) {
  guard();
  demoUpdateEventSchedule(eventId, patch);
  revalidatePath(`/events/${eventId}`);
}

/** התמונה מגיעה כ-data URL ונשמרת בזיכרון, כמו הסלפי בהדגמה. */
export async function addEventPhotoAction(eventId: string, dataUrl: string) {
  guard();
  demoAddEventPhoto(eventId, dataUrl);
  revalidatePath(`/events/${eventId}`);
}

export async function deleteEventPhotoAction(eventId: string, photoId: string) {
  guard();
  demoDeleteEventPhoto(photoId);
  revalidatePath(`/events/${eventId}`);
}

export async function approveEventPhotoAction(eventId: string, photoId: string) {
  guard();
  demoApproveEventPhoto(photoId);
  revalidatePath(`/events/${eventId}`);
}

/** משנה בין תצוגת מנהלת קהילה לתצוגת חבר רגיל, כדי להראות את שני
 * הצדדים בהדגמה אחת. משפיע על סרגל הניווט ועל הגישה ל-/admin. */
export async function setMyRoleAction(role: MemberRole) {
  guard();
  demoSetMyRole(role);
  // התפקיד קובע את תפריט הניווט בשלד האפליקציה, אז מרעננים את כל העץ
  revalidatePath("/", "layout");
}
