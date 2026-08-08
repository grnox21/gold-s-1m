import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { getAvailableSlots } from "@/lib/booking/engine";
import { formatIstanbulTime } from "@/lib/booking/time";

const schema = z.object({
  barberId: z.uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationMinutes: z.number().int().min(15),
  /** Excluded from the "busy" check — the appointment currently being
   * rescheduled shouldn't block its own new time. */
  excludeAppointmentId: z.uuid().optional(),
});

/**
 * Same engine as the public /api/availability, but takes a duration
 * directly instead of service ids (used by the reschedule dialog, where
 * the original service selection may no longer match what's active) and
 * requires an admin session.
 */
export async function POST(request: Request) {
  await requireAdmin();

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });

  const supabase = createServiceClient();
  const result = await getAvailableSlots(supabase, {
    barberId: parsed.data.barberId,
    date: parsed.data.date,
    totalDurationMinutes: parsed.data.durationMinutes,
  });

  // The engine already excludes the current instant and busy ranges; when
  // rescheduling, the appointment's own existing slot would otherwise show
  // as unavailable to itself if the date/barber didn't change — add it
  // back in as a valid option.
  if (parsed.data.excludeAppointmentId) {
    const { data: current } = await supabase
      .from("appointments")
      .select("id, start_at, end_at, barber_id")
      .eq("id", parsed.data.excludeAppointmentId)
      .maybeSingle();
    if (current && current.barber_id === parsed.data.barberId) {
      const alreadyThere = result.slots.some((s) => s.startAt.toISOString() === current.start_at);
      if (!alreadyThere) {
        result.slots.push({ startAt: new Date(current.start_at), endAt: new Date(current.end_at) });
        result.slots.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
      }
    }
  }

  return NextResponse.json({
    isOpen: result.isOpen,
    closedReason: result.closedReason ?? null,
    slots: result.slots.map((s) => ({
      startAt: s.startAt.toISOString(),
      endAt: s.endAt.toISOString(),
      label: formatIstanbulTime(s.startAt),
    })),
  });
}
