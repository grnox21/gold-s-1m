import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Appointment,
  AppointmentStatus,
  Barber,
  BlockedTime,
  BreakTime,
  Service,
  WorkingHour,
} from "@/types/database";
import { addMinutes, istanbulDateTime, rangesOverlap, weekdayForDate } from "./time";

/** Scan granularity for candidate start times. Every seeded service duration
 * is a multiple of this, so it lines up with the "17:00, 17:30, 18:00"
 * style slots the spec asks for. Actual availability still checks the full
 * requested duration, not just this step. */
const SLOT_STEP_MINUTES = 30;
const OCCUPYING_STATUSES: AppointmentStatus[] = ["held", "pending", "confirmed"];

export interface Interval {
  start: Date;
  end: Date;
}

export interface Slot {
  startAt: Date;
  endAt: Date;
}

export type ClosedReason = "no_barber" | "weekly_off" | "in_past";

export interface AvailabilityResult {
  isOpen: boolean;
  closedReason?: ClosedReason;
  workingWindow?: Interval;
  slots: Slot[];
}

export class BookingError extends Error {
  constructor(
    public code:
      | "slot_taken"
      | "invalid_service_selection"
      | "outside_working_hours"
      | "barber_inactive"
      | "not_found"
      | "unknown",
    message: string
  ) {
    super(message);
    this.name = "BookingError";
  }
}

/** Best-effort sweep of abandoned holds. Safe to call often; cheap indexed delete. */
export async function expireStaleHolds(supabase: SupabaseClient): Promise<void> {
  await supabase.rpc("expire_stale_holds");
}

export function calculateDuration(services: Pick<Service, "duration_minutes">[]): number {
  return services.reduce((sum, s) => sum + s.duration_minutes, 0);
}

