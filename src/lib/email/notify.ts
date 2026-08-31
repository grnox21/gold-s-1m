import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SETTINGS_DEFAULTS } from "@/lib/site-data";
import { buildContext, type AppointmentWithRelations } from "@/lib/whatsapp/send";
import { sendEmail } from "./send";
import { ownerNewBookingEmail, ownerReminderEmail } from "./templates";

export type OwnerEmailKind = "booking_owner" | "reminder_owner";

const DEDUPE_COLUMN: Record<OwnerEmailKind, "owner_notification_sent" | "owner_reminder_sent"> = {
  booking_owner: "owner_notification_sent",
  reminder_owner: "owner_reminder_sent",
};

/** Same atomic check-and-set claim as claimSlot in lib/whatsapp/send.ts —
 * duplicated rather than shared because it's three lines and the column
 * sets differ (owner's two columns vs. the WhatsApp three). */
async function claimSlot(
  supabase: SupabaseClient,
  appointmentId: string,
  column: "owner_notification_sent" | "owner_reminder_sent"
): Promise<boolean> {
  const { data } = await supabase
    .from("appointments")
    .update({ [column]: true })
    .eq("id", appointmentId)
    .eq(column, false)
    .select("id")
    .maybeSingle();
  return Boolean(data);
}

export interface OwnerNotifyResult {
  status: "sent" | "failed" | "skipped" | "already_sent" | "not_applicable";
}

/**
 * Emails the shop owner about one appointment — a new booking, or a
 * 30-minutes-out reminder. Idempotent like notifyAppointment (lib/whatsapp/
 * send.ts): safe to call from a cron re-scan or a retried request, it only
 * actually sends once per kind per appointment. Never throws — a missing
 * RESEND_API_KEY or a failed send is logged and returned, not thrown,
 * since this must never be able to block a booking or crash the cron.
 */
export async function notifyOwnerByEmail(supabase: SupabaseClient, appointmentId: string, kind: OwnerEmailKind): Promise<OwnerNotifyResult> {
  const claimed = await claimSlot(supabase, appointmentId, DEDUPE_COLUMN[kind]);
  if (!claimed) return { status: "already_sent" };

  const { data: appointmentData } = await supabase
    .from("appointments")
    .select("*, barber:barbers(*), appointment_services(name_at_booking)")
    .eq("id", appointmentId)
    .maybeSingle();

  const appointment = appointmentData as AppointmentWithRelations | null;
  if (!appointment) return { status: "not_applicable" };

  const { data: settingRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "owner_notification_email")
    .maybeSingle();
  const ownerEmail = settingRow?.value || SETTINGS_DEFAULTS.owner_notification_email;

  const ctx = buildContext(appointment);
  const { subject, text } = kind === "booking_owner" ? ownerNewBookingEmail(ctx) : ownerReminderEmail(ctx);

  const result = await sendEmail({ to: ownerEmail, subject, text });

  await supabase.from("notification_logs").insert({
    appointment_id: appointmentId,
    channel: "email",
    recipient_type: "owner",
    recipient_number: ownerEmail, // holds an email address for this channel, not a phone number
    template: kind,
    status: result.status,
    provider_message_id: result.status === "sent" ? (result.providerMessageId ?? null) : null,
    error: result.status === "failed" ? result.error : result.status === "skipped" ? result.reason : null,
  });

  return { status: result.status };
}
