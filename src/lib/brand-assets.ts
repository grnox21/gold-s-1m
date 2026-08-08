import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * The real Yusuf Demir logo and shop interior photos were shared in chat as
 * inline images, not as files this environment can write to disk — there is
 * no tool available here that extracts message-embedded image bytes onto
 * the filesystem. Rather than fabricate a lookalike of a real client's mark
 * (or fill the gallery with stock photography the brief explicitly rules
 * out), the site ships with a typographic wordmark lockup and an empty
 * gallery, and upgrades itself automatically the moment the real files are
 * dropped in — no code changes needed:
 *
 *   public/brand/logo.png      — transparent gold logo, for dark sections
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

export function hasLogoDarkImage(): boolean {
  return fileExists("brand/logo-dark.png");
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
