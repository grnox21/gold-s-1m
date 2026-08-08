Drop the real Yusuf Demir logo here as `logo.png` — a transparent PNG with
the black circular background removed, gold elements only, same
proportions as the original mark. The site's <Logo> component
(src/components/site/logo.tsx) picks it up automatically; until then it
renders a typographic "YUSUF DEMİR / ERKEK KUAFÖRÜ" wordmark lockup in the
brand's serif + gold so every page still looks finished.

Optional: `logo-dark.png` if a version for light/marble backgrounds is ever
needed (the current design keeps the gold logo on dark grounds only, so
this normally isn't required).

Also used to generate the favicon — see src/app/icon.tsx.
