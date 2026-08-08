import { getActiveBarbers, getActiveServices, getSiteSettings } from "@/lib/site-data";
import { env } from "@/lib/env";

/** schema.org HairSalon (the closest official type to "barbershop") — lets
 * Google surface hours, phone, and price range directly in search results. */
export async function StructuredData() {
  const [settings, services, barbers] = await Promise.all([getSiteSettings(), getActiveServices(), getActiveBarbers()]);

  const prices = services.map((s) => s.price).filter((p) => p > 0);
  const priceRange = prices.length > 0 ? `₺${Math.min(...prices)}-₺${Math.max(...prices)}` : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: "Yusuf Demir Erkek Kuaförü",
    description: settings.meta_description,
    url: env.siteUrl,
    telephone: settings.phone,
    priceRange,
    address: settings.address
      ? {
          "@type": "PostalAddress",
          streetAddress: settings.address,
          addressCountry: "TR",
        }
      : undefined,
    employee: barbers.map((b) => ({
      "@type": "Person",
      name: b.name,
      jobTitle: b.specialty ?? "Berber",
    })),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Hizmetler",
      itemListElement: services.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.name },
        price: s.price,
        priceCurrency: "TRY",
      })),
    },
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}
