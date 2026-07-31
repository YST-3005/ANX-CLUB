import type { Metadata } from 'next';
import { Outfit, Playfair_Display } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { ConditionalShell } from '@/components/layout/ConditionalShell';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'A.N.X Platform',
    template: '%s | A.N.X Platform',
  },
  description:
    'A premium member ecosystem — events, mentors, community, and projects in one command center.',
  keywords: ['ANX', 'mentorship', 'events', 'community', 'platform', 'learning'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${outfit.variable} ${playfair.variable}`}>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          disableTransitionOnChange={false}
        >
          {/* Cyberpunk Ambient Background Mesh */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1] bg-[#0a0b10]">
            <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vh] rounded-full bg-violet-600/20 blur-[100px] transition-all duration-1000" />
            <div className="absolute top-[20%] -right-[10%] w-[40vw] h-[60vh] rounded-full bg-blue-600/15 blur-[120px] transition-all duration-1000" />
            <div className="absolute -bottom-[10%] left-[20%] w-[60vw] h-[50vh] rounded-full bg-fuchsia-600/15 blur-[100px] transition-all duration-1000" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10" />
          </div>
          
          <QueryProvider>
            <AuthProvider>
              <ConditionalShell>
                {children}
              </ConditionalShell>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: 'var(--color-surface)',
                    color: 'var(--color-fg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '0.75rem',
                    fontSize: '13px',
                    fontWeight: '500',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  },
                  success: {
                    iconTheme: { primary: 'var(--color-success)', secondary: 'white' },
                  },
                  error: {
                    iconTheme: { primary: 'var(--color-danger)', secondary: 'white' },
                  },
                }}
              />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
