import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#07070a',
};

export const metadata: Metadata = {
  title: 'RummyAdda - Indian Rummy Gaming Platform',
  description: 'Real-time full-stack online Indian Rummy gaming platform with live 2-6 player tables, Points Rummy, Pool 101, server-authoritative game engine, secure wallet, tournaments, and luxury card table experience.',
  openGraph: {
    title: 'RummyAdda - Indian Rummy Gaming Platform',
    description: 'Real-time full-stack online Indian Rummy gaming platform with live 2-6 player tables, Points Rummy, Pool 101, server-authoritative game engine, secure wallet, tournaments, and luxury card table experience.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RummyAdda - Indian Rummy Gaming Platform',
    description: 'Real-time full-stack online Indian Rummy gaming platform with live 2-6 player tables, Points Rummy, Pool 101, server-authoritative game engine, secure wallet, tournaments, and luxury card table experience.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="dark"
      style={{ backgroundColor: '#07070a', color: '#f1f5f9' }}
    >
      <body
        className="bg-[#07070a] text-slate-100 antialiased min-h-screen selection:bg-amber-500 selection:text-black"
        style={{ backgroundColor: '#07070a', color: '#f1f5f9' }}
        suppressHydrationWarning
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
