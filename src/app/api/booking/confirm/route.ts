import { NextResponse } from "next/server";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/service";
import { confirmHold, suggestAlternatives } from "@/lib/booking/engine";
import { notifyAppointment } from "@/lib/whatsapp/send";
import { notifyOwnerByEmail } from "@/lib/email/notify";
import { dateStringFromInstant, formatIstanbulTime } from "@/lib/booking/time";
import type { Barber } from "@/types/database";

const bodySchema = z.object({ appointmentId: z.uuid() });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz randevu kimliği." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const confirmed = await confirmHold(supabase, parsed.data.appointmentId);

  if (!confirmed) {
    // The hold expired (or never existed under this id) before the customer
    // finished confirming. Look up what we can to offer fresh alternatives
    // instead of a dead end.
    const { data: stale } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", parsed.data.appointmentId)
      .maybeSingle();

    if (stale) {
      const { data: servicesData } = await supabase
        .from("appointment_services")
        .select("service_id, duration_at_booking")
        .eq("appointment_id", stale.id);
      const totalDurationMinutes = (servicesData ?? []).reduce(
        (sum: number, s: { duration_at_booking: number }) => sum + s.duration_at_booking,
        0
      );
      const date = dateStringFromInstant(new Date(stale.start_at));
      const alternatives = await suggestAlternatives(supabase, {
        barberId: stale.barber_id,
        date,
        totalDurationMinutes: totalDurationMinutes || 30,
        after: new Date(stale.start_at),
        count: 3,
      });
      return NextResponse.json(
        {
          error:
            "Randevu için ayrılan süre doldu ve bu saat serbest bırakıldı. Lütfen başka bir saat seçin.",
          alternatives: alternatives.map((s) => ({
            startAt: s.startAt.toISOString(),
            endAt: s.endAt.toISOString(),
            label: formatIstanbulTime(s.startAt),
          })),
        },
        { status: 410 }
      );
    }

    return NextResponse.json(
      { error: "Randevu için ayrılan süre doldu. Lütfen randevu adımlarını tekrar başlatın." },
      { status: 410 }
    );
  }

  const [{ data: barberData }, { data: appointmentServices }] = await Promise.all([
    supabase.from("barbers").select("*").eq("id", confirmed.barber_id).maybeSingle(),
    supabase.from("appointment_services").select("*").eq("appointment_id", confirmed.id),
  ]);
  const barber = barberData as Barber | null;

  // Notifications never block the booking result — a WhatsApp/email failure
  // must not undo an already-confirmed appointment. Still awaited (via
  // allSettled, not fired-and-forgotten): an unawaited promise here could
  // get killed mid-flight the moment this function returns its response on
  // serverless hosting. The owner's email fires for every booking
  // regardless of WhatsApp settings — a separate channel the owner asked
  // for specifically to always know about new appointments.
  const [barberNotify, customerNotify] = await Promise.allSettled([
    notifyAppointment(supabase, confirmed.id, "booking_barber"),
    notifyAppointment(supabase, confirmed.id, "booking_customer"),
    notifyOwnerByEmail(supabase, confirmed.id, "booking_owner"),
  ]);

  return NextResponse.json({
    appointment: {
      id: confirmed.id,
      startAt: confirmed.start_at,
      endAt: confirmed.end_at,
      totalDurationMinutes: confirmed.total_duration_minutes,
      totalPrice: confirmed.total_price,
      status: confirmed.status,
      customerName: confirmed.customer_name,
    },
    barber: barber ? { id: barber.id, name: barber.name, whatsappNumber: barber.whatsapp_number } : null,
    services: (appointmentServices ?? []).map((s: { name_at_booking: string; price_at_booking: number; duration_at_booking: number }) => ({
      name: s.name_at_booking,
      price: s.price_at_booking,
      durationMinutes: s.duration_at_booking,
    })),
    notifications: {
      barber: barberNotify.status === "fulfilled" ? barberNotify.value : { status: "failed" },
      customer: customerNotify.status === "fulfilled" ? customerNotify.value : { status: "failed" },
    },
  });
}
