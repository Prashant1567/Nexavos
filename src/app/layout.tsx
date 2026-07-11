import type { Metadata } from "next";
import { Noto_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/shared/AppShell";

const notoSans = Noto_Sans({
  subsets: ["latin", "devanagari"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Waste dMRV - Verifiable Waste Collection Proof",
  description: "Digital Monitoring, Reporting, and Verification field operations tool for waste collection operators.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "dMRV",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#1B6B3A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(notoSans.variable, jetbrainsMono.variable)}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans bg-background text-foreground antialiased min-h-screen overflow-x-hidden">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
