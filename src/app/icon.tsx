import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Generated favicon — a gold "YD" monogram on the brand's ink ground,
 * standing in for the real logo mark until the actual asset can be added
 * (see public/brand/README.md). Kept in the same visual language: dark
 * ground, restrained gold, serif-adjacent letterforms. */
export default function Icon() {
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
      </div>
    ),
    { ...size }
  );
}
