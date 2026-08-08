import { NextResponse } from "next/server";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/service";
import { createAppointmentSchema } from "@/lib/validations/booking";
import { normalizeTurkishPhone } from "@/lib/booking/phone";
import { calculateDuration, calculatePrice, createAppointment, suggestAlternatives, BookingError } from "@/lib/booking/engine";
import { dateStringFromInstant, formatIstanbulTime } from "@/lib/booking/time";
import type { Barber, Service } from "@/types/database";

const HOLD_SECONDS = 180;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const parsed = createAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }

  const input = parsed.data;
  const supabase = createServiceClient();
  const startAt = new Date(input.startAt);
  const date = dateStringFromInstant(startAt);

  const [{ data: barberData }, { data: servicesData }] = await Promise.all([
    supabase.from("barbers").select("*").eq("id", input.barberId).eq("is_active", true).maybeSingle(),
    supabase.from("services").select("*").in("id", input.serviceIds).eq("is_active", true),
  ]);

  const barber = barberData as Barber | null;
  const services = (servicesData ?? []) as Service[];

  if (!barber) {
    return NextResponse.json({ error: "Seçilen berber artık uygun değil." }, { status: 400 });
  }
  if (services.length !== input.serviceIds.length) {
    return NextResponse.json({ error: "Seçilen hizmetlerden biri artık mevcut değil." }, { status: 400 });
  }

  const totalDurationMinutes = calculateDuration(services);

  try {
    const appointment = await createAppointment(supabase, {
      barberId: input.barberId,
      serviceIds: input.serviceIds,
      startAt,
      customerName: input.customerName,
      customerPhone: normalizeTurkishPhone(input.customerPhone),
      customerEmail: input.customerEmail,
      customerNote: input.customerNote,
      status: "held",
      holdSeconds: HOLD_SECONDS,
    });

    return NextResponse.json({
      appointmentId: appointment.id,
      holdExpiresAt: appointment.hold_expires_at,
      holdSeconds: HOLD_SECONDS,
      startAt: appointment.start_at,
      endAt: appointment.end_at,
      totalDurationMinutes,
      totalPrice: calculatePrice(services),
      barber: { id: barber.id, name: barber.name },
      services: services.map((s) => ({ id: s.id, name: s.name, price: s.price, durationMinutes: s.duration_minutes })),
    });
  } catch (err) {
    if (err instanceof BookingError && err.code === "slot_taken") {
      const alternatives = await suggestAlternatives(supabase, {
        barberId: input.barberId,
        date,
        totalDurationMinutes,
        after: startAt,
        count: 3,
      });
      return NextResponse.json(
        {
          error: err.message,
          alternatives: alternatives.map((s) => ({
            startAt: s.startAt.toISOString(),
            label: formatIstanbulTime(s.startAt),
          })),
        },
        { status: 409 }
      );
    }
    if (err instanceof BookingError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
