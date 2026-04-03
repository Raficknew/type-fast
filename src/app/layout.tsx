import type { Metadata } from "next";
import { Figtree, Geist, Geist_Mono } from "next/font/google";
import { AnonymousAuth } from "@/features/users/components/AnonymousAuth";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import ThemeSwitcher from "@/components/ThemeSwitcher";
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
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans", figtree.variable)}
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased w-full h-screen flex items-center justify-center`}
      >
        <ThemeProvider attribute="class" defaultTheme="system">
          <ThemeSwitcher />
          <AnonymousAuth />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
