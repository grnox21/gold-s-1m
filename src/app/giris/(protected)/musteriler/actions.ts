"use server";

import { revalidatePath } from "next/cache";

import { requireFullAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/admin/types";

/**
 * Wipes the customers table. Appointment history is untouched — every
 * appointment already keeps its own denormalized customer_name/phone/
 * email/note (see 0005_appointments.sql), and 0011 changed the FK to
 * ON DELETE SET NULL for exactly this — so Randevular/Takvim still show
 * every past and future booking, just no longer linked to a customers row.
 *
 * Restricted to the owner role specifically, not any admin login — same
 * "owner controls who can delete" boundary as gorseller's
 * deleteGalleryImage(). Checked here, not just hidden in the UI.
 */
export async function clearAllCustomers(): Promise<ActionResult> {
  const { admin } = await requireFullAdmin();
  if (admin.role !== "owner") {
    return { ok: false, error: "Müşteri kayıtlarını yalnızca işletme sahibi silebilir." };
  }

  const supabase = createServiceClient();
  // Supabase's delete() refuses to run with no filter at all — this
  // always-true UUID comparison is the standard way to say "delete
  // everything" while still passing that guard.
  const { error } = await supabase.from("customers").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) return { ok: false, error: "Müşteri kayıtları silinemedi." };
  revalidatePath("/giris/musteriler");
  return { ok: true };
}

/**
 * Deletes a single customer record — same idea as clearAllCustomers() but
 * for one row instead of the whole table, so the owner can keep some
 * customers and remove specific ones instead of an all-or-nothing wipe.
 * Appointment history is untouched for the same reason as clearAllCustomers
 * (0011's ON DELETE SET NULL). Owner-only, checked here too.
 */
export async function deleteCustomer(id: string): Promise<ActionResult> {
  const { admin } = await requireFullAdmin();
  if (admin.role !== "owner") {
    return { ok: false, error: "Müşteri kayıtlarını yalnızca işletme sahibi silebilir." };
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);

  if (error) return { ok: false, error: "Müşteri silinemedi." };
  revalidatePath("/giris/musteriler");
  return { ok: true };
}
