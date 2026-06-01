import { ImageResponse } from "next/og";

export const runtime     = "edge";
export const alt         = "AgentForge — AI App Builder";
export const size        = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0f",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(139,92,246,0.15)",
            border: "1px solid rgba(139,92,246,0.3)",
            borderRadius: "999px",
            padding: "6px 16px",
            marginBottom: "32px",
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b5cf6" }} />
          <span style={{ color: "#a78bfa", fontSize: 14, fontWeight: 500 }}>
            Multi-agent AI app builder
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.1,
            marginBottom: "24px",
            letterSpacing: "-2px",
          }}
        >
          Build apps with
          <br />
          <span style={{ color: "#8b5cf6" }}>AI agents.</span>
        </div>

        {/* Subline */}
        <div style={{ fontSize: 24, color: "rgba(255,255,255,0.5)", maxWidth: 640 }}>
          Describe your app in plain English. 12 agents generate the codebase,
          preview it live, and deploy to Cloudflare.
        </div>

        {/* Branding */}
        <div
          style={{
            position: "absolute",
            bottom: 60,
            right: 80,
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>⚡</span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 20, fontWeight: 600 }}>
            AgentForge
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
