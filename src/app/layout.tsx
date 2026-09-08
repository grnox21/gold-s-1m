import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SmoothScrollProvider } from "@/components/providers/smooth-scroll-provider";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://yusufdemirshop.com"
  ),
  title: {
    default: "Yusuf Demir Erkek Kuaförü | Premium Erkek Kuaförü",
    template: "%s | Yusuf Demir Erkek Kuaförü",
  },
  description:
    "Yusuf Demir Erkek Kuaförü — saç kesimi, sakal tıraşı ve VIP bakım hizmetlerinde premium deneyim. Online randevu sistemiyle berberinizi ve saatinizi seçin.",
  keywords: [
    "erkek kuaförü",
    "berber",
    "saç kesimi",
    "sakal tıraşı",
    "randevu",
    "Yusuf Demir",
  ],
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Yusuf Demir Erkek Kuaförü",
    title: "Yusuf Demir Erkek Kuaförü | Premium Erkek Kuaförü",
    description:
      "Saç kesimi, sakal tıraşı ve VIP bakım hizmetlerinde premium deneyim. Online randevunuzu şimdi oluşturun.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Yusuf Demir Erkek Kuaförü",
    description: "Premium erkek kuaförü — online randevu sistemi.",
  },
  // No `icons` entry here on purpose — app/icon.tsx and app/apple-icon.tsx
  // are auto-detected by Next and injected automatically; pointing this at
  // a static /icon.png that doesn't exist would silently 404.
  // Next renders this as <meta name="google-site-verification" content="…">
  // in <head> automatically — Google Search Console's ownership-proof tag
  // for yusufdemirshop.com. Safe to leave in place permanently even after
  // verification succeeds; Search Console re-checks it on renewals.
  verification: {
    google: "-JMjROVwnHOSuHSreWrf4hRZHfZ7YEwzhagK2edf_As",
  },
};

export const viewport: Viewport = {
  themeColor: "#0e0d0b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${cormorant.variable} ${manrope.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased">
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
        <Toaster />
      </body>
    </html>
  );
}
