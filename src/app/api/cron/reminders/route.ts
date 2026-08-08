import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";
import { expireStaleHolds } from "@/lib/booking/engine";
import { notifyAppointment } from "@/lib/whatsapp/send";
import type { Appointment } from "@/types/database";

export const dynamic = "force-dynamic";

/**
 * Driven by Vercel Cron, once a minute (see `vercel.json`). That schedule
 * needs a paid Vercel plan — Hobby (free) only allows once-a-day cron
 * schedules and rejects a per-minute entry at deploy time, failing the
 * *entire* deployment, not just the cron. If you ever drop back to Hobby,
 * empty out the `crons` array in `vercel.json` and drive this endpoint
 * from something else instead: a free external pinger (e.g. cron-job.org)
 * hitting this URL every minute, or Supabase pg_cron + pg_net.
 * Whichever calls it, set CRON_SECRET in your env and send it as
 * `Authorization: Bearer $CRON_SECRET` — that's what's checked below.
 *
 * Two responsibilities, both idempotent (see notifyAppointment's
 * WHERE-flag=false claim — running this twice in the same minute, or every
 * minute forever, never double-sends):
 *   1. 30-minute reminders to the barber and the customer.
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
    .or("barber_reminder_sent.eq.false,customer_reminder_sent.eq.false");

  let barberReminders = 0;
  let customerReminders = 0;

  for (const appointment of (dueAppointments ?? []) as Appointment[]) {
    if (!appointment.barber_reminder_sent) {
      const result = await notifyAppointment(supabase, appointment.id, "reminder_barber");
      if (result.status === "sent" || result.status === "skipped") barberReminders++;
    }
    if (!appointment.customer_reminder_sent) {
      const result = await notifyAppointment(supabase, appointment.id, "reminder_customer");
      if (result.status === "sent" || result.status === "skipped") customerReminders++;
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
    retriedConfirmations,
  });
}
