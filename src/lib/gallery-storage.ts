import "server-only";

import { createServiceClient } from "@/lib/supabase/service";

/**
 * Shop interior photos, managed from /giris/gorseller (owner/admin only —
 * see that route's actions.ts for upload/delete). Backed by a public
 * Supabase Storage bucket rather than public/gallery/*.jpg: a file saved
 * under public/ at request time does NOT persist on serverless hosting
 * (Vercel's filesystem is ephemeral/read-only in production, wiped on
 * every new deploy), so Storage is the only option that actually survives
 * — see supabase/migrations/0012_gallery_storage.sql for the bucket + its
 * public-read policy.
 */
const GALLERY_BUCKET = "gallery";

/** 8MB per photo — comfortably above a typical phone-camera JPEG, well
 * under the Server Action body limit set in next.config.ts (leaves room
 * for multipart/FormData overhead on top of the raw file bytes). */
export const MAX_GALLERY_IMAGE_BYTES = 8 * 1024 * 1024;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface GalleryImage {
  /** Storage object path — pass this back to deleteGalleryImage(). */
  path: string;
  /** Public, directly-fetchable URL for <Image src>. */
  url: string;
}

export function isAllowedGalleryImageType(mimeType: string): boolean {
  return ALLOWED_TYPES.has(mimeType);
}

/** Newest-first — admins expect what they just uploaded to show up on top,
 * and it's the more natural order for a "recently added" photo grid. */
export async function listGalleryImages(): Promise<GalleryImage[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(GALLERY_BUCKET)
    .list("", { sortBy: { column: "created_at", order: "desc" } });

  if (error || !data) return [];

  return data
    .filter((f) => f.name !== ".emptyFolderPlaceholder")
    .map((f) => {
      const {
        data: { publicUrl },
      } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(f.name);
      return { path: f.name, url: publicUrl };
    });
}

/** Just the public URLs, oldest-first-agnostic order not guaranteed — for
 * the public site pages (home/galeri/hakkimizda), which only care about
 * the images themselves, not their storage paths. */
export async function listGalleryImageUrls(): Promise<string[]> {
  const images = await listGalleryImages();
  return images.map((img) => img.url);
}

export async function uploadGalleryImage(
  file: File
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isAllowedGalleryImageType(file.type)) {
    return { ok: false, error: "Yalnızca JPEG, PNG veya WebP görsel yükleyebilirsiniz." };
  }
  if (file.size > MAX_GALLERY_IMAGE_BYTES) {
    return { ok: false, error: "Görsel çok büyük — en fazla 8MB olabilir." };
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const objectPath = `${crypto.randomUUID()}.${ext}`;

  const supabase = createServiceClient();
  const { error } = await supabase.storage.from(GALLERY_BUCKET).upload(objectPath, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });

  if (error) return { ok: false, error: "Görsel yüklenemedi." };
  return { ok: true };
}

export async function deleteGalleryImage(objectPath: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceClient();
  const { error } = await supabase.storage.from(GALLERY_BUCKET).remove([objectPath]);
  if (error) return { ok: false, error: "Görsel silinemedi." };
  return { ok: true };
}
