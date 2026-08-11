import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Barber photo URLs are entered freely in the admin (Berberler ->
    // Fotoğraf URL) rather than uploaded to a fixed bucket, so the exact
    // host isn't known ahead of time — allow any HTTPS image host rather
    // than next/image rejecting admin-entered photos at render time. This
    // also covers the Supabase Storage public URLs the Görseller gallery
    // upload uses.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    serverActions: {
      // Default is 1MB — too small for a phone-camera photo. Matches
      // MAX_GALLERY_IMAGE_BYTES in lib/gallery-storage.ts plus headroom
      // for multipart/FormData overhead on top of the raw file bytes.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
