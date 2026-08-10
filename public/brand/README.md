The real Yusuf Demir logo lives here as two files:

- `logo.png` — the full circular badge (crown, scissors, razor, "YUSUF
  DEMİR / ERKEK KUAFÖRÜ" ring), transparent gold on the brand's gold
  (`#c9a24b`). Used by the site's `<Logo>` component
  (src/components/site/logo.tsx) in the Nav and Footer, by the Apple
  touch icon, and by the Open Graph share image.
- `logo-mark.png` — a tight crop of just the "YD" monogram, no ring or
  text. The full badge turns into an illegible smudge at browser-tab
  favicon sizes (16-32px); the monogram alone still reads. Used by the
  favicon (src/app/icon.tsx).

Until either file exists, the site falls back automatically: a
typographic "YUSUF DEMİR / ERKEK KUAFÖRÜ" wordmark lockup for the Nav/
Footer, and a generated gold "YD" for the favicon/Apple icon/OG image —
same visual language, so every page still looks finished either way.

Optional: `logo-dark.png` if a version for light/marble backgrounds is
ever needed (the current design keeps the gold logo on dark grounds only,
so this normally isn't required).
