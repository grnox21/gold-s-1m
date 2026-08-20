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
      // Default is 1MB — way too small for a phone-camera photo. Needs to
      // clear MAX_GALLERY_IMAGE_BYTES (lib/gallery-constants.ts) with room
      // to spare for multipart/FormData overhead on top of the raw file
      // bytes, or a large-but-still-valid photo gets killed by this
      // framework-level limit before validation ever gets a chance to
      // return a friendly error — it just fails outright.
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
