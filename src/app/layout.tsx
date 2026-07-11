import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { themeInitializationScript } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "中国語 単語学習",
  description: "中国語の単語を暗記してテストできる学習アプリ",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: This static script applies the saved theme before the first paint. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
      </head>
      <body className="min-h-dvh flex flex-col bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
