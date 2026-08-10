import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

/** Renders the real logo file if one has been dropped into public/brand,
 * otherwise a typographic lockup in the same brand voice — see
 * lib/brand-assets.ts for why. `src` is resolved once, server-side, by the
 * caller (Nav/Footer, via navLogoSrc()) so this component itself can stay
 * usable from both Server and Client Components. */
export function Logo({
  src,
  className,
  markClassName,
}: {
  src: string | null;
  className?: string;
  markClassName?: string;
}) {
  if (src) {
    // Name rendered as real text below the mark, not baked into the image —
    // the source crop is small (the monogram, for legibility at nav/footer
    // size; see navLogoSrc()), so text drawn into those pixels would be
    // mud. Actual HTML text stays crisp at any size instead.
    return (
      <Link
        href="/"
        className={cn("group flex shrink-0 flex-col items-start gap-1", className)}
        aria-label="Yusuf Demir Erkek Kuaförü — Ana Sayfa"
      >
        <Image src={src} alt="" width={160} height={160} className="h-9 w-auto object-contain sm:h-10" priority />
        <span className={cn("font-display text-xs tracking-[0.05em] text-warm-white sm:text-sm", markClassName)}>
          Yusuf <span className="text-gold">Demir</span>
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/"
      className={cn("group flex flex-col items-start leading-none", className)}
      aria-label="Yusuf Demir Erkek Kuaförü — Ana Sayfa"
    >
      <span className={cn("font-display text-xl tracking-[0.04em] text-warm-white sm:text-2xl", markClassName)}>
        Yusuf <span className="text-gold">Demir</span>
      </span>
      <span className="label-caps mt-1 text-[0.56rem] text-ash sm:text-[0.62rem]">Erkek Kuaförü</span>
    </Link>
  );
}
