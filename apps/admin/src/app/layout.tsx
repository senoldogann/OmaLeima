import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmaLeima Admin",
  description: "Admin and club organizer panel for OmaLeima operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="app-body">{children}</body>
    </html>
  );
}
