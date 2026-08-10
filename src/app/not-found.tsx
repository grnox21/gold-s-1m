import Link from "next/link";

import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { navLogoSrc } from "@/lib/brand-assets";

/**
 * Root-level on purpose: a not-found.tsx nested inside a route group (like
 * the old (site)/not-found.tsx this replaced) only fires for a notFound()
 * call from *within* that group's own pages — a genuinely unmatched URL
 * outside any defined route needs the file at this level, or Next falls
 * back to its plain default 404. Caught this by actually requesting an
 * unmatched path and seeing the unstyled Next default instead of this page.
 */
export default function NotFound() {
  return (
    <>
      <Nav logoSrc={navLogoSrc()} />
      <main className="flex min-h-[80vh] flex-col items-center justify-center bg-ink px-6 text-center">
        <p className="label-caps text-[0.7rem] text-gold">404</p>
        <h1 className="mt-4 font-display text-4xl text-warm-white sm:text-5xl">Sayfa bulunamadı</h1>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-ash">
          Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/">Ana Sayfaya Dön</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/randevu">Randevu Al</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </>
  );
}
