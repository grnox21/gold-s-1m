"use server";

import { revalidatePath } from "next/cache";

import { requireFullAdmin } from "@/lib/auth/admin";
import {
  uploadGalleryImage as uploadGalleryImageToStorage,
  deleteGalleryImage as deleteGalleryImageFromStorage,
  updateGalleryImagePlacements as updateGalleryImagePlacementsInStorage,
  type GalleryPlacements,
} from "@/lib/gallery-storage";
import type { ActionResult } from "@/lib/admin/types";

/** Every public page a gallery photo can appear on — revalidated together
 * so an upload/delete/placement change shows up immediately everywhere,
 * not just here. The homepage isn't in this list on purpose — its
 * "Çalışmalarımız" section doesn't read from here anymore, see
 * public/calismalarimiz/README.md. */
function revalidateGalleryConsumers() {
  revalidatePath("/giris/gorseller");
  revalidatePath("/galeri");
  revalidatePath("/hakkimizda");
}

function placementsFromFormData(formData: FormData): GalleryPlacements {
  return {
    showGallery: formData.get("showGallery") === "on",
    showAbout: formData.get("showAbout") === "on",
  };
}

export async function uploadGalleryImage(formData: FormData): Promise<ActionResult> {
  await requireFullAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Bir görsel seçin." };
  }

  const result = await uploadGalleryImageToStorage(file, placementsFromFormData(formData));
  if (!result.ok) return result;

  revalidateGalleryConsumers();
  return { ok: true };
}

export async function updateGalleryImagePlacements(id: string, placements: GalleryPlacements): Promise<ActionResult> {
  await requireFullAdmin();

  const result = await updateGalleryImagePlacementsInStorage(id, placements);
  if (!result.ok) return result;

  revalidateGalleryConsumers();
  return { ok: true };
}

/**
 * Deletion is restricted to the owner role specifically (not any admin
 * login) — the shop owner asked for explicit control over who can wipe
 * photos, separate from who can add them. Checked here, not just hidden
 * in the UI, since a non-owner admin could otherwise call this action
 * directly.
 */
export async function deleteGalleryImage(id: string): Promise<ActionResult> {
  const { admin } = await requireFullAdmin();
  if (admin.role !== "owner") {
    return { ok: false, error: "Görselleri yalnızca işletme sahibi silebilir." };
  }

  const result = await deleteGalleryImageFromStorage(id);
  if (!result.ok) return result;

  revalidateGalleryConsumers();
  return { ok: true };
}
