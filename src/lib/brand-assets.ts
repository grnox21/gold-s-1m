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
 *   public/hero/desktop.webp   — homepage hero background, wide/landscape
 *                                 crop, shown at md breakpoint and above
 *   public/hero/mobile.webp    — same scene, tall/portrait crop, shown
 *                                 below md — art direction, not just a
 *                                 resize, so the subject stays framed
 *                                 well on a phone instead of getting
 *                                 cropped awkwardly by object-cover
 *   public/calismalarimiz/*    — homepage "Çalışmalarımız" section, up to
 *                                 3 images, any filenames — deliberately
 *                                 NOT admin-uploadable (see below)
 *
 * See public/brand/README.md. Shop interior photos for the Galeri page
 * and Hakkımızda work the same way in spirit but live in Supabase
 * Storage, not this folder — managed from /giris/gorseller, see
 * lib/gallery-storage.ts. The homepage's "Çalışmalarımız" section used to
 * be admin-managed the same way ("Ana Sayfa" placement) but was
 * deliberately moved to this code-only drop-in instead — nobody can
 * change what it shows except by editing files and deploying.
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

/** Nav/Footer render the logo at a fixed 48px height — enough to resolve
 * the "YD" monogram, not enough to keep the full lockup's "YUSUF DEMİR /
 * ERKEK KUAFÖRÜ" line legible (same problem the 16-32px favicon has, just
 * less extreme). Prefer the monogram there; fall back to the full lockup
 * only if that crop hasn't been added yet, then to the typographic mark. */
export function navLogoSrc(): string | null {
  if (hasLogoMarkImage()) return "/brand/logo-mark.png";
  if (hasLogoImage()) return "/brand/logo.png";
  return null;
}

export interface HeroImages {
  desktop: string | null;
  mobile: string | null;
}

/** Falls back to the textured gradient placeholder Hero already draws
 * when a variant is missing — desktop and mobile are independent, so
 * dropping in just one still works instead of an all-or-nothing pair. */
export function heroImageSrcs(): HeroImages {
  return {
    desktop: fileExists("hero/desktop.webp") ? "/hero/desktop.webp" : null,
    mobile: fileExists("hero/mobile.webp") ? "/hero/mobile.webp" : null,
  };
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

/** Homepage "Çalışmalarımız" section photos — a code-only drop-in, on
 * purpose (see the file-level comment above): drop up to a few images into
 * public/calismalarimiz/, any filenames, and they show up next deploy.
 * Sorted by filename so the order is predictable and controllable (e.g.
 * "01-...", "02-..."). Empty array (not an error) when the folder doesn't
 * exist yet — InteriorSection already has an empty state for that. */
export function listStaticWorkPhotos(): string[] {
  const dir = path.join(process.cwd(), "public", "calismalarimiz");
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
      .sort()
      .map((f) => `/calismalarimiz/${f}`);
  } catch {
    return [];
  }
}
