import { ImageResponse } from "next/og";

export const alt = "Sorted: one call, and it's sorted. A Vaani voice agent that rings local repairmen, bargains and calls you back.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
        background: "#f7f3ec", color: "#1a1f24", padding: "72px 80px", fontFamily: "serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "#1a1f24", color: "#d8a86b", display: "flex",
            alignItems: "center", justifyContent: "center", fontSize: 40, fontStyle: "italic" }}>S</div>
          <span style={{ fontStyle: "italic" }}>Sorted</span>
          <span style={{ fontSize: 24, color: "#6d675f", marginLeft: 6 }}>on Vaani</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 108, lineHeight: 1 }}>
          <span>One call,</span>
          <span>and it&apos;s <span style={{ color: "#8c6b45", fontStyle: "italic", marginLeft: 22 }}>sorted.</span></span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, color: "#6d675f" }}>
          <span>Sorted rings the repairmen, haggles, and calls you back.</span>
          <span style={{ color: "#1a1f24" }}>+91 80642 79097</span>
        </div>
      </div>
    ),
    size,
  );
}
