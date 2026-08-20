/**
 * Deliberately has no "server-only" guard, unlike lib/gallery-storage.ts —
 * this needs to be importable from Client Components too (upload forms
 * fail fast on an oversized file client-side, before even attempting a
 * round trip the Server Action body limit would kill anyway).
 */

/** 15MB per photo — modern phone cameras routinely produce 8-15MB JPEGs
 * at full resolution. Keep this under the Server Action body limit in
 * next.config.ts, with headroom left over for multipart/FormData
 * overhead on top of the raw file bytes. */
export const MAX_GALLERY_IMAGE_BYTES = 15 * 1024 * 1024;
