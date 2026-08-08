import { NextResponse } from "next/server";
import { z } from "zod";

import { calculateDuration, getAvailableSlots } from "@/lib/booking/engine";
import { availabilityQuerySchema } from "@/lib/validations/booking";
import { createServiceClient } from "@/lib/supabase/service";
import { formatIstanbulTime } from "@/lib/booking/time";
import type { Service } from "@/types/database";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const parsed = availabilityQuerySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: z.prettifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { barberId, date, serviceIds } = parsed.data;
  const supabase = createServiceClient();

  const { data: servicesData, error: servicesError } = await supabase
    .from("services")
    .select("*")
    .in("id", serviceIds)
    .eq("is_active", true);

  if (servicesError || !servicesData || servicesData.length !== serviceIds.length) {
    return NextResponse.json({ error: "Seçilen hizmetlerden biri artık mevcut değil." }, { status: 400 });
  }

  const totalDurationMinutes = calculateDuration(servicesData as Service[]);
  const result = await getAvailableSlots(supabase, { barberId, date, totalDurationMinutes });

  return NextResponse.json({
    isOpen: result.isOpen,
    closedReason: result.closedReason ?? null,
    totalDurationMinutes,
    slots: result.slots.map((s) => ({
      startAt: s.startAt.toISOString(),
      endAt: s.endAt.toISOString(),
      label: formatIstanbulTime(s.startAt),
    })),
  });
}
