import type { Metadata } from "next";
import "./globals.css";

const publicSiteUrl = "https://omaleima.fi";
const title = "OmaLeima";
const description =
  "Digital leima pass for Finnish student events, appro nights, QR checkpoints, rewards, and calm event-day operations.";

export const metadata: Metadata = {
  applicationName: title,
  authors: [{ name: "OmaLeima", url: publicSiteUrl }],
  creator: "OmaLeima",
  description,
  icons: {
    apple: "/apple-icon.png",
    icon: [
      {
        sizes: "any",
        type: "image/x-icon",
        url: "/favicon.ico",
      },
      {
        sizes: "512x512",
        type: "image/png",
        url: "/icon.png",
      },
    ],
    shortcut: "/favicon.ico",
  },
  keywords: [
    "OmaLeima",
    "leima",
    "appro",
    "haalarimerkki",
    "student events Finland",
    "student overalls",
    "QR stamp card",
  ],
  manifest: "/manifest.webmanifest",
  metadataBase: new URL(publicSiteUrl),
  openGraph: {
    description,
    emails: ["contact@omaleima.fi"],
    images: [
      {
        alt: "OmaLeima public landing hero",
        height: 941,
        url: "/images/public/scene-haalarit-hero.png",
        width: 1672,
      },
    ],
    locale: "fi_FI",
    siteName: title,
    title,
    type: "website",
    url: publicSiteUrl,
  },
  publisher: "OmaLeima",
  robots: {
    follow: true,
    googleBot: {
      follow: true,
      index: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
    index: true,
  },
  title: {
    default: "OmaLeima | Digital leima pass for Finnish student events",
    template: "%s | OmaLeima",
  },
  twitter: {
    card: "summary_large_image",
    description,
    images: ["/images/public/scene-haalarit-hero.png"],
    title,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fi">
      <body className="app-body" suppressHydrationWarning>{children}</body>
    </html>
  );
}
