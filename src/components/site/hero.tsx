"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { Button } from "@/components/ui/button";
import type { HeroImages } from "@/lib/brand-assets";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function Hero({ images }: { images: HeroImages }) {
  const { desktop, mobile } = images;
  const fallbackSrc = desktop ?? mobile;
  const rootRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !rootRef.current) return;

    const ctx = gsap.context(() => {
      const targets = rootRef.current!.querySelectorAll("[data-hero-reveal]");
      gsap.set(targets, { opacity: 0, y: 24 });
      gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: 1.1,
        ease: "power3.out",
        stagger: 0.12,
        delay: 0.15,
      });

      // Subtle parallax: the background drifts slower than the page scrolls
      // past it, scaled up slightly so the drift never exposes an edge —
      // this is what makes a hero feel like it has depth instead of being
      // one flat photo sliding under fixed text.
      if (bgRef.current) {
        gsap.set(bgRef.current, { scale: 1.12 });
        gsap.to(bgRef.current, {
          yPercent: 12,
          ease: "none",
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      }
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="relative flex min-h-[92vh] items-end overflow-hidden bg-ink">
      {/* Background: the real hero photo once available, otherwise a
          textured stand-in evoking the same materials (marble, warm gold
          rim-light on dark walls) described in the shop reference photo.
          <picture> (not next/image) is deliberate here — desktop.webp and
          mobile.webp are two different crops of the same scene, not two
          resolutions of the same crop, so this needs real art direction:
          the browser fetches only the variant that matches, not both. */}
      <div ref={bgRef} className="absolute inset-0">
        {fallbackSrc ? (
          <picture>
            {mobile && <source media="(max-width: 767px)" srcSet={mobile} />}
            {desktop && <source media="(min-width: 768px)" srcSet={desktop} />}
            <img src={fallbackSrc} alt="Yusuf Demir Erkek Kuaförü" className="absolute inset-0 size-full object-cover" />
          </picture>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 50% at 78% 30%, rgba(201,162,75,0.16), transparent 60%), radial-gradient(45% 40% at 15% 85%, rgba(201,162,75,0.08), transparent 65%), linear-gradient(160deg, #131210 0%, #0e0d0b 55%, #0a0908 100%)",
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/20" />
        <div className="absolute inset-0 bg-ink/25" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-20 pt-40 sm:pb-28 lg:px-12 lg:pb-32">
        <p data-hero-reveal className="label-caps mb-6 text-[0.72rem] text-gold">
          Yusuf Demir · Erkek Kuaförü
        </p>
        <h1
          data-hero-reveal
          className="max-w-3xl font-display text-[2.75rem] leading-[1.05] text-warm-white sm:text-6xl lg:text-7xl"
        >
          Bakımlı bir görünüm, <em className="text-gold not-italic font-medium">iyi bir günün</em> başlangıcıdır.
        </h1>
        <p data-hero-reveal className="mt-7 max-w-lg text-base leading-relaxed text-warm-white/75 sm:text-lg">
          Yusuf Demir Erkek Kuaförü&apos;nde her kesim size özel.
        </p>
        <div data-hero-reveal className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button asChild size="lg">
            <Link href="/randevu">Randevu Al</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/hizmetler">Hizmetleri Keşfet</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
