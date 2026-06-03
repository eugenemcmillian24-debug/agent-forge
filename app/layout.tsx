import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/lib/toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AgentForge — AI App Builder",
  description:
    "Build full-stack apps with orchestrated AI agents. Describe, generate, preview, and deploy.",
  metadataBase: new URL("https://agentforge.eugenemcmillian24.workers.dev"),
  openGraph: {
    title:       "AgentForge — AI App Builder",
    description: "AI-powered full-stack app builder with multi-agent orchestration",
    type:        "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card:        "summary_large_image",
    title:       "AgentForge — AI App Builder",
    description: "AI-powered full-stack app builder with multi-agent orchestration",
    images:      ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
