import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://agentforge.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "AgentForge — AI App Builder",
    template: "%s — AgentForge",
  },
  description: "Build full-stack apps with orchestrated AI agents. Describe your app, generate the codebase, preview it live, and deploy to Cloudflare — in one workflow.",
  keywords: ["AI app builder", "multi-agent", "code generation", "Cloudflare", "Supabase", "Next.js"],
  authors: [{ name: "AgentForge" }],
  openGraph: {
    title: "AgentForge — AI App Builder",
    description: "Describe your app. 12 specialized agents generate the full codebase, ready to deploy.",
    type: "website",
    url: BASE_URL,
    siteName: "AgentForge",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AgentForge — AI-powered full-stack app builder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AgentForge — AI App Builder",
    description: "Describe your app. 12 agents generate the full codebase, ready to deploy.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
