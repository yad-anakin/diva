import "./globals.css";
import type { Metadata } from "next";
import { Noto_Sans_Arabic } from "next/font/google";

export const metadata: Metadata = {
  title: "Diva Salon",
  description: "Women salon system for services and printable receipts",
};

const arabicFont = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: [
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
  ],
  display: "swap",
  variable: "--font-arabic",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#e11d48" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${arabicFont.variable} min-h-screen font-display`} suppressHydrationWarning>
        {children}
        {/* Register service worker */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(()=>{});
            });
          }
        `}} />
      </body>
    </html>
  );
}
