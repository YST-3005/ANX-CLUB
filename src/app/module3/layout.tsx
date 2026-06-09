"use client";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/modules/module3/components/AuthContext";
import { Toaster } from "react-hot-toast";
import NotificationBell from "@/modules/module3/components/NotificationBell";
import { ThemeProvider } from "@/modules/module3/components/ThemeProvider";
import { ThemeToggle } from "@/modules/module3/components/ThemeToggle";
import { SearchButton } from "@/modules/module3/components/SearchButton";
import CommandPalette from "@/modules/module3/components/CommandPalette";
import { ProfileDropdown } from "@/modules/module3/components/ProfileDropdown";
import Link from "next/link";
import AIAssistant from "@/modules/module3/components/AIAssistant";
import BackgroundOrbs from "@/modules/module3/components/BackgroundOrbs";
import "./globals.css";

const font = Plus_Jakarta_Sans({ subsets: ["latin"] });

// Metadata is disallowed in "use client" layouts in Next.js.


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className={font.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Toaster position="top-center" />
        <AuthProvider>
          <SearchButton />
          <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 1000, display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <ThemeToggle />
            <Link href="/module3/messages" style={{ textDecoration: 'none', fontSize: '1.25rem' }} title="Messages">💬</Link>
            <NotificationBell />
            <ProfileDropdown />
          </div>
          <CommandPalette />
          <BackgroundOrbs />
          <div className="animate-fade-in" style={{ paddingTop: '6rem' }}>
            {children}
          </div>
          <AIAssistant />
        </AuthProvider>
        </ThemeProvider>
      </div>
    </>
  );
}
