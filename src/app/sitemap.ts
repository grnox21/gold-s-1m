import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

const PUBLIC_ROUTES = ["", "/hizmetler", "/berberler", "/randevu", "/hakkimizda", "/galeri", "/iletisim"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.siteUrl;
  const now = new Date();

  return PUBLIC_ROUTES.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/randevu" ? 0.9 : 0.7,
  }));
}
