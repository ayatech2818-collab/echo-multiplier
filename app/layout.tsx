import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Echo-Multiplier",
  description: "Generate multiple documents by merging data with templates",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
