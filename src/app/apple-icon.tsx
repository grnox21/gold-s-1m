import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
      </div>
    ),
    { ...size }
  );
}
