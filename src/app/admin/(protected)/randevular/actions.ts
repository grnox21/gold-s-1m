"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";
import {
  BookingError,
  cancelAppointment,
  createAppointment,
  markCompleted,
  markNoShow,
  rescheduleAppointment,
} from "@/lib/booking/engine";
import { normalizeTurkishPhone } from "@/lib/booking/phone";
import { notifyAppointment } from "@/lib/whatsapp/send";
import type { ActionResult } from "@/lib/admin/types";
import type { AdminUser } from "@/types/database";

function revalidateAppointmentPaths() {
  revalidatePath("/admin/randevular");
  revalidatePath("/admin/takvim");
  revalidatePath("/admin");
}

/**
 * A 'barber' login only ever acts on their own appointments — even though
 * the UI already only offers their own rows, the action itself has to
 * re-check, since it's a plain server function reachable with any id.
 * Owner/admin logins skip this and can touch anything, same as before.
 */
async function assertOwnsAppointment(
  supabase: ReturnType<typeof createServiceClient>,
  admin: AdminUser,
  appointmentId: string
) {
  if (admin.role !== "barber") return;
  const { data } = await supabase.from("appointments").select("barber_id").eq("id", appointmentId).maybeSingle();
  if (!data || data.barber_id !== admin.barber_id) {
    throw new BookingError("forbidden", "Bu randevu üzerinde yetkiniz yok.");
  }
}

const createSchema = z.object({
  barberId: z.uuid(),
  serviceIds: z.array(z.uuid()).min(1, "En az bir hizmet seçin."),
  startAt: z.string().min(1, "Tarih ve saat seçin."),
  customerName: z.string().trim().min(2, "Ad soyad girin."),
  customerPhone: z.string().trim().min(8, "Telefon girin."),
  customerEmail: z.string().trim().optional(),
  customerNote: z.string().trim().optional(),
  notify: z.boolean().default(true),
});

export async function adminCreateAppointment(input: unknown): Promise<ActionResult> {
  const { admin } = await requireAdmin();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  if (admin.role === "barber" && parsed.data.barberId !== admin.barber_id) {
    return { ok: false, error: "Bu randevu üzerinde yetkiniz yok." };
  }

  const supabase = createServiceClient();
  try {
    const appointment = await createAppointment(supabase, {
      barberId: parsed.data.barberId,
      serviceIds: parsed.data.serviceIds,
      startAt: new Date(parsed.data.startAt),
      customerName: parsed.data.customerName,
      customerPhone: normalizeTurkishPhone(parsed.data.customerPhone),
      customerEmail: parsed.data.customerEmail || undefined,
      customerNote: parsed.data.customerNote || undefined,
      status: "confirmed",
    });

    if (parsed.data.notify) {
      await Promise.allSettled([
        notifyAppointment(supabase, appointment.id, "booking_barber"),
        notifyAppointment(supabase, appointment.id, "booking_customer"),
      ]);
    }
  } catch (err) {
    if (err instanceof BookingError) return { ok: false, error: err.message };
    return { ok: false, error: "Randevu oluşturulamadı." };
  }

  revalidateAppointmentPaths();
  return { ok: true };
}

export async function adminCancelAppointment(id: string, reason?: string): Promise<ActionResult> {
  const { admin } = await requireAdmin();
  const supabase = createServiceClient();
  try {
    await assertOwnsAppointment(supabase, admin, id);
    await cancelAppointment(supabase, id, reason);
  } catch (err) {
    if (err instanceof BookingError) return { ok: false, error: err.message };
    return { ok: false, error: "Randevu iptal edilemedi." };
  }
  revalidateAppointmentPaths();
  return { ok: true };
}

export async function adminMarkCompleted(id: string): Promise<ActionResult> {
  const { admin } = await requireAdmin();
  const supabase = createServiceClient();
  try {
    await assertOwnsAppointment(supabase, admin, id);
    await markCompleted(supabase, id);
  } catch (err) {
    if (err instanceof BookingError) return { ok: false, error: err.message };
    return { ok: false, error: "İşaretlenemedi." };
  }
  revalidateAppointmentPaths();
  return { ok: true };
}

export async function adminMarkNoShow(id: string): Promise<ActionResult> {
  const { admin } = await requireAdmin();
  const supabase = createServiceClient();
  try {
    await assertOwnsAppointment(supabase, admin, id);
    await markNoShow(supabase, id);
  } catch (err) {
    if (err instanceof BookingError) return { ok: false, error: err.message };
    return { ok: false, error: "İşaretlenemedi." };
  }
  revalidateAppointmentPaths();
  return { ok: true };
}

const rescheduleSchema = z.object({
  appointmentId: z.uuid(),
  newStartAt: z.string().min(1),
  newBarberId: z.uuid().optional(),
});

export async function adminRescheduleAppointment(input: unknown): Promise<ActionResult> {
  const { admin } = await requireAdmin();
  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Geçersiz form." };
  if (admin.role === "barber" && parsed.data.newBarberId && parsed.data.newBarberId !== admin.barber_id) {
    return { ok: false, error: "Bu randevu üzerinde yetkiniz yok." };
  }

  const supabase = createServiceClient();
  try {
    await assertOwnsAppointment(supabase, admin, parsed.data.appointmentId);
    await rescheduleAppointment(supabase, {
      appointmentId: parsed.data.appointmentId,
      newStartAt: new Date(parsed.data.newStartAt),
      newBarberId: parsed.data.newBarberId,
    });
  } catch (err) {
    if (err instanceof BookingError) return { ok: false, error: err.message };
    return { ok: false, error: "Yeniden planlanamadı." };
  }
  revalidateAppointmentPaths();
  return { ok: true };
}
