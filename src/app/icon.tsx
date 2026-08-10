import { ImageResponse } from "next/og";
import { logoDataUri } from "@/lib/brand-assets";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Favicon. Uses the real "YD" monogram crop (public/brand/logo-mark.png)
 * once it exists — the full circular badge turns into an illegible smudge
 * at 16-32px, the monogram alone still reads. Falls back to a generated
 * text "YD" in the same visual language (dark ground, restrained gold)
 * until that file is added — see public/brand/README.md. */
export default function Icon() {
  const mark = logoDataUri("logo-mark");

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
          borderRadius: 6,
        }}
      >
        {mark ? (
          <img src={mark} width={26} height={26} alt="" style={{ objectFit: "contain" }} />
        ) : (
          <span
            style={{
              fontFamily: "serif",
              fontSize: 19,
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
