import type { Metadata } from "next";

import { Hero } from "@/components/site/hero";
import { IntroSection } from "@/components/site/intro-section";
import { ServicesPreview } from "@/components/site/services-preview";
import { BarbersPreview } from "@/components/site/barbers-preview";
import { InteriorSection } from "@/components/site/interior-section";
import { WhyUs } from "@/components/site/why-us";
import { Testimonials } from "@/components/site/testimonials";
import { LocationSection } from "@/components/site/location-section";
import { FinalCta } from "@/components/site/final-cta";
import { getActiveBarbers, getActiveServices, getSiteSettings } from "@/lib/site-data";
import { listGalleryImages } from "@/lib/brand-assets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Yusuf Demir Erkek Kuaförü | Premium Erkek Kuaförü",
  description:
    "Yusuf Demir Erkek Kuaförü — saç kesimi, sakal tıraşı ve VIP bakım hizmetlerinde premium deneyim. Online randevu sistemiyle berberinizi ve saatinizi seçin.",
};

export default async function HomePage() {
  const [barbers, services, settings] = await Promise.all([
    getActiveBarbers(),
    getActiveServices(),
    getSiteSettings(),
  ]);
  const gallery = listGalleryImages();

  return (
    <>
      <Hero heroImage={gallery[0] ?? null} />
      <IntroSection />
      <ServicesPreview services={services} />
      <BarbersPreview barbers={barbers} />
      <InteriorSection images={gallery} />
      <WhyUs />
      <Testimonials googleMapsUrl={settings.google_maps_url} />
      <LocationSection settings={settings} />
      <FinalCta />
    </>
  );
}
