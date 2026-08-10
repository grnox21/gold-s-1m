import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * The site ships with a typographic wordmark lockup as a safe default and
 * upgrades itself automatically the moment the real brand files are
 * dropped in — no code changes needed:
 *
 *   public/brand/logo.png      — full circular badge, transparent gold,
 *                                 for dark sections (Nav, Footer, apple
 *                                 touch icon, Open Graph image)
 *   public/brand/logo-mark.png — tight crop of just the "YD" monogram,
 *                                 no ring/crown/tools text — the only
 *                                 thing that stays legible at 16-32px, so
 *                                 this is what the browser-tab favicon uses
 *   public/brand/logo-dark.png — optional, only if a light-ground variant
 *                                 is ever needed
 *   public/gallery/*.jpg|png   — shop interior photos, any filenames
 *
 * See public/brand/README.md and public/gallery/README.md.
 */

function fileExists(relPath: string): boolean {
  try {
    return fs.existsSync(path.join(process.cwd(), "public", relPath));
  } catch {
    return false;
  }
}

export function hasLogoImage(): boolean {
  return fileExists("brand/logo.png");
}

export function hasLogoMarkImage(): boolean {
  return fileExists("brand/logo-mark.png");
}

export function hasLogoDarkImage(): boolean {
  return fileExists("brand/logo-dark.png");
}

/** Reads a public/ asset and returns it as a `data:` URI, or null if it
 * doesn't exist yet. Satori (what next/og's ImageResponse renders with)
 * can't fetch relative `/brand/...` URLs, so the icon/apple-icon/opengraph
 * routes need the bytes inlined like this instead of a plain <img src>. */
export function logoDataUri(variant: "logo" | "logo-mark" = "logo"): string | null {
  const relPath = `brand/${variant}.png`;
  if (!fileExists(relPath)) return null;
  const bytes = fs.readFileSync(path.join(process.cwd(), "public", relPath));
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

export function listGalleryImages(): string[] {
  const dir = path.join(process.cwd(), "public", "gallery");
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
      .sort()
      .map((f) => `/gallery/${f}`);
  } catch {
    return [];
  }
}
