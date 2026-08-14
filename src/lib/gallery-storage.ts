import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { MAX_GALLERY_IMAGE_BYTES, MAX_GALLERY_VIDEO_BYTES } from "@/lib/gallery-constants";
import type { GalleryImageRow } from "@/types/database";

export { MAX_GALLERY_IMAGE_BYTES, MAX_GALLERY_VIDEO_BYTES };

/**
 * Shop interior photos (and, for Galeri specifically, short video clips —
 * see media_type below), managed from /giris/gorseller (owner/admin only —
 * see that route's actions.ts for upload/delete/placement). Backed by a
 * public Supabase Storage bucket rather than public/gallery/*.jpg: a file
 * saved under public/ at request time does NOT persist on serverless
 * hosting (Vercel's filesystem is ephemeral/read-only in production,
 * wiped on every new deploy), so Storage is the only option that actually
 * survives — see supabase/migrations/0012_gallery_storage.sql for the
 * bucket + its public-read policy.
 *
 * The `gallery_images` table (0013, +media_type in 0016) is the source of
 * truth for which items exist, whether each is a photo or a video, and
 * which public pages they appear on; Storage just holds bytes. The app
 * always writes/removes both together.
 */
const GALLERY_BUCKET = "gallery";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

export type GalleryMediaType = "image" | "video";
export type GalleryPlacement = "gallery" | "about";

export interface GalleryPlacements {
  showGallery: boolean;
  showAbout: boolean;
}

export interface GalleryImage extends GalleryPlacements {
  id: string;
  path: string;
  mediaType: GalleryMediaType;
  /** Public, directly-fetchable URL for <Image src> (photos) or
   * <video src> (videos). */
  url: string;
}

export function isAllowedGalleryImageType(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.has(mimeType);
}

function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    case "video/quicktime":
      return "mov";
    default:
      return "jpg";
  }
}

/**
 * Uploads one validated image (or, with `allowVideo`, a short video) into
 * the 'gallery' bucket under `folder/` and returns its public URL. Shared
 * by Görseller gallery uploads (folder "" — object keys at the bucket
 * root, the only caller that ever passes `allowVideo: true`, since video
 * is Galeri-only), a barber's own work-photo uploads (folder "barbers",
 * see lib/barber-photos.ts), and barber headshot uploads (also "barbers",
 * see berberler/actions.ts) — same bucket, same public-read policy
 * (0012_gallery_storage.sql), just a path prefix to keep the different
 * kinds of upload apart in the Storage browser. The latter two never pass
 * `allowVideo`, so they stay photo-only regardless of what's added here.
 */
export async function uploadImageToBucket(
  file: File,
  folder: string,
  options: { allowVideo?: boolean } = {}
): Promise<{ ok: true; path: string; url: string; mediaType: GalleryMediaType } | { ok: false; error: string }> {
  const isVideo = Boolean(options.allowVideo) && ALLOWED_VIDEO_TYPES.has(file.type);
  const isImage = ALLOWED_IMAGE_TYPES.has(file.type);
  if (!isImage && !isVideo) {
    return {
      ok: false,
      error: options.allowVideo
        ? "Yalnızca JPEG, PNG, WebP görsel veya MP4, WebM, MOV video yükleyebilirsiniz."
        : "Yalnızca JPEG, PNG veya WebP görsel yükleyebilirsiniz.",
    };
  }

  const maxBytes = isVideo ? MAX_GALLERY_VIDEO_BYTES : MAX_GALLERY_IMAGE_BYTES;
  if (file.size > maxBytes) {
    return { ok: false, error: `Dosya çok büyük — en fazla ${Math.floor(maxBytes / (1024 * 1024))}MB olabilir.` };
  }

  const objectPath = folder ? `${folder}/${crypto.randomUUID()}.${extensionFor(file.type)}` : `${crypto.randomUUID()}.${extensionFor(file.type)}`;

  const supabase = createServiceClient();
  const { error } = await supabase.storage.from(GALLERY_BUCKET).upload(objectPath, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });
  if (error) return { ok: false, error: isVideo ? "Video yüklenemedi." : "Görsel yüklenemedi." };

  const {
    data: { publicUrl },
  } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(objectPath);
  return { ok: true, path: objectPath, url: publicUrl, mediaType: isVideo ? "video" : "image" };
}

function toGalleryImage(row: GalleryImageRow, url: string): GalleryImage {
  return {
    id: row.id,
    path: row.storage_path,
    mediaType: row.media_type,
    url,
    showGallery: row.show_gallery,
    showAbout: row.show_about,
  };
}

