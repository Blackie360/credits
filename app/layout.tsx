import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GeistPixelSquare } from 'geist/font/pixel'
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: "Cursor Kenya — Redeem Your Code",
  description: "Cursor Kenya codes are redeemable. Redeem your access code.",
  icons: {
    icon: '/CUBE_2D_DARK.png',
  },
  openGraph: {
    title: "Cursor Kenya — Redeem Your Code",
    description: "Cursor Kenya codes are redeemable. Redeem your access code.",
    images: ['/CUBE_2D_DARK.png'],
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${GeistPixelSquare.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
