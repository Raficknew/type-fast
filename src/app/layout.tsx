import type { Metadata } from "next";
import { Figtree, Geist, Geist_Mono, Outfit } from "next/font/google";
import { AnonymousAuth } from "@/components/AnonymousAuth";
import "./globals.css";
import { cn } from "@/lib/utils";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TypeFast",
  description: "A real-time multiplayer typing speed game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", figtree.variable)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased w-full h-screen flex items-center justify-center`}
      >
        <AnonymousAuth />
        {children}
      </body>
    </html>
  );
}
