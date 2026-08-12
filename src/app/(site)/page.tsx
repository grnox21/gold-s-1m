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
import { listGalleryImageUrls } from "@/lib/gallery-storage";
import { heroImageSrcs } from "@/lib/brand-assets";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  // Pulls from Site Ayarları so an admin's edits actually show up in
  // search results / link previews, with the same copy as a fallback.
  const settings = await getSiteSettings();
  return {
    title: settings.meta_title,
    description: settings.meta_description,
    openGraph: { title: settings.meta_title, description: settings.meta_description },
  };
}

export default async function HomePage() {
  const [barbers, services, settings, gallery] = await Promise.all([
    getActiveBarbers(),
    getActiveServices(),
    getSiteSettings(),
    listGalleryImageUrls("home"),
  ]);

  return (
    <>
      <Hero images={heroImageSrcs()} />
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
