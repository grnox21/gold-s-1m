import { ImageResponse } from "next/og";
import { logoDataUri } from "@/lib/brand-assets";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GRADIENT_BG =
  "radial-gradient(60% 50% at 78% 25%, rgba(201,162,75,0.20), transparent 60%), linear-gradient(160deg, #131210 0%, #0e0d0b 60%, #0a0908 100%)";

/** Link-preview image for WhatsApp/Instagram/etc. Once the real badge
 * exists it already carries "YUSUF DEMİR ERKEK KUAFÖRÜ" in its own
 * lettering, so it's shown alone at a size that stays crisp at social
 * thumbnail scale — stacking the old typographic lockup underneath it
 * would just repeat the same words twice. Falls back to that typographic
 * version until public/brand/logo.png exists. */
export default function OpengraphImage() {
  const logo = logoDataUri("logo");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: GRADIENT_BG,
        }}
      >
        {logo ? (
          <img src={logo} width={480} height={480} alt="" style={{ objectFit: "contain" }} />
        ) : (
          <>
            <span
              style={{
                fontFamily: "serif",
                fontSize: 30,
                letterSpacing: "0.35em",
                color: "#c9a24b",
                textTransform: "uppercase",
                marginBottom: 28,
              }}
            >
              Erkek Kuaförü
            </span>
            <span
              style={{
                fontFamily: "serif",
                fontSize: 108,
                color: "#f7f4ec",
                letterSpacing: "-0.01em",
              }}
            >
              Yusuf Demir
            </span>
            <div style={{ display: "flex", width: 120, height: 2, background: "#c9a24b", marginTop: 44 }} />
          </>
        )}
      </div>
    ),
    { ...size }
  );
}
