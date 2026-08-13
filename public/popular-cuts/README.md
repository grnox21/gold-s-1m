Photos for the homepage's "Popüler Kesimler" section
(src/components/site/popular-cuts.tsx), matched by **position**, not by
filename lookup with a fallback — all three must exist:

- `hair.webp` — first card (assumed to be a haircut; whatever the shop's
  first active service in Hizmetler actually is)
- `beard.webp` — second card (assumed to be a beard trim/shave; the
  shop's second active service)
- `mask.webp` — third card, always "Cilt Bakım Maskesi" regardless of
  what the third active service is (see the comment in popular-cuts.tsx
  for why)

3:4 portrait crop, same as the barber photos on /berberler
(`aspect-[3/4]`) — a landscape photo will get cropped top/bottom by
`object-cover` to fit. One-time drop-in like `public/brand/logo.png` and
`public/hero/*.webp`, not admin-uploadable — see those READMEs for why
that pattern exists.
