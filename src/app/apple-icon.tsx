import { ImageResponse } from "next/og";
import { logoDataUri } from "@/lib/brand-assets";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS home-screen icon. 180px is enough resolution for the full circular
 * badge (crown, scissors, razor, the whole "YUSUF DEMİR ERKEK KUAFÖRÜ"
 * ring) to stay legible, unlike the 32px favicon — see icon.tsx. Falls
 * back to the generated "YD" text until public/brand/logo.png exists. */
export default function AppleIcon() {
  const logo = logoDataUri("logo");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0e0d0b",
        }}
      >
        {logo ? (
          <img src={logo} width={164} height={164} alt="" style={{ objectFit: "contain" }} />
        ) : (
          <span
            style={{
              fontFamily: "serif",
              fontSize: 96,
              fontWeight: 600,
              color: "#c9a24b",
              letterSpacing: "-0.02em",
            }}
          >
            YD
          </span>
        )}
      </div>
    ),
    { ...size }
  );
}