export function calculatePrice(services: Pick<Service, "price">[]): number {
  return Math.round(services.reduce((sum, s) => sum + Number(s.price), 0) * 100) / 100;
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: Interval[] = [sorted[0]];
  for (const current of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (current.start <= last.end) {
      if (current.end > last.end) last.end = current.end;
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
}

/** The barber's working window for one Istanbul calendar date, or null if closed that day. */
export async function getWorkingWindow(
  supabase: SupabaseClient,
  barberId: string,
  date: string
): Promise<Interval | null> {
  const weekday = weekdayForDate(date);
  const { data } = await supabase
    .from("working_hours")
    .select("*")
    .eq("barber_id", barberId)
    .eq("weekday", weekday)
    .maybeSingle();

  const wh = data as WorkingHour | null;
  if (!wh || wh.is_closed || !wh.start_time || !wh.end_time) return null;

  return {
    start: istanbulDateTime(date, wh.start_time),
    end: istanbulDateTime(date, wh.end_time),
  };
}

/** Every occupied interval for a barber that falls within `window` — breaks, blocked times, and live appointments. */
export async function getBusyIntervals(
  supabase: SupabaseClient,
  barberId: string,
  date: string,
  window: Interval
): Promise<Interval[]> {
  const weekday = weekdayForDate(date);

  const [breaksRes, blockedRes, appointmentsRes] = await Promise.all([
    supabase.from("break_times").select("*").eq("barber_id", barberId).eq("weekday", weekday),
    supabase
      .from("blocked_times")
      .select("*")
      .or(`barber_id.eq.${barberId},barber_id.is.null`)
      .lt("start_at", window.end.toISOString())
      .gt("end_at", window.start.toISOString()),
    supabase
      .from("appointments")
      .select("*")
      .eq("barber_id", barberId)
      .in("status", OCCUPYING_STATUSES)
      .lt("start_at", window.end.toISOString())
      .gt("end_at", window.start.toISOString()),
  ]);

  const breaks = ((breaksRes.data ?? []) as BreakTime[]).map((b) => ({
    start: istanbulDateTime(date, b.start_time),
    end: istanbulDateTime(date, b.end_time),
  }));

  const blocked = ((blockedRes.data ?? []) as BlockedTime[]).map((b) => ({
    start: new Date(b.start_at),
    end: new Date(b.end_at),
  }));

  const now = new Date();
  const appointments = ((appointmentsRes.data ?? []) as Appointment[])
    // Defensive: a hold that expired between the sweep and this read
    // shouldn't block anyone. The sweep (expireStaleHolds) is what actually
    // frees the DB row; this just guards the read in that narrow window.
    .filter((a) => a.status !== "held" || !a.hold_expires_at || new Date(a.hold_expires_at) > now)
    .map((a) => ({ start: new Date(a.start_at), end: new Date(a.end_at) }));

  return mergeIntervals([...breaks, ...blocked, ...appointments]);
}

export interface GetAvailableSlotsParams {
  barberId: string;
  date: string; // "YYYY-MM-DD", Istanbul calendar date
  totalDurationMinutes: number;
}

/**
 * The availability engine: only returns start times where the ENTIRE
 * requested duration is free — never a slot that would clip a break, a
 * blocked time, another appointment, or closing time.
 */
export async function getAvailableSlots(
  supabase: SupabaseClient,
  { barberId, date, totalDurationMinutes }: GetAvailableSlotsParams
): Promise<AvailabilityResult> {
  await expireStaleHolds(supabase);

  const { data: barberData } = await supabase
    .from("barbers")
    .select("*")
    .eq("id", barberId)
    .maybeSingle();
  const barber = barberData as Barber | null;
  if (!barber || !barber.is_active) {
    return { isOpen: false, closedReason: "no_barber", slots: [] };
  }

  const window = await getWorkingWindow(supabase, barberId, date);
  if (!window) {
    return { isOpen: false, closedReason: "weekly_off", slots: [] };
  }

  const busy = await getBusyIntervals(supabase, barberId, date, window);
  const now = new Date();

  const slots: Slot[] = [];
  for (
    let start = new Date(window.start);
    addMinutes(start, totalDurationMinutes) <= window.end;
    start = addMinutes(start, SLOT_STEP_MINUTES)
  ) {
    if (start <= now) continue; // no booking into the past or this instant

    const end = addMinutes(start, totalDurationMinutes);
    const overlapsBusy = busy.some((b) => rangesOverlap(start, end, b.start, b.end));
    if (!overlapsBusy) slots.push({ startAt: new Date(start), endAt: end });
  }

  if (slots.length === 0 && addMinutes(window.start, totalDurationMinutes) > window.end) {
    // Duration alone doesn't fit in the working window at all, any day.
    return { isOpen: false, closedReason: "in_past", workingWindow: window, slots: [] };
  }

  return { isOpen: true, workingWindow: window, slots };
}

/** Fast pre-flight check before attempting a write. Not the source of truth
 * — the database exclusion constraint is — but lets the API return a
 * friendly Turkish message plus alternatives without a failed write. */
export async function checkAvailability(
  supabase: SupabaseClient,
  barberId: string,
  startAt: Date,
  endAt: Date,
  date: string
): Promise<boolean> {
  const window = await getWorkingWindow(supabase, barberId, date);
  if (!window) return false;
  if (startAt < window.start || endAt > window.end) return false;
  if (startAt <= new Date()) return false;

  const busy = await getBusyIntervals(supabase, barberId, date, window);
  return !busy.some((b) => rangesOverlap(startAt, endAt, b.start, b.end));
}

export interface SuggestAlternativesParams {
  barberId: string;
  date: string;
  totalDurationMinutes: number;
  after?: Date;
  count?: number;
  maxDaysAhead?: number;
}

/** "Bu hizmetler için uygun başka saatler" — scans forward from the requested
 * time, and into the following days if the rest of the requested day can't
 * fill the quota, so the customer always sees real next options. */
export async function suggestAlternatives(
  supabase: SupabaseClient,
  { barberId, date, totalDurationMinutes, after, count = 3, maxDaysAhead = 6 }: SuggestAlternativesParams
): Promise<Slot[]> {
  const results: Slot[] = [];
  let cursorDate = date;

  for (let dayOffset = 0; dayOffset <= maxDaysAhead && results.length < count; dayOffset++) {
    if (dayOffset > 0) {
      const d = new Date(`${date}T00:00:00${"+03:00"}`);
      d.setUTCDate(d.getUTCDate() + dayOffset);
      cursorDate = d.toISOString().slice(0, 10);
    }

    const { slots } = await getAvailableSlots(supabase, {
      barberId,
      date: cursorDate,
      totalDurationMinutes,
    });

    const filtered =
      dayOffset === 0 && after ? slots.filter((s) => s.startAt > after) : slots;

    for (const slot of filtered) {
      if (results.length >= count) break;
      results.push(slot);
    }
  }

  return results;
}

export interface CreateAppointmentInput {
  barberId: string;
  serviceIds: string[];
  startAt: Date;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerNote?: string;
  status?: "held" | "confirmed";
  holdSeconds?: number;
}

/** Atomic create via the create_appointment() SQL function — see
 * supabase/migrations/0008_functions.sql. The exclusion constraint is what
 * actually decides a race between two simultaneous requests; this wrapper
 * just turns a 23P01 into a friendly Turkish error + fresh alternatives. */
export async function createAppointment(
  supabase: SupabaseClient,
  input: CreateAppointmentInput
): Promise<Appointment> {
  const { data, error } = await supabase.rpc("create_appointment", {
    p_barber_id: input.barberId,
    p_service_ids: input.serviceIds,
    p_start_at: input.startAt.toISOString(),
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_customer_email: input.customerEmail ?? null,
    p_customer_note: input.customerNote ?? null,
    p_status: input.status ?? "confirmed",
    p_hold_seconds: input.holdSeconds ?? 180,
  });

  if (error) {
    if (error.code === "23P01") {
      throw new BookingError(
        "slot_taken",
        "Bu saat az önce başka bir müşteri tarafından rezerve edildi. Lütfen başka bir saat seçin."
      );
    }
    if (error.message?.includes("invalid_service_selection") || error.message?.includes("no_services_selected")) {
      throw new BookingError("invalid_service_selection", "Seçilen hizmetlerden biri artık mevcut değil.");
    }
    throw new BookingError("unknown", "Randevu oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.");
  }

  return (Array.isArray(data) ? data[0] : data) as Appointment;
}

/** Promotes a temporary hold to a real appointment. Returns null if the
 * hold already expired (or was never this one) — the caller should treat
 * that as "slot lost" and re-run availability. */
export async function confirmHold(
  supabase: SupabaseClient,
  appointmentId: string
): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from("appointments")
    .update({ status: "confirmed", hold_expires_at: null })
    .eq("id", appointmentId)
    .eq("status", "held")
    .gt("hold_expires_at", new Date().toISOString())
    .select("*")
    .maybeSingle();

  if (error) throw new BookingError("unknown", "Randevu onaylanırken bir hata oluştu.");
  return (data as Appointment | null) ?? null;
}

export async function releaseHold(supabase: SupabaseClient, appointmentId: string): Promise<void> {
  await supabase.from("appointments").delete().eq("id", appointmentId).eq("status", "held");
}

export async function cancelAppointment(
  supabase: SupabaseClient,
  appointmentId: string,
  reason?: string
): Promise<Appointment> {
  const { data, error } = await supabase
    .from("appointments")
    .update({ status: "cancelled", cancel_reason: reason ?? null })
    .eq("id", appointmentId)
    .not("status", "in", "(cancelled,completed)")
    .select("*")
    .maybeSingle();

  if (error) throw new BookingError("unknown", "Randevu iptal edilirken bir hata oluştu.");
  if (!data) throw new BookingError("not_found", "Randevu bulunamadı ya da zaten sonlandırılmış.");
  return data as Appointment;
}

export interface RescheduleInput {
  appointmentId: string;
  newStartAt: Date;
  newBarberId?: string;
}

/** Reschedule goes through the same exclusion constraint as any other
 * write to `appointments` — a plain UPDATE is enough, no bespoke check. */
export async function rescheduleAppointment(
  supabase: SupabaseClient,
  { appointmentId, newStartAt, newBarberId }: RescheduleInput
): Promise<Appointment> {
  await expireStaleHolds(supabase);

  const { data: existing, error: fetchError } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .maybeSingle();

  if (fetchError || !existing) throw new BookingError("not_found", "Randevu bulunamadı.");
  const appointment = existing as Appointment;
  const newEndAt = addMinutes(newStartAt, appointment.total_duration_minutes);

  const { data, error } = await supabase
    .from("appointments")
    .update({
      barber_id: newBarberId ?? appointment.barber_id,
      start_at: newStartAt.toISOString(),
      end_at: newEndAt.toISOString(),
    })
    .eq("id", appointmentId)
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "23P01") {
      throw new BookingError(
        "slot_taken",
        "Bu saat az önce başka bir müşteri tarafından rezerve edildi. Lütfen başka bir saat seçin."
      );
    }
    throw new BookingError("unknown", "Randevu yeniden planlanırken bir hata oluştu.");
  }

  return data as Appointment;
}

export async function markCompleted(supabase: SupabaseClient, appointmentId: string): Promise<Appointment> {
  const { data, error } = await supabase
    .from("appointments")
    .update({ status: "completed" })
    .eq("id", appointmentId)
    .select("*")
    .maybeSingle();
  if (error || !data) throw new BookingError("unknown", "Randevu tamamlandı olarak işaretlenemedi.");
  return data as Appointment;
}

export async function markNoShow(supabase: SupabaseClient, appointmentId: string): Promise<Appointment> {
  const { data, error } = await supabase
    .from("appointments")
    .update({ status: "no_show" })
    .eq("id", appointmentId)
    .select("*")
    .maybeSingle();
  if (error || !data) throw new BookingError("unknown", "Randevu 'gelmedi' olarak işaretlenemedi.");
  return data as Appointment;
}
