import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import type { GalleryImageRow } from "@/types/database";

/**
 * Shop interior photos, managed from /giris/gorseller (owner/admin only —
 * see that route's actions.ts for upload/delete/placement). Backed by a
 * public Supabase Storage bucket rather than public/gallery/*.jpg: a file
 * saved under public/ at request time does NOT persist on serverless
 * hosting (Vercel's filesystem is ephemeral/read-only in production,
 * wiped on every new deploy), so Storage is the only option that actually
 * survives — see supabase/migrations/0012_gallery_storage.sql for the
 * bucket + its public-read policy.
 *
 * The `gallery_images` table (0013) is the source of truth for which
 * photos exist and which public pages they appear on; Storage just holds
 * bytes. The app always writes/removes both together.
 */
const GALLERY_BUCKET = "gallery";

/** 8MB per photo — comfortably above a typical phone-camera JPEG, well
 * under the Server Action body limit set in next.config.ts (leaves room
 * for multipart/FormData overhead on top of the raw file bytes). */
export const MAX_GALLERY_IMAGE_BYTES = 8 * 1024 * 1024;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type GalleryPlacement = "home" | "gallery" | "about";

export interface GalleryPlacements {
  showHome: boolean;
  showGallery: boolean;
  showAbout: boolean;
}

export interface GalleryImage extends GalleryPlacements {
  id: string;
  path: string;
  /** Public, directly-fetchable URL for <Image src>. */
  url: string;
}

export function isAllowedGalleryImageType(mimeType: string): boolean {
  return ALLOWED_TYPES.has(mimeType);
}

function extensionFor(mimeType: string): string {
  return mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
}

/**
 * Uploads one validated image into the 'gallery' bucket under `folder/`
 * and returns its public URL. Shared by gallery photo uploads (folder
 * "" — object keys at the bucket root) and barber profile photo uploads
 * (folder "barbers", see berberler/actions.ts) — same bucket, same public-
 * read policy (0012_gallery_storage.sql), just a path prefix to keep the
 * two kinds of image apart in the Storage browser.
 */
export async function uploadImageToBucket(
  file: File,
  folder: string
): Promise<{ ok: true; path: string; url: string } | { ok: false; error: string }> {
  if (!isAllowedGalleryImageType(file.type)) {
    return { ok: false, error: "Yalnızca JPEG, PNG veya WebP görsel yükleyebilirsiniz." };
  }
  if (file.size > MAX_GALLERY_IMAGE_BYTES) {
    return { ok: false, error: "Görsel çok büyük — en fazla 8MB olabilir." };
  }

  const objectPath = folder ? `${folder}/${crypto.randomUUID()}.${extensionFor(file.type)}` : `${crypto.randomUUID()}.${extensionFor(file.type)}`;

  const supabase = createServiceClient();
  const { error } = await supabase.storage.from(GALLERY_BUCKET).upload(objectPath, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });
  if (error) return { ok: false, error: "Görsel yüklenemedi." };

  const {
    data: { publicUrl },
  } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(objectPath);
  return { ok: true, path: objectPath, url: publicUrl };
}

function toGalleryImage(row: GalleryImageRow, url: string): GalleryImage {
  return {
    id: row.id,
    path: row.storage_path,
    url,
    showHome: row.show_home,
    showGallery: row.show_gallery,
    showAbout: row.show_about,
  };
}

/** Full admin view — every uploaded photo and its current placements,
 * newest first (what an admin just uploaded should show up on top). */
export async function listGalleryImages(): Promise<GalleryImage[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("gallery_images")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as GalleryImageRow[]).map((row) => {
    const {
      data: { publicUrl },
    } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(row.storage_path);
    return toGalleryImage(row, publicUrl);
  });
}

const PLACEMENT_COLUMN: Record<GalleryPlacement, "show_home" | "show_gallery" | "show_about"> = {
  home: "show_home",
  gallery: "show_gallery",
  about: "show_about",
};

/** Public-page view — just the URLs for images placed on `placement`,
 * newest first. Used by the Home, Galeri, and Hakkımızda pages, each with
 * a different placement so an image can be scoped to only where it
 * belongs (e.g. a wide hero-style shot on Ana Sayfa without also
 * cluttering the Hakkımızda story photo slot). */
export async function listGalleryImageUrls(placement: GalleryPlacement): Promise<string[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("gallery_images")
    .select("storage_path")
    .eq(PLACEMENT_COLUMN[placement], true)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as Pick<GalleryImageRow, "storage_path">[]).map(
    (row) => supabase.storage.from(GALLERY_BUCKET).getPublicUrl(row.storage_path).data.publicUrl
  );
}

export async function uploadGalleryImage(
  file: File,
  placements: GalleryPlacements
): Promise<{ ok: true } | { ok: false; error: string }> {
  const uploaded = await uploadImageToBucket(file, "");
  if (!uploaded.ok) return uploaded;

  const supabase = createServiceClient();
  const { error: insertError } = await supabase.from("gallery_images").insert({
    storage_path: uploaded.path,
    show_home: placements.showHome,
    show_gallery: placements.showGallery,
    show_about: placements.showAbout,
  });
  if (insertError) {
    // Don't leave an orphaned file with no DB row (and no way for the
    // admin UI to see or delete it) if the insert failed.
    await supabase.storage.from(GALLERY_BUCKET).remove([uploaded.path]);
    return { ok: false, error: "Görsel kaydedilemedi." };
  }

  return { ok: true };
}

export async function deleteGalleryImage(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceClient();

  const { data: row } = await supabase.from("gallery_images").select("storage_path").eq("id", id).maybeSingle();
  if (!row) return { ok: false, error: "Görsel bulunamadı." };

  const { error: storageError } = await supabase.storage.from(GALLERY_BUCKET).remove([row.storage_path]);
  if (storageError) return { ok: false, error: "Görsel silinemedi." };

  await supabase.from("gallery_images").delete().eq("id", id);
  return { ok: true };
}

export async function updateGalleryImagePlacements(
  id: string,
  placements: GalleryPlacements
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("gallery_images")
    .update({ show_home: placements.showHome, show_gallery: placements.showGallery, show_about: placements.showAbout })
    .eq("id", id);

  if (error) return { ok: false, error: "Görünürlük güncellenemedi." };
  return { ok: true };
}
