The homepage hero background lives here as two crops of the same photo —
this is real art direction, not just a resize, so both files matter:

- `desktop.webp` — wide/landscape crop, shown at the `md` breakpoint
  (768px) and above.
- `mobile.webp` — tall/portrait crop of the same scene, shown below
  `md`, so the subject stays framed well on a phone instead of getting
  cut off by `object-cover` on a crop meant for a much wider screen.

Picked up automatically by `src/components/site/hero.tsx` via
`heroImageSrcs()` (src/lib/brand-assets.ts) — no code change needed to
swap the photo, just replace these two files. Either one can exist
without the other (the browser falls back to whichever is present via
`<picture>`'s default `<img>`); with neither, Hero draws the same
textured gold/dark gradient placeholder it always has.

This is a one-time drop-in like `public/brand/logo.png`, not something
that changes often enough to warrant its own admin upload UI the way
`/giris/gorseller` does for the Galeri/Hakkımızda/homepage-interior
photos (those live in Supabase Storage — see `lib/gallery-storage.ts`
and `public/gallery/README.md`).