/** Full admin view — every uploaded photo/video and its current
 * placements, newest first (what an admin just uploaded should show up
 * on top). */
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

const PLACEMENT_COLUMN: Record<GalleryPlacement, "show_gallery" | "show_about"> = {
  gallery: "show_gallery",
  about: "show_about",
};

/** Public-page view — just the photo URLs placed on `placement`, newest
 * first. Used by Hakkımızda (and by anything else that only ever wants a
 * still image). Deliberately filtered to media_type='image': Hakkımızda
 * renders a single still photo, so a video row must never come back here
 * even if one somehow ended up flagged show_about (uploadGalleryImage
 * already refuses to set that flag for a video, this is the read-side
 * backstop). Galeri wants both photos and videos, so it uses
 * listGalleryMedia below instead. The homepage's "Çalışmalarımız" section
 * deliberately isn't part of either — see
 * lib/brand-assets.ts#listStaticWorkPhotos for why. */
export async function listGalleryImageUrls(placement: GalleryPlacement): Promise<string[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("gallery_images")
    .select("storage_path")
    .eq(PLACEMENT_COLUMN[placement], true)
    .eq("media_type", "image")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as Pick<GalleryImageRow, "storage_path">[]).map(
    (row) => supabase.storage.from(GALLERY_BUCKET).getPublicUrl(row.storage_path).data.publicUrl
  );
}

export interface GalleryMediaItem {
  url: string;
  mediaType: GalleryMediaType;
}

/** Public-page view for Galeri — photos and videos both, newest first,
 * each tagged with its type so the page knows whether to render an
 * <Image> or a <video>. Only ever called with placement "gallery" in
 * practice (Hakkımızda uses listGalleryImageUrls above instead, since it
 * never wants video), but takes `placement` for symmetry with that
 * function rather than hardcoding it. */
export async function listGalleryMedia(placement: GalleryPlacement): Promise<GalleryMediaItem[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("gallery_images")
    .select("storage_path, media_type")
    .eq(PLACEMENT_COLUMN[placement], true)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as Pick<GalleryImageRow, "storage_path" | "media_type">[]).map((row) => ({
    url: supabase.storage.from(GALLERY_BUCKET).getPublicUrl(row.storage_path).data.publicUrl,
    mediaType: row.media_type,
  }));
}

/**
 * Uploads a gallery item — a photo for either Galeri or Hakkımızda, or
 * (per the shop owner's request) a video for Galeri only. `allowVideo:
 * true` here is what actually turns this endpoint video-capable; nothing
 * else in the app passes it, so barber headshots/work photos stay
 * photo-only automatically.
 */
export async function uploadGalleryImage(
  file: File,
  placements: GalleryPlacements
): Promise<{ ok: true } | { ok: false; error: string }> {
  const uploaded = await uploadImageToBucket(file, "", { allowVideo: true });
  if (!uploaded.ok) return uploaded;

  // Video is Galeri-only, full stop — even if a stale client somehow sent
  // showAbout for a video file, don't honor it. Hakkımızda only ever
  // renders a single still photo.
  const showAbout = uploaded.mediaType === "video" ? false : placements.showAbout;

  const supabase = createServiceClient();
  const { error: insertError } = await supabase.from("gallery_images").insert({
    storage_path: uploaded.path,
    media_type: uploaded.mediaType,
    show_gallery: placements.showGallery,
    show_about: showAbout,
  });
  if (insertError) {
    // Don't leave an orphaned file with no DB row (and no way for the
    // admin UI to see or delete it) if the insert failed.
    await supabase.storage.from(GALLERY_BUCKET).remove([uploaded.path]);
    return { ok: false, error: uploaded.mediaType === "video" ? "Video kaydedilemedi." : "Görsel kaydedilemedi." };
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

/**
 * Updates which pages a gallery item appears on. `placements.showAbout`
 * is ignored for a video row — same Galeri-only rule as
 * uploadGalleryImage, enforced here too so an admin can't work around it
 * by toggling the checkbox after upload instead of at upload time.
 */
export async function updateGalleryImagePlacements(
  id: string,
  placements: GalleryPlacements
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceClient();

  const { data: row } = await supabase.from("gallery_images").select("media_type").eq("id", id).maybeSingle();
  const showAbout = row?.media_type === "video" ? false : placements.showAbout;

  const { error } = await supabase
    .from("gallery_images")
    .update({ show_gallery: placements.showGallery, show_about: showAbout })
    .eq("id", id);

  if (error) return { ok: false, error: "Görünürlük güncellenemedi." };
  return { ok: true };
}
