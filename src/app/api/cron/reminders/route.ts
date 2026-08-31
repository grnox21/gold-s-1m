import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";
import { expireStaleHolds } from "@/lib/booking/engine";
import { notifyAppointment } from "@/lib/whatsapp/send";
import { notifyOwnerByEmail } from "@/lib/email/notify";
import type { Appointment } from "@/types/database";

export const dynamic = "force-dynamic";

/**
 * Needs something to call it roughly once a minute. It does NOT ship wired
 * to Vercel Cron on purpose: Vercel's Hobby (free) plan only allows
 * once-a-day cron schedules, and a per-minute `vercel.json` entry makes
 * every deployment fail outright on that plan — found this the hard way
 * mid-deploy. Pick one instead:
 *   - Free external pinger (easiest, no plan required): a service like
 *     cron-job.org, hitting this URL every minute with header
 *     `Authorization: Bearer <CRON_SECRET>`.
 *   - Supabase pg_cron + pg_net calling this same URL on a schedule.
 *   - Vercel Cron via vercel.json — but only once you're on a paid plan
 *     that supports per-minute schedules.
 * Whichever you pick, set CRON_SECRET in your env and send it as
 * `Authorization: Bearer $CRON_SECRET` — that's what's checked below.
 *
 * Two responsibilities, both idempotent (see notifyAppointment's /
 * notifyOwnerByEmail's WHERE-flag=false claim — running this twice in the
 * same minute, or every minute forever, never double-sends):
 *   1. 30-minute reminders to the barber, the customer, and (by email) the
 *      shop owner.
 *   2. A safety-net retry for booking confirmations that didn't send
 *      synchronously right after checkout (e.g. a transient WhatsApp API
 *      error) — bounded to the last hour so it never resurrects old rows.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const supabase = createServiceClient();
  await expireStaleHolds(supabase);

  const now = Date.now();
  const windowStart = new Date(now + 25 * 60_000).toISOString();
  const windowEnd = new Date(now + 35 * 60_000).toISOString();

  const { data: dueAppointments } = await supabase
    .from("appointments")
    .select("*")
    .eq("status", "confirmed")
    .gte("start_at", windowStart)
    .lte("start_at", windowEnd)
    .or("barber_reminder_sent.eq.false,customer_reminder_sent.eq.false,owner_reminder_sent.eq.false");

  let barberReminders = 0;
  let customerReminders = 0;
  let ownerReminders = 0;

  for (const appointment of (dueAppointments ?? []) as Appointment[]) {
    if (!appointment.barber_reminder_sent) {
      const result = await notifyAppointment(supabase, appointment.id, "reminder_barber");
      if (result.status === "sent" || result.status === "skipped") barberReminders++;
    }
    if (!appointment.customer_reminder_sent) {
      const result = await notifyAppointment(supabase, appointment.id, "reminder_customer");
      if (result.status === "sent" || result.status === "skipped") customerReminders++;
    }
    if (!appointment.owner_reminder_sent) {
      const result = await notifyOwnerByEmail(supabase, appointment.id, "reminder_owner");
      if (result.status === "sent" || result.status === "skipped") ownerReminders++;
    }
  }

  const oneHourAgo = new Date(now - 60 * 60_000).toISOString();
  const { data: unconfirmedNotices } = await supabase
    .from("appointments")
    .select("*")
    .eq("status", "confirmed")
    .eq("confirmation_sent", false)
    .gte("created_at", oneHourAgo);

  let retriedConfirmations = 0;
  for (const appointment of (unconfirmedNotices ?? []) as Appointment[]) {
    const result = await notifyAppointment(supabase, appointment.id, "booking_customer");
    if (result.status === "sent" || result.status === "skipped") retriedConfirmations++;
  }

  return NextResponse.json({
    ok: true,
    checkedAt: new Date(now).toISOString(),
    barberReminders,
    customerReminders,
    ownerReminders,
    retriedConfirmations,
  });
}
