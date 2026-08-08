import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { hasLogoImage } from "@/lib/brand-assets";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav hasLogoImage={hasLogoImage()} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
