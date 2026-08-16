"use server";

import { revalidatePath } from "next/cache";
import { demoMode } from "../config";
import type { MemberRole, Profile, SwellEvent } from "../types";
import {
  demoAddEventPhoto,
  demoCheckIn,
  demoCreateEvent,
  demoDeleteEventPhoto,
  demoSetMyRole,
  demoToggleRsvp,
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
export async function checkInAction(eventId: string, selfie: string | null) {
  guard();
  demoCheckIn(eventId, selfie);
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

/** משנה בין תצוגת מנהלת קהילה לתצוגת חבר רגיל, כדי להראות את שני
 * הצדדים בהדגמה אחת. משפיע על סרגל הניווט ועל הגישה ל-/admin. */
export async function setMyRoleAction(role: MemberRole) {
  guard();
  demoSetMyRole(role);
  // התפקיד קובע את תפריט הניווט בשלד האפליקציה, אז מרעננים את כל העץ
  revalidatePath("/", "layout");
}
