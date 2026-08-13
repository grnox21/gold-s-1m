Photos for the homepage's "Çalışmalarımız" section
(src/components/site/interior-section.tsx, rendered on `/` via
`listStaticWorkPhotos()` in `src/lib/brand-assets.ts`).

- Drop up to 3 images in here — any filenames, any of `.jpg`, `.jpeg`,
  `.png`, `.webp`. They're picked up automatically, sorted by filename,
  so prefix them (`01-...`, `02-...`, `03-...`) if the order matters.
- The first one shown gets the large 4:3 tile; the rest are square —
  same layout the section has always used.
- With none present, the section falls back to its "Fotoğraflar yakında
  eklenecek" placeholder instead of erroring.

This section used to be admin-managed from `/giris/gorseller` (an
"Ana Sayfa" placement checkbox, same mechanism as Galeri/Hakkımızda).
It was deliberately moved to this code-only drop-in instead — the shop
owner asked that nobody be able to change the homepage's work photos
except by editing files and deploying, unlike Galeri/Hakkımızda which
stay admin-uploadable via Supabase Storage
(see `src/lib/gallery-storage.ts`).

One-time drop-in like `public/brand/logo.png`, `public/hero/*.webp`,
and `public/popular-cuts/*.webp` — see those READMEs for why that
pattern exists.
