import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Playfair_Display } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import "./human-motion.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const hmInter = Inter({ variable: "--font-hm-inter", subsets: ["latin"], display: "swap" });
const hmPlayfair = Playfair_Display({ variable: "--font-hm-playfair", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "ClubKeep — Business & Personal",
  description: "ClubKeep Business and Personal — your club and progress in one account.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${hmInter.variable} ${hmPlayfair.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
