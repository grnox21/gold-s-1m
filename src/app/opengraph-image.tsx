import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
          background:
            "radial-gradient(60% 50% at 78% 25%, rgba(201,162,75,0.20), transparent 60%), linear-gradient(160deg, #131210 0%, #0e0d0b 60%, #0a0908 100%)",
        }}
      >
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
      </div>
    ),
    { ...size }
  );
}
