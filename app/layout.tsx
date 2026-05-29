import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AgentForge — AI App Builder",
  description: "Build full-stack apps with orchestrated AI agents. Describe, generate, preview, and deploy.",
  openGraph: {
    title: "AgentForge",
    description: "AI-powered full-stack app builder with multi-agent orchestration",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
