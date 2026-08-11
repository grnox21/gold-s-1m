"use server";

import { revalidatePath } from "next/cache";

import { requireFullAdmin } from "@/lib/auth/admin";
import { uploadGalleryImage as uploadGalleryImageToStorage, deleteGalleryImage as deleteGalleryImageFromStorage } from "@/lib/gallery-storage";
import type { ActionResult } from "@/lib/admin/types";

/** Every public page a gallery photo can appear on — revalidated together
 * so an upload/delete shows up immediately everywhere, not just here. */
function revalidateGalleryConsumers() {
  revalidatePath("/giris/gorseller");
  revalidatePath("/");
  revalidatePath("/galeri");
  revalidatePath("/hakkimizda");
}

export async function uploadGalleryImage(formData: FormData): Promise<ActionResult> {
  await requireFullAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Bir görsel seçin." };
  }

  const result = await uploadGalleryImageToStorage(file);
  if (!result.ok) return result;

  revalidateGalleryConsumers();
  return { ok: true };
}

export async function deleteGalleryImage(objectPath: string): Promise<ActionResult> {
  await requireFullAdmin();

  const result = await deleteGalleryImageFromStorage(objectPath);
  if (!result.ok) return result;

  revalidateGalleryConsumers();
  return { ok: true };
}
