"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body
        style={{
          background: "#0e0d0b",
          color: "#f7f4ec",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <p style={{ color: "#c9a24b", letterSpacing: "0.16em", fontSize: "0.7rem", textTransform: "uppercase" }}>
          Yusuf Demir Erkek Kuaförü
        </p>
        <h1 style={{ marginTop: "16px", fontSize: "1.75rem" }}>Bir şeyler ters gitti</h1>
        <p style={{ marginTop: "12px", color: "#8c8577", maxWidth: "360px" }}>
          Sayfa yüklenirken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: "28px",
            background: "#c9a24b",
            color: "#0e0d0b",
            border: "none",
            padding: "12px 28px",
            fontSize: "0.72rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Tekrar Dene
        </button>
      </body>
    </html>
  );
}
