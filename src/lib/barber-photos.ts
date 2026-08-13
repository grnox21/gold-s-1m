import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { uploadImageToBucket } from "@/lib/gallery-storage";
import type { BarberPhotoRow } from "@/types/database";

/**
 * A barber's own "works" gallery — the photos on their public profile page
 * (/berberler/[slug]), managed from /giris/berberler. Distinct from
 * barbers.photo_url, which is the single headshot on barber cards/the
 * berberler list — a barber can have any number of these, stored in the
 * same 'gallery' Storage bucket (0012_gallery_storage.sql) under a
 * barbers/ prefix, same as the headshot. See
 * supabase/migrations/0015_barber_photos.sql.
 */
const GALLERY_BUCKET = "gallery";

export interface BarberPhoto {
  id: string;
  barberId: string;
  url: string;
}

function toBarberPhoto(row: BarberPhotoRow, url: string): BarberPhoto {
  return { id: row.id, barberId: row.barber_id, url };
}

/** Public profile page view — just this barber's photo URLs, newest first. */
export async function listBarberPhotoUrls(barberId: string): Promise<string[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("barber_photos")
    .select("storage_path")
    .eq("barber_id", barberId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as Pick<BarberPhotoRow, "storage_path">[]).map(
    (row) => supabase.storage.from(GALLERY_BUCKET).getPublicUrl(row.storage_path).data.publicUrl
  );
}

/** Admin view — every barber's photos in one query, grouped by barber id,
 * newest first within each group. Used by /giris/berberler so the
 * "Çalışmalar" dialog on each row opens with data already in hand instead
 * of a per-row round trip. */
export async function listBarberPhotosGrouped(): Promise<Map<string, BarberPhoto[]>> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("barber_photos")
    .select("*")
    .order("created_at", { ascending: false });

  const grouped = new Map<string, BarberPhoto[]>();
  if (error || !data) return grouped;

  for (const row of data as BarberPhotoRow[]) {
    const {
      data: { publicUrl },
    } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(row.storage_path);
    const photo = toBarberPhoto(row, publicUrl);
    const list = grouped.get(photo.barberId);
    if (list) list.push(photo);
    else grouped.set(photo.barberId, [photo]);
  }
  return grouped;
}

export async function addBarberPhoto(
  barberId: string,
  file: File
): Promise<{ ok: true; photo: BarberPhoto } | { ok: false; error: string }> {
  const uploaded = await uploadImageToBucket(file, "barbers");
  if (!uploaded.ok) return uploaded;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("barber_photos")
    .insert({ barber_id: barberId, storage_path: uploaded.path })
    .select()
    .single();
  if (error || !data) {
    // Don't leave an orphaned file with no DB row (and no way for the
    // admin UI to see or delete it) if the insert failed.
    await supabase.storage.from(GALLERY_BUCKET).remove([uploaded.path]);
    return { ok: false, error: "Fotoğraf kaydedilemedi." };
  }
  return { ok: true, photo: toBarberPhoto(data as BarberPhotoRow, uploaded.url) };
}

export async function removeBarberPhoto(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceClient();

  const { data: row } = await supabase.from("barber_photos").select("storage_path").eq("id", id).maybeSingle();
  if (!row) return { ok: false, error: "Fotoğraf bulunamadı." };

  const { error: storageError } = await supabase.storage.from(GALLERY_BUCKET).remove([row.storage_path]);
  if (storageError) return { ok: false, error: "Fotoğraf silinemedi." };

  await supabase.from("barber_photos").delete().eq("id", id);
  return { ok: true };
}

/** Removes every Storage object for a barber's work photos. Call this
 * before deleting the barbers row itself (see deleteBarber in
 * berberler/actions.ts) — the barber_photos rows cascade-delete
 * automatically via the FK, but that would otherwise leave the bytes
 * behind in Storage with nothing left to reach them from. */
export async function removeAllBarberPhotos(barberId: string): Promise<void> {
  const supabase = createServiceClient();
  const { data } = await supabase.from("barber_photos").select("storage_path").eq("barber_id", barberId);
  if (data && data.length > 0) {
    await supabase.storage.from(GALLERY_BUCKET).remove(data.map((row) => row.storage_path));
  }
}
