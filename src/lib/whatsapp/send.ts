import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Appointment, Barber, WhatsAppSettings } from "@/types/database";
import { formatIstanbulDateLong, formatIstanbulTime } from "@/lib/booking/time";
import { createWhatsAppProvider } from "./factory";
import {
  bookingConfirmationToCustomer,
  bookingNotificationToBarber,
  cancellationToCustomer,
  reminderToBarber,
  reminderToCustomer,
  type NotificationContext,
} from "./templates";

export type NotificationKind =
  | "booking_barber"
  | "booking_customer"
  | "reminder_barber"
  | "reminder_customer"
  | "cancellation_customer";

const DEDUPE_COLUMN: Partial<Record<NotificationKind, "confirmation_sent" | "barber_reminder_sent" | "customer_reminder_sent">> = {
  booking_customer: "confirmation_sent",
  reminder_barber: "barber_reminder_sent",
  reminder_customer: "customer_reminder_sent",
};

// Exported so lib/email/notify.ts (the owner's email notifications — a
// separate channel, same underlying appointment data) can build the same
// NotificationContext without duplicating this join shape.
export type AppointmentWithRelations = Appointment & {
  barber: Barber;
  appointment_services: { name_at_booking: string }[];
};

/**
 * Atomically claims the right to send one notification. Uses a
 * check-and-set UPDATE (`WHERE <column> = false`) so that two overlapping
 * cron runs can never both send the same reminder — whichever request's
 * UPDATE actually flips the flag is the only one that proceeds.
 */
async function claimSlot(
  supabase: SupabaseClient,
  appointmentId: string,
  column: "confirmation_sent" | "barber_reminder_sent" | "customer_reminder_sent"
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

export function buildContext(appointment: AppointmentWithRelations): NotificationContext {
  const start = new Date(appointment.start_at);
  const end = new Date(appointment.end_at);
  return {
    barberName: appointment.barber.name,
    customerName: appointment.customer_name,
    customerPhone: appointment.customer_phone,
    serviceNames: appointment.appointment_services.map((s) => s.name_at_booking),
    dateLabel: formatIstanbulDateLong(start),
    timeRangeLabel: `${formatIstanbulTime(start)} – ${formatIstanbulTime(end)}`,
    startTimeLabel: formatIstanbulTime(start),
  };
}

async function logNotification(
  supabase: SupabaseClient,
  params: {
    appointmentId: string;
    recipientType: "barber" | "customer";
    recipientNumber: string | null;
    template: NotificationKind;
    status: "sent" | "failed" | "skipped";
    providerMessageId?: string;
    error?: string;
  }
) {
  await supabase.from("notification_logs").insert({
    appointment_id: params.appointmentId,
    channel: "whatsapp",
    recipient_type: params.recipientType,
    recipient_number: params.recipientNumber,
    template: params.template,
    status: params.status,
    provider_message_id: params.providerMessageId ?? null,
    error: params.error ?? null,
  });
}

export interface NotifyResult {
  status: "sent" | "failed" | "skipped" | "already_sent" | "not_applicable" | "disabled";
  waLink?: string;
}

/**
 * Sends one WhatsApp notification for one appointment. Idempotent for the
 * reminder/confirmation kinds — call it as many times as you like (e.g.
 * from a cron that re-scans every minute), it will only actually send once.
 */
export async function notifyAppointment(
  supabase: SupabaseClient,
  appointmentId: string,
  kind: NotificationKind
): Promise<NotifyResult> {
  const { data: settingsData } = await supabase.from("whatsapp_settings").select("*").eq("id", 1).maybeSingle();
  const settings =
    (settingsData as WhatsAppSettings | null) ??
    ({
      provider: "click_to_chat",
      phone_number_id: null,
      is_enabled: true,
      send_customer_confirmation: true,
      send_customer_reminder: true,
    } as Pick<WhatsAppSettings, "provider" | "phone_number_id" | "is_enabled" | "send_customer_confirmation" | "send_customer_reminder">);

  // Gated off before the dedupe slot is ever claimed, so flipping the
  // setting back on later still lets the cron's reminder scan / booking
  // confirmation retry pick the appointment back up instead of having
  // silently burned its one shot while the toggle was off.
  if (!settings.is_enabled) return { status: "disabled" };
  if (kind === "booking_customer" && !settings.send_customer_confirmation) return { status: "disabled" };
  if (kind === "reminder_customer" && !settings.send_customer_reminder) return { status: "disabled" };

  const dedupeColumn = DEDUPE_COLUMN[kind];
  if (dedupeColumn) {
    const claimed = await claimSlot(supabase, appointmentId, dedupeColumn);
    if (!claimed) return { status: "already_sent" };
  }

  const { data: appointmentData } = await supabase
    .from("appointments")
    .select("*, barber:barbers(*), appointment_services(name_at_booking)")
    .eq("id", appointmentId)
    .maybeSingle();

  const appointment = appointmentData as AppointmentWithRelations | null;
  if (!appointment) return { status: "not_applicable" };

  const ctx = buildContext(appointment);
  const recipientType: "barber" | "customer" = kind.endsWith("barber") ? "barber" : "customer";
  const recipientNumber = recipientType === "barber" ? appointment.barber.whatsapp_number : appointment.customer_phone;

  let text: string;
  switch (kind) {
    case "booking_barber":
      text = bookingNotificationToBarber(ctx);
      break;
    case "booking_customer":
      text = bookingConfirmationToCustomer(ctx);
      break;
    case "reminder_barber":
      text = reminderToBarber(ctx);
      break;
    case "reminder_customer":
      text = reminderToCustomer(ctx);
      break;
    case "cancellation_customer":
      text = cancellationToCustomer(ctx);
      break;
  }

  const provider = createWhatsAppProvider(settings);
  const result = await provider.sendMessage(recipientNumber, text);

  await logNotification(supabase, {
    appointmentId,
    recipientType,
    recipientNumber,
    template: kind,
    status: result.status,
    providerMessageId: result.status === "sent" ? result.providerMessageId : undefined,
    error: result.status === "failed" ? result.error : undefined,
  });

  return result.status === "skipped" ? { status: "skipped", waLink: result.waLink } : { status: result.status };
}
