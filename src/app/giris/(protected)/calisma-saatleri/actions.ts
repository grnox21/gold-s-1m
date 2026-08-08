"use server";

import { revalidatePath } from "next/cache";

import { requireFullAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/admin/types";

export interface WorkingHourRow {
  weekday: number;
  isClosed: boolean;
  startTime: string;
  endTime: string;
}

export async function saveWorkingHours(barberId: string, rows: WorkingHourRow[]): Promise<ActionResult> {
  await requireFullAdmin();

  for (const row of rows) {
    if (!row.isClosed && (!row.startTime || !row.endTime || row.startTime >= row.endTime)) {
      return { ok: false, error: `${row.weekday}. gün için geçerli bir başlangıç/bitiş saati girin.` };
    }
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("working_hours").upsert(
    rows.map((row) => ({
      barber_id: barberId,
      weekday: row.weekday,
      is_closed: row.isClosed,
      start_time: row.isClosed ? null : row.startTime,
      end_time: row.isClosed ? null : row.endTime,
    })),
    { onConflict: "barber_id,weekday" }
  );

  if (error) return { ok: false, error: "Çalışma saatleri kaydedilemedi." };
  revalidatePath("/giris/calisma-saatleri");
  revalidatePath("/randevu");
  return { ok: true };
}
