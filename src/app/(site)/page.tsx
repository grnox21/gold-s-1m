import type { Metadata } from "next";

import { Hero } from "@/components/site/hero";
import { PopularCuts } from "@/components/site/popular-cuts";
import { ServicesPreview } from "@/components/site/services-preview";
import { BarbersPreview } from "@/components/site/barbers-preview";
import { InteriorSection } from "@/components/site/interior-section";
import { WhyUs } from "@/components/site/why-us";
import { Testimonials } from "@/components/site/testimonials";
import { LocationSection } from "@/components/site/location-section";
import { FinalCta } from "@/components/site/final-cta";
import { getActiveBarbers, getActiveServices, getSiteSettings } from "@/lib/site-data";
import { heroImageSrcs, listStaticWorkPhotos } from "@/lib/brand-assets";

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
  const [barbers, services, settings] = await Promise.all([
    getActiveBarbers(),
    getActiveServices(),
    getSiteSettings(),
  ]);

  return (
    <>
      <Hero images={heroImageSrcs()} />
      <PopularCuts services={services} />
      <BarbersPreview barbers={barbers} />
      <ServicesPreview services={services} />
      <InteriorSection images={listStaticWorkPhotos()} />
      <WhyUs />
      <Testimonials googleMapsUrl={settings.google_maps_url} />
      <LocationSection settings={settings} />
      <FinalCta />
    </>
  );
}
