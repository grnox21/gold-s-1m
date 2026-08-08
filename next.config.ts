import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Barber photo URLs are entered freely in the admin (Berberler ->
    // Fotoğraf URL) rather than uploaded to a fixed bucket, so the exact
    // host isn't known ahead of time — allow any HTTPS image host rather
    // than next/image rejecting admin-entered photos at render time.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
